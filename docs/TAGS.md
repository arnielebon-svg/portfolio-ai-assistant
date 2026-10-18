# The tag protocol

The model drives the interface by ending its answer with small tags. The browser strips them out and turns them into interface.

```
I built the meal planner app with AI coding agents in a few weeks, then tested it with real users.
[[project:meal-planner]]
[[ask:How did you test it with users?]]
[[ask:What did the agents build?]]
```

Becomes: the sentence, a "Meal planner app" card, and two clickable follow-up questions.

## The tags

| Tag | Rendered as | Limits |
|---|---|---|
| `[[project:slug]]` | A case-study card linking to the project | Max 2. Slugs not in `CONFIG.projects` are ignored |
| `[[email]]` | A "Get in touch" button (`CONFIG.contactUrl`) | Once |
| `[[resume]]` | A "Download resume" button (`CONFIG.resumeUrl`) | Once |
| `[[ask:question]]` | A follow-up question; clicking it asks it | Max 3, shown only under the latest answer |

Any other `[[...]]` is removed rather than shown, so a typo never leaks onto the page.

## Why tags and not JSON or tool calls

- **Streaming stays smooth.** With a JSON response the visitor waits for the whole object. With tags at the end, text appears word by word and the tags arrive last.
- **One request, one model call.** No second call to classify the answer, no tool round trip.
- **Fails safe.** A malformed tag is simply dropped. Malformed JSON breaks the whole answer.
- **Easy to read in logs.** The raw reply is still a readable answer.

## The streaming detail

While the answer streams, a tag can arrive half-written: `[[proj`. The parser hides any unfinished `[[...` at the end of the text (`PARTIAL_TAG` in [`public/tags.js`](../public/tags.js)), so visitors never see half a tag flash on screen. Once the stream ends, the full reply is parsed and the interface appears.

## Adding your own tag

Say you want a `[[calendar]]` tag that shows a "Book a call" button.

1. **Teach the model.** In [`lib/prompt.js`](../lib/prompt.js), add a line to the ACTION BUTTONS section: when to use `[[calendar]]` and when not to.
2. **Parse it.** In [`public/tags.js`](../public/tags.js), add `.replace(/\[\[calendar\]\]/g, () => ((calendar = true), ""))` and return `calendar`.
3. **Render it.** In `botHtml()` in [`public/chat.js`](../public/chat.js), add the button when `r.calendar` is true.
4. **Test it.** Add a unit test in [`tests/tags.test.mjs`](../tests/tags.test.mjs) and an eval case that expects `[[calendar]]` for "Can we book a call?".

Keep the vocabulary small. Every tag is one more thing the model can use at the wrong time.
