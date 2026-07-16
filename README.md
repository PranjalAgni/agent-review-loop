# Agent Review Loop

A small local prototype for sending element-level feedback from an HTML artifact back to a coding agent such as Claude Code.

The project recreates the core interaction behind tools such as Lavish AXI without the additional sharing, export, diagram, or persistence features.

## How it works

```text
Claude Code opens an HTML artifact
              ↓
Express serves it inside a review iframe
              ↓
The user selects an element and submits feedback
              ↓
The server completes Claude's long-poll request
              ↓
Claude receives structured JSON and edits the HTML
```

The connection is composed from a few simple mechanisms:

- HTTP between the CLI, browser, and local Express server
- `postMessage()` between the review chrome and artifact iframe
- Runtime SDK injection for element selection
- Long polling to return browser feedback to the waiting agent command
- An in-memory `Map` for session and feedback state

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
node server.js
```

In another terminal, open an artifact:

```bash
node cli.js open examples/architecture.html
```

Wait for one feedback batch:

```bash
node cli.js poll examples/architecture.html
```

Enable annotation mode in the browser, select an element, write a comment, and send it. The waiting `poll` command prints structured JSON and exits.

Each poll is intentionally single-use. An agent processes the returned feedback, edits the artifact, and starts a new poll.

## Claude Code test prompt

```text
Open examples/architecture.html with:

node cli.js open examples/architecture.html

Then repeatedly:
1. Run node cli.js poll examples/architecture.html.
2. Wait for the command to return browser feedback.
3. Use selector, selectedText, and comment to apply the smallest appropriate HTML change.
4. Verify the result and immediately run a new poll.

Do not stop after the first feedback batch. Stop only when the feedback comment is STOP_REVIEW.
```

## Project structure

```text
├── cli.js                    # Agent-facing open and poll commands
├── server.js                 # HTTP routes and long-poll coordination
├── session-store.js          # In-memory sessions and feedback queues
├── public/
│   ├── chrome.html           # Outer review interface
│   ├── chrome.js             # Selection UI and feedback submission
│   ├── chrome.css
│   └── artifact-sdk.js       # Injected iframe selection behaviour
└── examples/
    └── architecture.html     # Example artifact
```

## What this project demonstrates

- Imports share code, not memory, across Node.js processes.
- A long-running server can coordinate short-lived CLI commands.
- An iframe isolates artifact CSS and JavaScript from review controls.
- `postMessage()` provides controlled cross-window communication.
- Long polling fits agent tools because one HTTP response becomes one tool result.
- Canonical file paths can provide stable session identity.
- Feedback should be queued before polling so messages are not lost when no agent is waiting.

## Current limitations

- Sessions and feedback disappear when the server restarts.
- Only element annotations are supported; text-range selection is not.
- The browser must currently be refreshed after the artifact changes.
- SDK injection uses string replacement rather than a full HTML parser.
- The MVP assumes one active poller per session.
