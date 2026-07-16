import path from 'path';
import fs from 'node:fs/promises';
import open from 'open';
import { SessionStore } from './session-store.js';

const [, , command, filePath] = process.argv;
const SERVER_URL = 'http://127.0.0.1:7500';
const supportedCommands = ['open', 'poll'];

if (!command) {
  console.error('Missing command.');
  console.error('Usage: node cli.js <command> <html-file>');
  process.exit(1);
}

if (!supportedCommands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.error(`Available commands: ${supportedCommands.join(', ')}`);
  process.exit(1);
}

if (!filePath) {
  console.error('Missing HTML file.');
  console.error('Usage: node cli.js open <html-file>');
  process.exit(1);
}

const store = new SessionStore();
const absolutePath = path.resolve(filePath);
const canonicalPath = await fs.realpath(absolutePath);

async function fetchSession() {
  let response = null;
  try {
    response = await fetch(`${SERVER_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: canonicalPath,
      }),
    });
  } catch {
    throw new Error(
      `Cannot connect to the review server at ${SERVER_URL}. ` +
        'Start it with: node server.js',
    );
  }

  return response;
}

if (command === 'open') {
  try {
    const stats = await fs.stat(canonicalPath);

    if (!stats.isFile()) {
      throw new Error('The provided path is not a file.');
    }

    if (path.extname(canonicalPath).toLowerCase() !== '.html') {
      throw new Error('The artifact must be an HTML file.');
    }

    let response = await fetchSession();

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? 'Failed to create session.');
    }

    const session = await response.json();

    console.log('Session created:');
    console.log(`Key: ${session.key}`);
    console.log(`URL: ${session.url}`);
    await open(session.url);
  } catch (error) {
    console.error(`Cannot open artifact: ${error.message}`);
    process.exit(1);
  }
}

if (command === 'poll') {
  console.error(`Waiting for feedback on ${canonicalPath}...`);
  let response = await fetchSession();

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? 'Failed to create session.');
  }

  const session = await response.json();

  const pollResponse = await fetch(
    `${SERVER_URL}/api/sessions/${session.key}/poll`,
  );

  if (!pollResponse.ok) {
    const error = await pollResponse.json();

    throw new Error(error.error ?? 'Failed to poll for feedback.');
  }

  const result = await pollResponse.json();

  // Keep machine-readable output on stdout.
  console.log(JSON.stringify(result, null, 2));
}
