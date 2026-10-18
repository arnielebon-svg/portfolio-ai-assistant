// ─────────────────────────────────────────────────────────────────────────────
// api/chat.js
//
// The whole backend: one serverless function that answers visitors' questions.
//
//   browser ──POST {messages}──▶ /api/chat ──▶ Anthropic API (streaming)
//   browser ◀──── plain text, streamed as it is written ◀────┘
//
// Runs on Vercel as a Node.js function (any platform that speaks the standard
// Request/Response API works too; see dev-server.mjs for a plain Node example).
//
// Requires ANTHROPIC_API_KEY in the environment. The SDK reads it automatically.
// The key never reaches the browser: the browser only ever talks to this file.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { ASSISTANT, MODEL, LIMITS } from "../config/assistant.js";
import { PROFILE, PROJECTS } from "../config/profile.js";
import { buildSystemPrompt } from "../lib/prompt.js";
import { sanitizeMessages } from "../lib/messages.js";
import { mockReply, mockStream } from "../lib/mock.js";

// Built once per cold start, then reused. Because the text never changes between
// requests, prompt caching can serve it from cache (see cache_control below).
const SYSTEM = buildSystemPrompt(ASSISTANT, PROFILE, PROJECTS);

// Mock mode: try everything locally without a key (ASSISTANT_MOCK=1).
const MOCK = process.env.ASSISTANT_MOCK === "1";

// Created lazily so the module still loads in mock mode with no key set.
let client;
const getClient = () => (client ??= new Anthropic());

// Friendly, in-character messages for when things go wrong. A visitor should
// never see a stack trace or a broken chat bubble.
const MSG = {
  refusal: "\n\nI can't help with that one. Feel free to ask about my work, or send me a message through the contact form.",
  busy: "I'm getting a lot of questions right now. Please try again in a minute.",
  error: "Sorry, something went wrong on my side. Please try again, or send me a message through the contact form.",
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function POST(request) {
  // ── 1. Read and clean the input ────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const clean = sanitizeMessages(body, LIMITS);
  if (!clean.ok) return json(400, { error: clean.error });
  const { messages } = clean;

  // ── 2. Stream the answer back as plain text ────────────────────────────────
  // Plain text (not JSON, not server-sent events) keeps the browser side tiny:
  // read the stream, append the text. Tags like [[email]] ride along in the text.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (text) => controller.enqueue(encoder.encode(text));
      try {
        if (MOCK) {
          for await (const chunk of mockStream(mockReply(messages.at(-1).content, ASSISTANT))) write(chunk);
          return;
        }

        const response = getClient().messages.stream({
          model: MODEL.id,
          max_tokens: MODEL.maxTokens,
          output_config: { effort: MODEL.effort },
          // cache_control marks the system prompt as cacheable. Repeat visitors in the
          // cache window pay a fraction of the normal input price for it. Very short
          // prompts fall below the model's minimum cacheable length and are simply
          // not cached; nothing breaks.
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages,
        });

        // Forward only the text as it arrives. Thinking blocks and other events are skipped.
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            write(event.delta.text);
          }
        }

        // The model can decline a request at the safety level (stop_reason "refusal").
        // Close the answer politely instead of leaving it cut off.
        const final = await response.finalMessage();
        if (final.stop_reason === "refusal") write(MSG.refusal);
      } catch (err) {
        // Log the details for you (Vercel logs), show the visitor something human.
        if (err instanceof Anthropic.RateLimitError) {
          write(MSG.busy);
        } else {
          console.error("Chat error", err?.status ?? "", err?.message ?? err);
          write(MSG.error);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Answers are personal to the conversation: never cache them anywhere.
      "cache-control": "no-store",
    },
  });
}
