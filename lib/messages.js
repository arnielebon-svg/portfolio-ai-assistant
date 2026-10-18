// ─────────────────────────────────────────────────────────────────────────────
// lib/messages.js
//
// Cleans the conversation the browser sends before it reaches the model.
//
// The browser is untrusted: anyone can POST anything to /api/chat. So the server
// never forwards the request body as-is. It rebuilds the message list from
// scratch and keeps only what a real chat could have produced.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {unknown} body  the parsed JSON body of the request
 * @param {{maxTurns:number, maxChars:number}} limits
 * @returns {{ok:true, messages:Array<{role:"user"|"assistant", content:string}>} | {ok:false, error:string}}
 */
export function sanitizeMessages(body, { maxTurns, maxChars }) {
  const raw = Array.isArray(body?.messages) ? body.messages : [];

  let messages = raw
    // 1. Only plain-text user and assistant turns. A forged "system" role, image
    //    blocks or tool calls are dropped, so a visitor can't smuggle in new rules.
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    // 2. Cap each message, so nobody pastes a book and runs up your bill.
    .map((m) => ({ role: m.role, content: m.content.slice(0, maxChars) }))
    // 3. Keep only the newest turns: a long chat costs the same as a short one.
    .slice(-maxTurns);

  // 4. The API expects the conversation to start with the user...
  while (messages.length && messages[0].role !== "user") messages.shift();

  // 5. ...and the last turn must be the user's question we are answering.
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "Last message must be from the user" };
  }
  return { ok: true, messages };
}
