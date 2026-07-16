const pathParts = window.location.pathname.split('/');
const sessionKey = pathParts.at(-1);

const keyElement = document.querySelector('#session-key');
const artifactFrame = document.querySelector('#artifact');

const annotationToggle = document.querySelector('#annotation-toggle');
const selectedTarget = document.querySelector('#selected-target');

const feedbackInput = document.querySelector('#feedback-input');
const sendFeedbackButton = document.querySelector('#send-feedback');
const feedbackStatus = document.querySelector('#feedback-status');

keyElement.textContent = `Session: ${sessionKey}`;
artifactFrame.src = `/artifact/${sessionKey}`;

let annotationMode = false;
let currentTarget = null;

annotationToggle.addEventListener('click', () => {
  annotationMode = !annotationMode;

  annotationToggle.textContent = annotationMode
    ? 'Disable annotation mode'
    : 'Enable annotation mode';

  artifactFrame.contentWindow.postMessage(
    {
      type: 'agent-review:set-annotation-mode',
      enabled: annotationMode,
    },
    window.location.origin,
  );
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.source !== artifactFrame.contentWindow) {
    return;
  }

  if (event.data?.type === 'agent-review:artifact-ready') {
    console.log('Artifact SDK connected:', event.data);
  }

  if (event.data?.type === 'agent-review:element-selected') {
    const { target } = event.data;

    currentTarget = event.data.target;
    selectedTarget.innerHTML = '';

    const selector = document.createElement('code');
    selector.textContent = target.selector;

    const text = document.createElement('p');
    text.textContent = target.text || '(No text content)';

    selectedTarget.append(selector, text);
  }
});

sendFeedbackButton.addEventListener('click', async () => {
  const comment = feedbackInput.value.trim();

  if (!currentTarget) {
    feedbackStatus.textContent = 'Select an element first.';
    return;
  }

  if (!comment) {
    feedbackStatus.textContent = 'Enter feedback first.';
    return;
  }

  sendFeedbackButton.disabled = true;
  feedbackStatus.textContent = 'Sending...';

  try {
    const response = await fetch(`/api/sessions/${sessionKey}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selector: currentTarget.selector,
        selectedText: currentTarget.text,
        comment,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? 'Failed to send feedback.');
    }

    feedbackInput.value = '';
    feedbackStatus.textContent = 'Feedback sent to Claude.';
  } catch (error) {
    feedbackStatus.textContent = error.message;
  } finally {
    sendFeedbackButton.disabled = false;
  }
});
