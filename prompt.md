We are testing a browser-to-agent feedback loop for this HTML artifact:

examples/architecture.html

The local review server is already running.

First open the artifact:

node cli.js open examples/architecture.html

Then begin this mandatory loop:

1. Run:

   node cli.js poll examples/architecture.html

2. The poll command intentionally blocks until I submit feedback from the browser.

3. When it returns JSON:
   - Read every item in the `feedback` array.
   - Use `selector`, `selectedText`, and `comment` to locate the corresponding source element.
   - Apply the smallest appropriate change to examples/architecture.html.
   - Preserve unrelated content, styling, and behaviour.
   - Verify that the HTML remains valid.

4. Immediately run a new poll:

   node cli.js poll examples/architecture.html

Each poll is single-use and exits after returning one feedback batch. A poll exiting does not mean the review is finished.

Continue this loop:

poll → receive feedback → edit HTML → verify → poll again

Do not stop after the first feedback batch. Do not return control to me merely to report that a change was completed. Briefly record what changed internally, then immediately start the next poll.

Stop only if:

- I submit the exact comment: STOP_REVIEW
- the poll returns an explicit ended-session status
- the server becomes unavailable
- feedback is too ambiguous to apply safely

For STOP_REVIEW, do not modify the HTML. End the loop and summarize all changes made during the review.
