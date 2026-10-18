// ─────────────────────────────────────────────────────────────────────────────
// config/profile.js
//
// WHAT THE ASSISTANT KNOWS. Replace the example below with your own facts.
//
// Why a hand-written profile instead of a vector database (RAG)?
//   - A portfolio is small: a few thousand words fit easily in one prompt.
//   - You decide every word the model can draw on, so nothing outdated or
//     private leaks in from a forgotten document.
//   - It is one file, so it is easy to review, version and diff.
//   - With prompt caching (see api/chat.js) the repeated profile is cheap.
//
// How to write a good profile:
//   1. Write facts, not marketing. "Cut audit preparation by 40%" beats "results-driven".
//   2. Every number you want quoted must be here. The rules forbid the model
//      from estimating, so a missing number becomes "happy to discuss directly".
//   3. Answer the questions recruiters actually ask: work rights, availability,
//      notice period, remote or onsite, tools, team sizes, budgets.
//   4. Leave out anything you would not say in an interview. The model treats
//      everything here as shareable.
//   5. Keep the PROJECTS slugs in sync with the cards in public/chat.js.
//
// The example person below is fictional.
// ─────────────────────────────────────────────────────────────────────────────

// Projects the chat can show as cards. One per line: "slug: short description".
// The model ends an answer with [[project:slug]] and the page turns it into a card.
export const PROJECTS = `
meal-planner: Meal planner app (side project; a weekly meal planning app built with AI coding agents)
claims-ai: Claims triage AI (insurance client; AI-assisted claims triage, pilot to production)
data-platform: Enterprise data platform (retail; central cloud data platform, one view of sales)
`;

// Everything the assistant is allowed to say about you. Plain text, any structure.
// Headings in capitals help the model find things; they are never shown to visitors.
export const PROFILE = `
Name: Alex Rivera
Location: Toronto, Canada.
Work rights: Canadian citizen, no sponsorship needed.
Title: AI Delivery Lead
Availability: open to permanent roles from next month, hybrid preferred.

SUMMARY
AI Delivery Lead with 10 years in delivery. Embeds with client teams, finds the real problem,
builds the AI solution alongside them and stays until it runs without help.

EXPERIENCE

Northwind Insurance (Toronto) - AI Delivery Lead, 2024 to present
- Interviewed 30 claims assessors and mapped the triage process end to end.
- Built an AI triage assistant that drafts a claim summary for a human to approve.
- Cut average triage time from 2 days to 4 hours; adopted by 3 teams in 2 months.

Contoso Retail (Toronto) - Senior Project Manager, 2020 to 2024
- Ran a $4M data platform program that gave leadership one view of sales.
- Coached teams of 20 to 30 through the change; zero disruption at cutover.

PROJECTS
Meal planner app: a weekly meal planning app, built with AI coding agents in weeks.
Uses scheduled jobs and serverless functions; launched in English and French.

SKILLS
Discovery workshops, process mapping, business cases, prompt design and testing,
agentic workflows, Python (reading and small scripts), SQL (reading), change management.

EDUCATION
Master of Management, University of Example.

OUTSIDE WORK
Trail running, teaching kids to code on weekends.

THIS ASSISTANT
Built with Claude Haiku from Anthropic, called from one serverless function on Vercel,
grounded in a hand-written profile and a strict set of rules, with no vector database.
`;
