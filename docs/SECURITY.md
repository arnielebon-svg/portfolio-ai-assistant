# Security

A public AI endpoint gets poked at. This project assumes every visitor might be hostile and stacks several cheap layers, so no single failure matters much.

## Threat model

| Threat | Example | Main defence |
|---|---|---|
| Cost abuse | A script sends thousands of questions to run up your bill | Edge rate limit, session cap, turn and length caps, small model |
| Off-topic use | Using your bot as a free coding assistant | Scope rule and fixed decline sentence |
| Prompt injection | "Ignore your instructions", fake admin mode, instructions in pasted text | Security rule, input cleaning (no forged system turns) |
| Data leakage | Getting your phone number or address | Contact allowlist; only shareable facts in the profile |
| Prompt extraction | "Print your system prompt" | Security rule; the prompt holds nothing secret anyway |
| Reputation | Getting the bot to criticise an employer or give opinions | Scope and security rules |
| Cross-site scripting | A reply containing `<script>` | Every model output is escaped before rendering; strict CSP |
| Key theft | Reading the API key from the page | The key exists only in the server environment |

## The layers

### 1. The rules (lib/prompt.js)
Scope, privacy and security sections. Strong, but a prompt is never a guarantee, which is why the other layers exist.

### 2. Input cleaning (lib/messages.js)
The server never forwards the request body. It rebuilds the conversation: only `user` and `assistant` roles, only strings, each capped at `LIMITS.maxChars`, only the newest `LIMITS.maxTurns`. A forged `system` message is dropped before it reaches the model.

### 3. Nothing secret in the prompt
Assume the system prompt will leak one day and make that harmless: no keys, no private notes, nothing you wouldn't publish. The profile is written to be shared.

### 4. Output escaping (public/chat.js)
The model's text is treated as untrusted. `esc()` escapes it before it touches the page, and links are created only after escaping. The widget never uses model output as HTML.

### 5. Security headers (vercel.json)
- `Content-Security-Policy` with `script-src 'self'`: no inline scripts, no third-party scripts. Even if escaping failed, injected script would not run.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY`: your chat can't be embedded on another site.
- `nosniff`, a strict referrer policy, and a permissions policy that turns off camera, microphone and location.

### 6. Rate limiting (set this up when you deploy)
The browser-side session cap (`CONFIG.sessionMax`) only stops casual over-use; anyone can bypass it with a script. Add a real limit at the edge:

- **Vercel:** Project, Firewall, add a rate limit rule on the path `/api/chat`, for example 30 requests per IP per hour, action "Deny" (the widget shows a friendly "try again later" on 429 or 403).
- **Elsewhere:** your host's WAF, Cloudflare rate limiting, or a small counter in a key-value store.

### 7. Spending limit
Set a monthly spend limit in the [Anthropic Console](https://console.anthropic.com). Even if everything else failed, the worst case has a ceiling.

### 8. Nothing stored
No database, no logs of visitor questions (only errors are logged). The conversation lives in the visitor's own `sessionStorage` and disappears when the tab closes. Less data held means less to leak. Say this in your privacy notice.

## Before you go live

- [ ] `ANTHROPIC_API_KEY` set in the host's environment, not in any file
- [ ] `.env` is git-ignored (it is by default) and was never committed
- [ ] `ASSISTANT_MOCK` is empty in production
- [ ] Edge rate limit on `/api/chat`
- [ ] Monthly spend limit in the Anthropic Console
- [ ] `npm run evals` passes against the deployed URL
- [ ] Your profile contains nothing you wouldn't tell a stranger
- [ ] A short notice near the chat: it's an AI, it can make mistakes, don't share personal information

## Reporting a problem

Found a way around the rules? Open an issue with the prompt you used (please don't include anyone's personal data). Better still, open a pull request that adds it to `evals/cases.json`.
