# Squeeze Website

A full-stack Next.js web application built with the [T3 Stack](https://create.t3.gg/) (Next.js 15 + tRPC + Prisma). Provides user authentication, API key management, an interactive compression demo, and query history with token savings metrics.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org) (App Router)
- **API Layer:** [tRPC](https://trpc.io) (type-safe RPC)
- **Database:** PostgreSQL via [Prisma](https://prisma.io) ORM
- **Authentication:** [NextAuth v5](https://next-auth.js.org) with Discord OAuth
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/) components
- **Animations:** [Motion](https://motion.dev/)

## Database Schema

Defined in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| **User** | User profile with optional `apiKey` for extension auth |
| **Query** | Compression history record: `inputTokens`, `outputTokens`, `time` |
| **Account** | OAuth provider accounts (Discord) linked to User |
| **Session** | Active login sessions |

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Home page with animated hero and global compression stats |
| `/login` | No | Discord OAuth sign-in |
| `/account` | Yes | User profile, API key generation, query history table, and cost savings |
| `/demo` | Yes | Interactive compression demo with input/output panels |

## tRPC Routers

Located in `src/server/api/routers/`:

- **`transform.ts`** — Two endpoints for text compression:
  - `protectedCreate` — Authenticated via session; compresses text by forwarding to the Flask server, saves a `Query` record.
  - `publicCreate` — Authenticated via API key; same flow, used by the VS Code extension.
- **`query.ts`** — Query history and stats:
  - `getQueries` — Returns all queries for the logged-in user.
  - `getUserTotals` — Aggregated input/output token totals for the user.
  - `getTotals` — Global stats: total queries, total input/output tokens.
- **`user.ts`** — API key management:
  - `getApiKey` — Returns the user's API key.
  - `updateApiKey` — Generates a new UUID v4 API key.

## Components

Located in `src/components/`:

- **`navbar.tsx`** — Navigation bar with links and user menu
- **`hero.tsx`** — Animated landing page hero with global stats
- **`login-options.tsx`** — Discord sign-in button
- **`user-menu.tsx`** — Dropdown with account link and logout
- **`ui/`** — Radix UI wrappers: button, textarea, select, table, alert-dialog, dropdown-menu

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | NextAuth secret (generate with `npx auth secret`) |
| `AUTH_DISCORD_ID` | Discord OAuth application ID |
| `AUTH_DISCORD_SECRET` | Discord OAuth application secret |
| `DATABASE_URL` | PostgreSQL connection URL |
| `SERVER_URL` | URL of the Flask compression server (e.g., `http://localhost:5001`) |

## Development

```bash
npm install
cp .env.example .env    # Fill in credentials
npx prisma db push      # Create/update database tables
npm run dev             # Start dev server (port 3000)
```

Other commands:

```bash
npm run build           # Production build
npm run db:push         # Push schema changes
npm run db:studio       # Open Prisma Studio
npm run lint            # Run Biome linter
```
