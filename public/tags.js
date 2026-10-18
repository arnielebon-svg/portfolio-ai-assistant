// ─────────────────────────────────────────────────────────────────────────────
// public/tags.js
//
// The tag protocol: how the model drives the interface.
//
// The model writes a normal answer, then a few tags at the very end:
//
//   I built the meal planner app with AI coding agents in a few weeks...
//   [[project:meal-planner]]
//   [[email]]
//   [[ask:How did you test it with users?]]
//
// This file pulls the tags out and returns the clean text plus what to render.
// It has no DOM code, so the same file runs in the browser and in the tests
// (tests/tags.test.mjs). Full protocol: docs/TAGS.md.
// ─────────────────────────────────────────────────────────────────────────────

const ANY_TAG = /\[\[[^\]]*\]\]/g;
// A tag that has started streaming in but isn't finished yet, e.g. "[[proj".
// Hiding it means visitors never see half a tag flash on screen.
const PARTIAL_TAG = /\[\[[^\]]*$/;

/** The answer's text with every tag (finished or still streaming) removed. */
export function textOnly(content) {
  return content.replace(ANY_TAG, "").replace(PARTIAL_TAG, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Splits a reply into its text and the interface it asks for.
 *
 * @param {string} content     the raw reply as streamed by the model
 * @param {string[]} knownSlugs project slugs the page can actually show
 * @returns {{text:string, slugs:string[], asks:string[], email:boolean, resume:boolean}}
 */
export function parseReply(content, knownSlugs = []) {
  const slugs = [];
  const asks = [];
  let email = false;
  let resume = false;

  const text = content
    // Project cards: only slugs the page knows (a hallucinated slug is ignored), no duplicates.
    .replace(/\[\[project:([\w-]+)\]\]/g, (_, slug) => {
      if (!slugs.includes(slug) && knownSlugs.includes(slug)) slugs.push(slug);
      return "";
    })
    // Follow-up questions: at most three, however many the model writes.
    .replace(/\[\[ask:([^\]]+)\]\]/g, (_, q) => {
      if (asks.length < 3) asks.push(q.trim());
      return "";
    })
    .replace(/\[\[email\]\]/g, () => ((email = true), ""))
    .replace(/\[\[resume\]\]/g, () => ((resume = true), ""))
    // Any other tag (unknown or misspelt) is dropped rather than shown.
    .replace(ANY_TAG, "")
    .replace(PARTIAL_TAG, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // The prompt allows two cards at most; enforce it here too.
  return { text, slugs: slugs.slice(0, 2), asks, email, resume };
}
