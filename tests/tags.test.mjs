// Unit tests for the tag protocol (public/tags.js). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReply, textOnly } from "../public/tags.js";

const SLUGS = ["meal-planner", "claims-ai", "data-platform"];

test("pulls every tag out and keeps the text clean", () => {
  const r = parseReply("I built it with agents.\n[[project:meal-planner]]\n[[email]]\n[[ask:How long did it take?]]", SLUGS);
  assert.equal(r.text, "I built it with agents.");
  assert.deepEqual(r.slugs, ["meal-planner"]);
  assert.deepEqual(r.asks, ["How long did it take?"]);
  assert.equal(r.email, true);
  assert.equal(r.resume, false);
});

test("ignores project slugs the page doesn't know (hallucinated cards)", () => {
  assert.deepEqual(parseReply("x [[project:made-up]]", SLUGS).slugs, []);
});

test("caps cards at two and follow-ups at three, no duplicates", () => {
  const r = parseReply("x [[project:meal-planner]][[project:meal-planner]][[project:claims-ai]][[project:data-platform]][[ask:a]][[ask:b]][[ask:c]][[ask:d]]", SLUGS);
  assert.deepEqual(r.slugs, ["meal-planner", "claims-ai"]);
  assert.equal(r.asks.length, 3);
});

test("hides a tag that is still streaming in", () => {
  assert.equal(textOnly("Hello there\n[[proj"), "Hello there");
  assert.equal(parseReply("Hello [[ask:half", SLUGS).text, "Hello");
});

test("drops unknown tags instead of showing them", () => {
  assert.equal(parseReply("Hi [[confetti]]", SLUGS).text, "Hi");
});
