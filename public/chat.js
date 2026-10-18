// ─────────────────────────────────────────────────────────────────────────────
// public/chat.js
//
// The chat widget: sends the conversation to /api/chat, streams the answer in,
// and turns the model's tags into cards, buttons and follow-up questions.
//
// Plain JavaScript, no framework, no build step, no third-party scripts.
// That keeps the Content Security Policy strict (see vercel.json) and the
// widget easy to drop into any site.
// ─────────────────────────────────────────────────────────────────────────────

import { parseReply, textOnly } from "./tags.js";

// ── Settings you will want to change ─────────────────────────────────────────
const CONFIG = {
  // Starter questions shown in an empty chat. Pick the ones recruiters really ask.
  suggestions: [
    "What do you do, in one minute?",
    "How did you build the meal planner app?",
    "What would you bring to my team?",
    "Are you available, and how can I reach you?",
  ],
  // Where the [[resume]] button points. Put your PDF in public/.
  resumeUrl: "/resume.pdf",
  // Where the [[email]] button points: your contact form, or a mailto: link.
  contactUrl: "mailto:hello@example.com",
  // Cards for [[project:slug]]. Slugs must match PROJECTS in config/profile.js.
  projects: {
    "meal-planner": { title: "Meal planner app", note: "Side project, built with AI agents", href: "#meal-planner" },
    "claims-ai": { title: "Claims triage AI", note: "Pilot to production", href: "#claims-ai" },
    "data-platform": { title: "Enterprise data platform", note: "One view of sales", href: "#data-platform" },
  },
  // Abuse guard: questions per browser session. Pair it with a server-side rate
  // limit (docs/SECURITY.md); this one only stops casual over-use.
  sessionMax: 20,
};

// ── Small helpers ────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
// Everything the model writes is escaped before it touches the page. The model's
// output is untrusted text, never HTML.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Bare links and emails in an answer become clickable (after escaping).
const linkify = (s) =>
  esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, (m, url, mail) =>
    url ? `<a href="${url}" target="_blank" rel="noopener">${url}</a>` : `<a href="mailto:${mail}">${mail}</a>`,
  );

// sessionStorage, not localStorage: the chat survives a reload but disappears
// when the tab closes. Every access is wrapped because private modes can throw.
const store = {
  get: (k, d) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ── State ────────────────────────────────────────────────────────────────────
const log = $("chatLog"), form = $("chatForm"), input = $("chatInput"), send = $("chatSend");
let history = store.get("chat-history", []); // [{role, content, err?}]
let busy = false;
let controller = null; // lets "New conversation" cancel an answer mid-stream

// ── Rendering ────────────────────────────────────────────────────────────────
const askButton = (q) => `<li><button type="button" data-q="${esc(q)}">↳ ${esc(q)}</button></li>`;

/** Turns one finished bot reply into HTML: text, then cards, buttons and follow-ups. */
function botHtml(content, isLatest) {
  const r = parseReply(content, Object.keys(CONFIG.projects));
  const cards = r.slugs
    .map((s) => CONFIG.projects[s])
    .map((p) => `<a class="card" href="${esc(p.href)}"><b>${esc(p.title)}</b><span>${esc(p.note)}</span></a>`)
    .join("");
  const acts =
    (r.email ? `<a class="act" href="${esc(CONFIG.contactUrl)}">Get in touch</a>` : "") +
    (r.resume ? `<a class="act" href="${esc(CONFIG.resumeUrl)}" download>Download resume</a>` : "");
  // Follow-ups only under the latest answer, so old ones don't clutter the log.
  const follow = isLatest && r.asks.length ? `<ul class="follow">${r.asks.map(askButton).join("")}</ul>` : "";
  return (
    `<p>${linkify(r.text)}</p>` +
    (cards ? `<div class="cards">${cards}</div>` : "") +
    (acts ? `<div class="acts">${acts}</div>` : "") +
    follow
  );
}

function render() {
  if (!history.length) {
    log.innerHTML = `<div class="empty"><p>What would you like to know?</p><ul class="follow">${CONFIG.suggestions.map(askButton).join("")}</ul></div>`;
    return;
  }
  log.innerHTML = history
    .map((m, i) =>
      m.role === "user"
        ? `<div class="msg user">${esc(m.content)}</div>`
        : `<div class="msg bot${m.err ? " err" : ""}">${botHtml(m.content, i === history.length - 1)}</div>`,
    )
    .join("");
  log.scrollTop = log.scrollHeight;
}

// ── Asking a question ────────────────────────────────────────────────────────
async function ask(text) {
  text = text.trim();
  if (!text || busy) return;

  const asked = store.get("chat-count", 0);
  if (asked >= CONFIG.sessionMax) {
    history.push({ role: "user", content: text }, { role: "assistant", err: true, content: "That's the end of this chat session. I'd be glad to keep talking directly.\n[[email]]" });
    store.set("chat-history", history);
    return render();
  }
  store.set("chat-count", asked + 1);

  busy = true;
  send.disabled = true;
  input.value = "";
  history.push({ role: "user", content: text });
  const reply = { role: "assistant", content: "" };
  history.push(reply);
  render();
  const bubble = log.lastElementChild;
  bubble.classList.add("pending");

  controller = new AbortController();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Send only clean turns: not the empty pending reply, not failed exchanges.
      body: JSON.stringify({
        messages: history
          .filter((m, i) => m !== reply && !m.err && !history[i + 1]?.err)
          .map(({ role, content }) => ({ role, content })),
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(res.status === 429 || res.status === 403 ? "limited" : "failed");

    // Read the stream and show the text as it arrives. Tags stay hidden while
    // streaming (textOnly), then render all at once when the answer is complete.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      reply.content += decoder.decode(value, { stream: true });
      bubble.innerHTML = `<p>${linkify(textOnly(reply.content))}</p>`;
      log.scrollTop = log.scrollHeight;
    }
    if (!reply.content.trim()) throw new Error("failed");
    bubble.innerHTML = botHtml(reply.content, true);
  } catch (e) {
    if (e.name === "AbortError") return;
    reply.err = true;
    reply.content =
      (e.message === "limited"
        ? "You've asked a lot of questions in a short time. Please try again in a little while."
        : "Sorry, I couldn't answer that just now. Please try again.") + "\n[[email]]";
    bubble.classList.add("err");
    bubble.innerHTML = botHtml(reply.content, false);
  } finally {
    bubble.classList.remove("pending");
    busy = false;
    controller = null;
    send.disabled = !input.value.trim();
    store.set("chat-history", history);
    log.scrollTop = log.scrollHeight;
  }
}

// ── Wiring ───────────────────────────────────────────────────────────────────
form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
input.addEventListener("input", () => { send.disabled = busy || !input.value.trim(); });
log.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-q]");
  if (b) ask(b.dataset.q);
});
$("chatReset").addEventListener("click", () => {
  controller?.abort();
  busy = false;
  history = [];
  store.set("chat-history", history);
  render();
  input.focus();
});

render();
