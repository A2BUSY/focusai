# FocusAI

Upload a document and generate a summary using the ChatGPT API.

## Supported files

-   `.pdf`
-   `.txt`
-   `.doc`
-   `.docx`

## Setup

1. Install dependencies:
    - `npm install`
2. Create your env file:
    - `cp .env.example .env`
3. Add your OpenAI API key in `.env`:
    - `OPENAI_API_KEY=your_key_here`
4. Start the app:
    - `npm run dev`

The frontend runs with Vite and proxies API requests to the Express server at `http://localhost:8787`.
