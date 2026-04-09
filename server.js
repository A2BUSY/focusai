import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mammoth from 'mammoth'
import multer from 'multer'
import OpenAI from 'openai'
import { PDFParse } from 'pdf-parse'
import WordExtractor from 'word-extractor'

// Load environment variables
dotenv.config()

const app = express()
const port = process.env.PORT || 8787
const openaiApiKey = process.env.OPENAI_API_KEY

app.use(cors())

// Multer is middleware used to handle file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
})

const extractor = new WordExtractor()

async function extractTextFromFile(file) {
  const fileExtension = file.originalname.toLowerCase().split('.').pop()

  if (fileExtension === 'txt') {
    return file.buffer.toString('utf-8')
  }

  if (fileExtension === 'pdf') {
    const parser = new PDFParse({ data: file.buffer })
    try {
      const textResult = await parser.getText()
      return textResult.text
    } finally {
      await parser.destroy()
    }
  }

  if (fileExtension === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return result.value
  }

  if (fileExtension === 'doc') {
    const document = await extractor.extract(file.buffer)
    return document.getBody()
  }

  throw new Error('Unsupported file type.')
}

function validateUpload(file) {
  if (!file) {
    return 'No file uploaded.'
  }
  const allowed = ['pdf', 'txt', 'doc', 'docx']
  const fileExtension = file.originalname.toLowerCase().split('.').pop()
  if (!allowed.includes(fileExtension)) {
    return 'Unsupported file type. Please upload .pdf, .txt, .doc, or .docx.'
  }
  return null
}

app.post('/api/summarize', upload.single('document'), async (req, res) => {
  // Check if the OpenAI API key is set
  if (!openaiApiKey) {
    return res.status(500).json({
      error: 'Missing OPENAI_API_KEY in environment variables.',
    })
  }

  // Validate the uploaded file
  const validationError = validateUpload(req.file)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  try {
    const rawText = (await extractTextFromFile(req.file)).trim()

    if (!rawText) {
      return res.status(400).json({
        error: 'The file is empty or text could not be extracted.',
      })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    const completion = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You summarize uploaded documents. Be accurate, concise, and organize output with short headings and bullet points.',
        },
        {
          role: 'user',
          content: `Please summarize the following document:\n\n${rawText}`,
        },
      ],
    })

    return res.json({
      summary: completion.output_text,
      filename: req.file.originalname,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate summary.',
    })
  }
});

app.post('/api/notes', upload.single('document'), async (req, res) => {
  // Check if the OpenAI API key is set
  if (!openaiApiKey) {
    return res.status(500).json({
      error: 'Missing OPENAI_API_KEY in environment variables.',
    })
  }

  // Validate the uploaded file
  const validationError = validateUpload(req.file)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  try {
    const rawText = (await extractTextFromFile(req.file)).trim()

    if (!rawText) {
      return res.status(400).json({
        error: 'The file is empty or text could not be extracted.',
      })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    const completion = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You create concise notes from uploaded documents. Focus on the most important information and ideas and organize them in a logical and easy to follow structure.',
        },
        {
          role: 'user',
          content: `Please create notes from the following document:\n\n${rawText}`,
        },
      ],
    })

    return res.json({
      summary: completion.output_text,
      filename: req.file.originalname,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate notes.',
    })
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
});
