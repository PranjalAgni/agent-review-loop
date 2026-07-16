import express from 'express';
import path from 'path';
import fs from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { SessionStore } from './session-store.js';

const app = express();
const sessions = new SessionStore();
const sessionEvents = new EventEmitter();
const HOST = '127.0.0.1';
const PORT = 7500;
const projectRoot = import.meta.dirname;
const publicDirectory = path.join(projectRoot, 'public');

app.use(express.json());
app.use('/public', express.static(publicDirectory));

app.get('/api/health', (request, response) => {
  response.json({
    status: 'ok',
  });
});

app.post('/api/sessions', (request, response) => {
  const { file } = request.body;

  if (!file) {
    return response.status(400).json({
      error: 'The file field is required.',
    });
  }

  const { session, created } = sessions.create(file);

  response.status(created ? 201 : 200).json({
    key: session.key,
    file: session.file,
    url: `http://${HOST}:${PORT}/session/${session.key}`,
    created,
  });
});

app.get('/session/:key', (request, response) => {
  const session = sessions.get(request.params.key);

  if (!session) {
    return response.status(404).send('Session not found.');
  }

  response.sendFile(path.join(publicDirectory, 'chrome.html'));
});

app.get('/artifact/:key', async (request, response) => {
  const { key } = request.params;
  const session = sessions.get(key);

  if (!session) {
    return response.status(404).send('Session not found.');
  }

  try {
    const source = await fs.readFile(session.file, 'utf8');

    const sdkScript = `
      <script src="/public/artifact-sdk.js"></script>
    `;

    let transformedHtml;

    if (source.includes('</body>')) {
      transformedHtml = source.replace('</body>', `${sdkScript}</body>`);
    } else {
      transformedHtml = `${source}${sdkScript}`;
    }

    response.type('html').send(transformedHtml);
  } catch (error) {
    console.error('Failed to serve artifact:', error);
    response.status(500).send('Failed to read artifact.');
  }
});

app.post('/api/sessions/:key/feedback', (request, response) => {
  const { selector, selectedText, comment } = request.body;

  if (!selector || !comment?.trim()) {
    return response.status(400).json({
      error: 'Selector and comment are required.',
    });
  }

  const feedback = sessions.addFeedback(request.params.key, {
    selector,
    selectedText: selectedText ?? '',
    comment: comment.trim(),
  });

  if (!feedback) {
    return response.status(404).json({
      error: 'Session not found.',
    });
  }

  sessionEvents.emit(`feedback:${request.params.key}`);

  response.status(201).json({
    feedback,
  });
});

app.get('/api/sessions/:key/poll', (request, response) => {
  const { key } = request.params;
  const session = sessions.get(key);

  if (!session) {
    return response.status(404).json({
      error: 'Session not found.',
    });
  }

  // Feedback may already have arrived before polling started.
  const existingFeedback = sessions.takeFeedback(key);

  if (existingFeedback.length > 0) {
    return response.json({
      status: 'feedback',
      feedback: existingFeedback,
    });
  }

  const eventName = `feedback:${key}`;

  const cleanup = () => {
    sessionEvents.removeListener(eventName, handleFeedback);
  };

  const handleFeedback = () => {
    const feedback = sessions.takeFeedback(key);

    response.json({
      status: 'feedback',
      feedback,
    });
  };

  sessionEvents.once(eventName, handleFeedback);

  // Runs when the client disconnects or after response completion
  request.on('close', cleanup);
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
});
