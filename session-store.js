import crypto from 'node:crypto';

export class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  create(filePath) {
    const key = this.generateKey(filePath);
    const existingSession = this.sessions.get(key);
    if (existingSession) {
      return {
        session: existingSession,
        created: false,
      };
    }

    const session = {
      key,
      file: filePath,
      createdAt: new Date().toISOString(),
      feedback: [],
    };

    this.sessions.set(key, session);
    return {
      session,
      created: true,
    };
  }

  get(key) {
    return this.sessions.get(key);
  }

  generateKey(filePath) {
    return crypto
      .createHash('sha256')
      .update(filePath)
      .digest('hex')
      .slice(0, 16);
  }

  addFeedback(key, feedback) {
    const session = this.sessions.get(key);

    if (!session) {
      return null;
    }

    const item = {
      id: crypto.randomUUID(),
      ...feedback,
      createdAt: new Date().toISOString(),
    };

    session.feedback.push(item);

    return item;
  }

  takeFeedback(key) {
    const session = this.sessions.get(key);

    if (!session || session.feedback.length === 0) {
      return [];
    }

    const feedback = session.feedback;
    session.feedback = [];

    return feedback;
  }
}
