# Study Planner

A calm, café-themed study planner built with Next.js, Prisma, and SQLite.

## Features

- **Schedule**: Create and manage study reminders with tasks, materials, and quizzes.
- **Tasks**: Checklist with progress tracking, inline editing, and reordering.
- **Materials**: Upload PDF, DOCX, TXT, or MD files with server-side text extraction.
- **Quizzes**: Generate multiple-choice quizzes from uploaded materials using AI.
- **Chat**: General study assistant and context-aware chat for each reminder.
- **Theme**: Calm café dark/light theme with Lora headings and Inter body text.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` **in the project root** and fill in your environment variables:

```bash
cp .env.example .env.local
```

### AI Configuration

The app supports multiple AI providers. Choose one and configure accordingly:

- `AI_API_KEY` - Your API key.
- `LLM_PROVIDER` - Provider to use: `gemini`, `openai`, or `anthropic`. **This must match your API key provider.**
- `AI_MODEL` - Default model for chat and general AI. If unset, defaults to `gemini-3.8-flash`.
- `AI_QUIZ_MODEL` - Optional. Model used only for quiz generation. If unset, uses `AI_MODEL`.

**Important**: The provider must match your API key. For example, if you have an OpenAI key (starts with `sk-`), set `LLM_PROVIDER=openai` and `AI_MODEL=gpt-4o-mini`. If you have a Google/Gemini key (starts with `AIza` or `AQ.`), set `LLM_PROVIDER=gemini`.

### Other Configuration

- `ENABLE_WEB_SEARCH` - Set to `true` to enable web search in chat.
- `TAVILY_API_KEY` - Tavily API key for web search (only needed if `ENABLE_WEB_SEARCH=true`).
- `MAX_UPLOAD_SIZE_MB` - Maximum file upload size in MB (default: 500).

> **Important**: After editing `.env.local`, you must restart the dev server for changes to take effect.

Initialize the database:

```bash
npx prisma migrate dev
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Build

```bash
npm run build
npm run start
```

## Getting an AI Key

- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys
- Google AI (Gemini): https://aistudio.google.com/app/apikey

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite
- Zod (validation)
- pdf-parse + mammoth (document extraction)
- react-markdown (chat markdown rendering)

## Large File Uploads

The app supports chunked uploads for large files (up to several GB). Files are processed from disk to avoid memory issues. For production deployments on Vercel or similar serverless platforms, consider using direct upload to S3/R2/GCS with presigned URLs, as serverless functions have body size limits.
