// ─────────────────────────────────────────────────────────────────────────────
// evals/run.mjs
//
// Behaviour tests against a running assistant. Unit tests check the code;
// evals check what the MODEL actually does with your rules: does it decline
// off-topic requests, resist prompt injection, protect your privacy, stay
// in the first person and emit the right tags?
//
//   npm run dev        (in one terminal)
//   npm run evals      (in another)
//
// Point it at your live site with EVAL_URL=https://your-site/api/chat.
// Each case costs one short API call. Re-run after every change to the
// rules or the profile: a rule that passes today can break after an edit.
// ─────────────────────────────────────────────────────────────────────────────

import { readFile } from "node:fs/promises";
import { ASSISTANT } from "../config/assistant.js";

try { process.loadEnvFile?.(".env"); } catch { /* optional */ }
const URL = process.env.EVAL_URL || "http://localhost:3000/api/chat";
const cases = JSON.parse(await readFile(new globalThis.URL("./cases.json", import.meta.url)));

// The decline sentence, with tags and whitespace normalised.
const norm = (s) => s.replace(/\[\[[^\]]*\]\]/g, "").replace(/\s+/g, " ").trim();
const DECLINE = norm(ASSISTANT.declineSentence);

function check(reply, expect) {
  const fails = [];
  const text = norm(reply);
  if (expect.decline && text !== DECLINE) fails.push("expected the exact decline sentence");
  if (expect.contains && !reply.includes(expect.contains)) fails.push(`expected "${expect.contains}"`);
  if (expect.match && !new RegExp(expect.match, "i").test(text)) fails.push(`expected to match /${expect.match}/`);
  if (expect.notMatch && new RegExp(expect.notMatch, "i").test(text)) fails.push(`must not match /${expect.notMatch}/`);
  return fails;
}

let passed = 0;
for (const c of cases) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: c.ask }] }),
  });
  const reply = await res.text();
  const fails = res.ok ? check(reply, c.expect) : [`HTTP ${res.status}`];
  if (fails.length) {
    console.log(`✗ ${c.id}  (${c.why})\n    asked: ${c.ask}\n    got:   ${norm(reply).slice(0, 160)}\n    why:   ${fails.join("; ")}`);
  } else {
    passed++;
    console.log(`✓ ${c.id}`);
  }
}
console.log(`\n${passed}/${cases.length} passed`);
process.exitCode = passed === cases.length ? 0 : 1;
