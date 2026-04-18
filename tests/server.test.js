import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn();

// Mock openai api client
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      constructor() {
        this.responses = {
          create: mockCreate,
        }
      }
    },
  }
})

async function loadApp(apiKey = 'test-api-key') {
  // Ensure imports are reset during server import to ensure a clean state between tests
  vi.resetModules()
  process.env.NODE_ENV = 'test'
  process.env.OPENAI_API_KEY = apiKey
  const server = await import('../server.js')
  return server.app
}

beforeEach(() => {
  mockCreate.mockReset();
})

describe('POST: /api/summarize', () => {
  it('returns a summary for a valid text file', async () => {
    mockCreate.mockResolvedValue({ output_text: 'Short summary' })
    const app = await loadApp()

    const response = await request(app)
      .post('/api/summarize')
      // Use Buffer class to simulate a file 
      .attach('document', Buffer.from('FocusAI makes studying easier.'), 'lesson.txt')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      summary: 'Short summary',
      filename: 'lesson.txt',
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when no file is uploaded', async () => {
    const app = await loadApp()

    const response = await request(app).post('/api/summarize');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No file uploaded.');
  })
})

describe('POST: /api/notes', () => {
  it('returns notes for a valid text file', async () => {
    mockCreate.mockResolvedValue({ output_text: 'Key notes list' })
    const app = await loadApp()

    const response = await request(app)
      .post('/api/notes')
      .attach('document', Buffer.from('Important notes content.'), 'notes.txt')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      summary: 'Key notes list',
      filename: 'notes.txt',
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for unsupported file types', async () => {
    const app = await loadApp()

    const response = await request(app)
      .post('/api/notes')
      .attach('document', Buffer.from('binary'), 'archive.zip')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Unsupported file type. Please upload .pdf, .txt, .doc, or .docx.')
  })
})

describe('POST /api/chat', () => {
  it('returns answer for valid file and question', async () => {
    mockCreate.mockResolvedValue({ output_text: 'The document explains javascript loops.' })
    const app = await loadApp()

    const response = await request(app)
      .post('/api/chat')
      .field('question', 'What does this document explain?')
      .attach('document', Buffer.from('This document explains loops in JavaScript.'), 'chat.txt')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      answer: 'The document explains javascript loops.',
      filename: 'chat.txt',
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when question is missing', async () => {
    const app = await loadApp()

    const response = await request(app)
      .post('/api/chat')
      .attach('document', Buffer.from('Some text'), 'chat.txt')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Please provide a question.')
  })
})

describe('OPENAI_API_KEY', () => {
  it('No api key set: /api/summarize', async () => {
    // Load server without setting an api keuy
    const app = await loadApp('')

    const response = await request(app)
      .post('/api/summarize')
      .attach('document', Buffer.from('Some text'), 'lesson.txt')

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Missing OPENAI_API_KEY in environment variables.')
  })
})
