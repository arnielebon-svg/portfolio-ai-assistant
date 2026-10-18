// Sanity checks on the generated system prompt (lib/prompt.js). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt } from "../lib/prompt.js";
import { ASSISTANT } from "../config/assistant.js";
import { PROFILE, PROJECTS } from "../config/profile.js";

const prompt = buildSystemPrompt(ASSISTANT, PROFILE, PROJECTS);

test("contains the exact decline sentence", () => {
  assert.ok(prompt.includes(ASSISTANT.declineSentence));
});

test("puts the data last, fenced in tags", () => {
  assert.ok(prompt.trimEnd().endsWith("</profile>"));
  assert.ok(prompt.indexOf("<projects>") > prompt.indexOf("SECURITY"));
});

test("has no unfilled template values", () => {
  assert.ok(!/undefined|null|\$\{/.test(prompt));
});

test("is identical on every build, so prompt caching can reuse it", () => {
  assert.equal(prompt, buildSystemPrompt(ASSISTANT, PROFILE, PROJECTS));
});

test("leaves out contact channels you haven't configured", () => {
  const p = buildSystemPrompt({ ...ASSISTANT, contact: { email: "", linkedin: "" } }, PROFILE, PROJECTS);
  assert.ok(p.includes("The only contact details you may share are none."));
  assert.ok(!p.includes("LinkedIn"));
});
