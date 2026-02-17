# Squeeze

Squeeze is an LLM token optimization tool built for NexHacks 2026. It helps developers reduce input token costs by compressing prompts before sending them to AI-powered tools. It supports two compression schemes: a proprietary scheme from [The Token Company](https://thetokencompany.com/) (TokenC) and an open-source scheme from [Microsoft LLMLingua](https://github.com/microsoft/LLMLingua).

## Architecture

The project consists of three components that work together:

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   VS Code        │       │   Next.js        │       │   Flask          │
│   Extension      │──────▶│   Website        │──────▶│   Server         │
│   (TypeScript)   │       │   (T3 Stack)     │       │   (Python)       │
└──────────────────┘       └──────────────────┘       └──────────────────┘
     extension/                 website/                   server/
```

1. **Extension** (`extension/`) — A VS Code sidebar extension that lets users compress prompts directly from the IDE. Sends requests to the website backend using an API key.
2. **Website** (`website/`) — A full-stack Next.js application (T3 stack: Next.js + tRPC + Prisma) that provides user authentication via Discord, API key management, a web-based compression demo, and query history with token savings metrics.
3. **Server** (`server/`) — A Flask API server that performs the actual text compression using TokenC and LLMLingua.

### Data Flow

1. User enters a prompt in the VS Code extension or the website demo page.
2. The request is sent to the Next.js backend (`/api/transform` or via tRPC).
3. The backend validates the user (by session or API key), then forwards the text to the Flask server's `POST /transform` endpoint.
4. The Flask server runs the selected compression algorithm and returns the compressed text with token counts.
5. The backend saves a `Query` record to the database (input/output token counts) and returns the result.

## Project Structure

```
squeeze/
├── README.md                  # This file
├── extension/                 # VS Code extension
│   ├── src/
│   │   ├── extension.ts       # Entry point — registers commands and webview provider
│   │   └── SqueezeViewProvider.ts  # Sidebar webview UI and compression logic
│   ├── package.json           # Extension manifest, commands, settings, and dependencies
│   └── tsconfig.json
├── server/                    # Python compression server
│   ├── server.py              # Flask API with POST /transform endpoint
│   ├── token_compressor.py    # TokenC API wrapper (The Token Company)
│   ├── lingua.py              # LLMLingua compressor (Microsoft BERT-based)
│   └── requirements.txt       # Python dependencies
├── website/                   # Next.js web application
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── page.tsx       # Home page with hero and global stats
│   │   │   ├── login/         # Discord OAuth login page
│   │   │   ├── account/       # User profile, API key, query history
│   │   │   └── demo/          # Interactive compression demo
│   │   ├── components/        # React components (Navbar, Hero, UserMenu, etc.)
│   │   ├── server/
│   │   │   ├── api/
│   │   │   │   ├── routers/
│   │   │   │   │   ├── transform.ts  # Compression endpoints (public + protected)
│   │   │   │   │   ├── query.ts      # Query history and aggregated stats
│   │   │   │   │   └── user.ts       # API key management
│   │   │   │   ├── root.ts    # tRPC root router
│   │   │   │   └── trpc.ts    # tRPC context and middleware
│   │   │   ├── auth/          # NextAuth configuration (Discord provider)
│   │   │   └── db.ts          # Prisma client
│   │   ├── trpc/              # tRPC client helpers (React hooks + server-side)
│   │   └── env.js             # Environment variable validation (Zod)
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (User, Query, Account, Session)
│   └── package.json
└── squeeze/                   # (Empty — contains only package-lock.json)
```

## Setup

### Prerequisites

- Node.js and npm
- Python 3 and pip
- PostgreSQL database
- Discord OAuth application (for authentication)
- API key for [The Token Company](https://thetokencompany.com/) (for TokenC compression)

### Server

```bash
cd server
pip install -r requirements.txt
export TTC_API_KEY="your-token-company-api-key"
python server.py  # Runs on port 5001
```

### Website

```bash
cd website
npm install
cp .env.example .env
# Fill in .env with your credentials:
#   AUTH_SECRET, AUTH_DISCORD_ID, AUTH_DISCORD_SECRET,
#   DATABASE_URL, SERVER_URL (e.g., http://localhost:5001)
npx prisma db push
npm run dev  # Runs on port 3000
```

### Extension

```bash
cd extension
npm install
npm run compile
```

Open the `extension/` folder in VS Code and press `F5` to launch the extension in a development host. Configure the `squeeze.backendUrl` setting to point to the website (default: `http://localhost:3000`) and set `squeeze.apiKey` to an API key generated from the website's account page.

## Compression Schemes

| Scheme | Provider | Key Parameters |
|--------|----------|----------------|
| **TokenC** | [The Token Company](https://thetokencompany.com/) | `aggressiveness` (0–1), `minTokens`, `maxTokens` |
| **LLMLingua** | [Microsoft LLMLingua](https://github.com/microsoft/LLMLingua) | `rate` (0–1, compression ratio) |

## Background

### Inspiration

Programmers use AI-powered IDEs like Trae, Cursor, Claude Code, and Visual Studio Code to speed up their development workflows. However, they often don't pay attention to the exact prompt being sent to these tools. This can lead to unoptimized queries and significantly higher input token costs. Our goal was to build a tool to help solve this problem by providing an easy-to-use mechanism for developers to optimize their queries, directly from their IDE of choice.

### Challenges

We initially tried to intercept requests to Copilot and other AI agents and compress everything. However, the APIs for this don't exist and trying to intercept requests mid-flight proved problematic. We pivoted to optimizing input prompts with a custom sidebar and adding more features to the website. We also ran into challenges integrating the extension, website, and compression server together but resolved them by defining concrete API implementations.

### What's Next

Right now, our main focus is token compression. However, there are other ways of modifying queries to better prompt LLMs. Some ideas include adding XML tags or other kinds of structure and switching the language before sending prompts. Given more time, we would add these additional optimization schemes to provide more optionality for the end user.
