# Build your own, step by step

From zero to a live assistant on your portfolio in about an hour. No prior backend experience needed.

## What you need

- [Node.js](https://nodejs.org) 20.6 or later (check with `node -v`)
- A [GitHub](https://github.com) account
- An [Anthropic API key](https://console.anthropic.com) (pay as you go; a portfolio's traffic usually costs very little, and you can set a monthly limit)
- A free [Vercel](https://vercel.com) account for hosting

## 1. Get the code

Click **Use this template** (or **Fork**) on GitHub, then:

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npm install
npm run dev:mock
```

Open http://localhost:3000. You'll see the demo page answering with canned replies. No key, no cost.

## 2. Say who it speaks for

Open [`config/assistant.js`](../config/assistant.js):

- `name`: what visitors see ("SamLLM", "Ask Sam").
- `owner`: your full name, first name, and the city-level location it may give.
- `contact`: the **only** contact details it may share. Leave a field `""` to never share it.
- `declineSentence`: your polite refusal for off-topic requests. Keep it to one sentence.
- `availability`: one true line about what you're open to.

## 3. Write what it knows

Open [`config/profile.js`](../config/profile.js) and replace the fictional example.

Tips that make the biggest difference:

- **Paste your resume, then edit.** Turn it into plain facts, one per line.
- **Every number you want quoted must be in here.** The rules forbid estimating.
- **Answer recruiter questions in advance:** work rights, notice period, availability, remote or onsite, team sizes, budgets, tools.
- **Leave out anything you wouldn't say to a stranger.** The model treats the whole profile as shareable.
- **List your projects** in `PROJECTS` as `slug: description`. These become cards.

## 4. Match the page

Open [`public/chat.js`](../public/chat.js) and edit `CONFIG`:

- `suggestions`: four starter questions.
- `resumeUrl`: put your PDF in `public/` (for example `public/resume.pdf`).
- `contactUrl`: your contact page or a `mailto:` link.
- `projects`: one entry per slug from step 3, with a title, a short note and a link.

Change colours in the `:root` block of [`public/chat.css`](../public/chat.css), and the text in [`public/index.html`](../public/index.html).

## 5. Try it with the real model

```bash
cp .env.example .env
```

Paste your key after `ANTHROPIC_API_KEY=` in `.env` (this file is git-ignored, never commit it), then:

```bash
npm run dev
```

Ask it about yourself. Then try to break it: ask for your phone number, ask it to write code, tell it to ignore its instructions.

## 6. Run the tests

```bash
npm test          # free, checks the code
npm run evals     # with npm run dev running: checks the model's behaviour
```

Update [`evals/cases.json`](../evals/cases.json) so the questions fit your profile (for example, change "What does Alex do for work?" to your name).

## 7. Deploy to Vercel

1. Push your repo to GitHub.
2. In Vercel: **Add New, Project**, import the repo. Leave the defaults; `vercel.json` already sets everything.
3. **Settings, Environment Variables:** add `ANTHROPIC_API_KEY`.
4. Deploy. Your assistant is live at `https://<project>.vercel.app`.
5. **Firewall:** add a rate limit rule for `/api/chat` (see [SECURITY.md](SECURITY.md)).
6. In the Anthropic Console, set a **monthly spend limit**.
7. Run the evals against the live site:

```bash
EVAL_URL=https://<project>.vercel.app/api/chat npm run evals
```

## 8. Put it on your existing site

If your portfolio already exists elsewhere:

- **Same Vercel project:** copy `api/`, `lib/`, `config/` and `package.json` dependencies into it, and the widget files from `public/`.
- **Different host:** keep this project deployed for the API, and call `https://<project>.vercel.app/api/chat` from your site. You'll need to allow your site's origin (CORS) in `api/chat.js` and in the CSP `connect-src`.

## Common questions

**Do I need a vector database?** No. A portfolio fits comfortably in one prompt. That's the point of the design.

**Which model?** The default small Haiku model is fast and cheap, and plenty for answering from a profile. Change `MODEL.id` in `config/assistant.js` if you want.

**How do I keep it up to date?** Edit `config/profile.js` and push. Vercel redeploys automatically.

**It said something wrong.** Check the profile first (is the fact there, and clear?). Then check the rules. Then add an eval case so it never happens again.

**Can it speak other languages?** Yes, it replies in the visitor's language automatically, including the decline sentence.
