// ─────────────────────────────────────────────────────────────────────────────
// lib/mock.js
//
// A fake model for trying the project with no API key and no cost.
// Turned on with ASSISTANT_MOCK=1 (see .env.example). Never used in production
// unless you set that variable there, which you shouldn't.
//
// It streams a canned answer in small chunks, with tags, exactly like the real
// model, so you can work on the page, the tags and the styling offline.
// ─────────────────────────────────────────────────────────────────────────────

export function mockReply(question, a) {
  const q = question.toLowerCase();
  if (/ignore (all|previous)|system prompt|developer mode/.test(q)) return a.declineSentence;
  if (/contact|email|reach/.test(q)) {
    return `The easiest way is the contact form on this site, and I'm also on LinkedIn.\n[[email]]\n[[ask:Are you available now?]]\n[[ask:What kind of roles suit you?]]`;
  }
  return `(Mock reply, no API key set.) I'm ${a.owner.firstName}, and this is where a grounded answer from config/profile.js would appear. Projects can show as cards below.\n[[project:meal-planner]]\n[[ask:How did you build the meal planner app?]]\n[[ask:Are you available now?]]`;
}

/** Splits text into small chunks with a short delay, like a streamed response. */
export async function* mockStream(text) {
  for (let i = 0; i < text.length; i += 6) {
    await new Promise((r) => setTimeout(r, 15));
    yield text.slice(i, i + 6);
  }
}
