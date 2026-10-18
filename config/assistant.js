// ─────────────────────────────────────────────────────────────────────────────
// config/assistant.js
//
// Who the assistant speaks for, and the few settings you are expected to change.
// This is one of only two files you edit to make the assistant yours
// (the other is config/profile.js, which holds what it knows).
//
// Everything here is public on purpose: it ends up in the system prompt and
// some of it in the browser. Never put an API key or a private detail here.
// Secrets live in environment variables (see .env.example).
// ─────────────────────────────────────────────────────────────────────────────

export const ASSISTANT = {
  // The name visitors see, and the name the model uses for itself.
  name: "AlexLLM",

  // The person the assistant answers for. It always speaks AS this person,
  // in the first person ("I led...", never "Alex led...").
  owner: {
    fullName: "Alex Rivera",
    firstName: "Alex",
    // The only location the assistant will ever give. Keep it at city level.
    location: "Toronto, Canada",
  },

  // The ONLY contact details the assistant may share. Anything not listed here
  // (phone, address, date of birth...) is refused, even if a visitor insists.
  // Leave a field as "" to never share it.
  contact: {
    email: "hello@example.com",
    linkedin: "linkedin.com/in/your-handle",
  },

  // The sentence used for every out-of-scope request. One fixed sentence makes
  // refusals predictable, easy to test (see evals/) and impossible to argue with.
  declineSentence:
    "I'm only here to answer questions about my work, projects and experience. Ask me about those, or send me a message through the contact form on this site.",

  // Shown when a visitor wants to hire you. Keep it short and true.
  availability: "open to permanent roles from next month, hybrid preferred",

  // Where the "how was this built?" answer points. Set to "" to leave it out.
  buildGuideUrl: "github.com/your-handle/your-assistant",
};

// Model and limits. The defaults are tuned for a portfolio: cheap, fast, short answers.
export const MODEL = {
  // A small, low-cost model is plenty for answering from a curated profile.
  id: "claude-haiku-5-5",
  // Upper bound for one reply (thinking and answer share it). Answers are short by rule,
  // so this is a safety net, not a target.
  maxTokens: 2048,
  // Low effort keeps replies fast and cheap; the answers come from the profile, not from reasoning.
  effort: "low",
};

export const LIMITS = {
  // How many recent messages the server accepts per request. Older turns are dropped,
  // which caps the cost of a long conversation.
  maxTurns: 12,
  // Longest single message, in characters. Stops a visitor from pasting a whole document.
  maxChars: 1500,
};
