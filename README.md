# Corruptópolis

A meme-driven hyperpolitical hex-grid simulation. Twelve epochs to flip the
narrative against the Collaborative Corruption Matrix.

This codebase is the **refactor** of the original single-file `index.html`
prototype (kept in the repo for reference) into a modern stack:

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 3.4** + **Radix UI** primitives (shadcn-style)
- **Zustand** for game state
- **Supabase** for auth + Postgres (anonymous play out of the box, optional
  email/password upgrade that preserves match history via `linkIdentity`)
- **Server-side proxies** for Gemini and ElevenLabs (TTS/STT) — keys never
  touch the browser; deprecated `gemini-1.5-flash` was replaced with
  `gemini-2.5-flash`, which is what fixes the historical 404
- A structured **logger** with key redaction (console-first logging)

## Quick start

You will run these commands yourself (per repo conventions the agent does
not execute commands):

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys (see "Environment" below)
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

The app will be at <http://localhost:3000>. Without any keys, the game
still runs locally; everything that needs Supabase/Gemini/ElevenLabs will
gracefully degrade and tell you what is missing.

## Environment

All variables live in `.env.local`. None are committed. The agent will
**not** read or write `.env*` files; consult `.env.example` for the
authoritative list. Minimum to get every feature working:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional; only needed if you later enable DB-backed `api_logs` |
| `GEMINI_API_KEY` | Server-side Gemini key (defaults model to `gemini-2.5-flash`) |
| `GEMINI_MODEL` | Optional override |
| `ELEVENLABS_API_KEY` | Server-side ElevenLabs key (TTS + STT) |
| `ELEVENLABS_VOICE_ID` | Optional override (defaults to Adam) |
| `NEXT_PUBLIC_SITE_URL` | Used for OAuth callbacks |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (defaults to `info`) |

Anonymous players can also paste their own API keys into the briefing
modal or the Settings drawer — those keys are kept only in `localStorage`
and forwarded to the server proxy on each request, where they take
precedence over the server env keys for unauthenticated users.

Logged-in users can store **per-account** keys on `/profile` (encrypted
columns on the `profiles` table); those win over both server env and
local-storage keys.

## Supabase setup

In the Supabase SQL editor, run these scripts manually.

### Recommended (single file bootstrap)

Run:

1. `supabase/004_full_bootstrap.sql` — full idempotent setup (`schema + RLS + trigger + view + grants`)

This is safe to run on a clean project and also safe to re-run on an
already initialized project.

### Legacy (split files, still supported)

If you prefer the split setup, run these **in order**:

1. `supabase/001_schema.sql` — `profiles`, `matches`, `feedback`, `api_logs`
2. `supabase/002_rls_policies.sql` — RLS for anonymous + authenticated users
3. `supabase/003_triggers.sql` — `handle_new_user` trigger + `profile_stats` view

Then in **Authentication → Providers**, enable **Anonymous sign-ins** so
every player automatically gets a `user_id` (and therefore a saveable
match history) without filling out a form.

If you later need to drop and re-apply with legacy files, run them in
reverse order (triggers → policies → schema) or just reset the public
schema in a non-prod project.

The localhost/development fallback remains intentionally intact: when
Supabase env vars are missing or invalid, gameplay still runs locally and
storage-dependent features degrade gracefully instead of crashing.

### Manual validation checklist

After running SQL in Supabase:

1. **Clean project**: execute `supabase/004_full_bootstrap.sql` once and verify tables, policies, trigger, and `profile_stats` view exist.
2. **Existing project**: execute `supabase/004_full_bootstrap.sql` again and confirm it completes without destructive side effects.
3. **Anonymous auth**: sign in anonymously and verify a `profiles` row is auto-created for the new user.
4. **Match persistence**: finish a run and verify `/api/matches` inserts a row in `matches` for that user.
5. **Feedback persistence**: submit feedback and verify insert in `feedback`.
6. **Local backup behavior**: run app without Supabase env vars and confirm core gameplay still works while persistence features fail gracefully.

## Project layout

```
juego-de-la-vida/
├── index.html                   ← original monolithic prototype (kept for reference)
├── package.json, tsconfig.json, next.config.ts, tailwind.config.ts
├── .env.example                 ← copy → .env.local
├── supabase/
│   ├── 001_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_triggers.sql
│   └── 004_full_bootstrap.sql
├── src/
│   ├── middleware.ts            ← Supabase session refresh
│   ├── app/
│   │   ├── layout.tsx           ← <html>, FeedbackButton mount
│   │   ├── page.tsx             ← <GameFrame />
│   │   ├── globals.css          ← CSS variable theme system + Tailwind
│   │   ├── (auth)/{login,signup}/page.tsx
│   │   ├── auth/callback/route.ts
│   │   ├── profile/{page,actions,ProfileForm}.tsx
│   │   └── api/
│   │       ├── gemini/route.ts          ← gemini-2.5-flash proxy
│   │       ├── eleven/{tts,stt}/route.ts
│   │       ├── matches/route.ts
│   │       └── feedback/route.ts
│   ├── components/
│   │   ├── game/                ← HexGrid · Hud · ActionQueue · MemeSelector ·
│   │   │                           CommunicationPanel · VoicePanel · BriefingModal ·
│   │   │                           ResultOverlay · SettingsDrawer · GameFrame
│   │   ├── auth/UserMenu.tsx
│   │   ├── feedback/FeedbackButton.tsx
│   │   └── theme/ThemeToggle.tsx
│   ├── game/                    ← PURE LOGIC — no React, no DOM
│   │   ├── constants.ts · types.ts · elements.ts · audio.ts
│   │   ├── grid.ts · propagation.ts
│   │   └── store.ts             ← Zustand
│   ├── lib/
│   │   ├── supabase/{client,server,middleware,types}.ts
│   │   ├── gemini.ts · eleven.ts
│   │   ├── api-keys.ts          ← profile → client → server resolution
│   │   ├── api-log.ts           ← currently no-op (console-only logs)
│   │   ├── logger.ts            ← redacted, leveled, tagged
│   │   ├── env.ts               ← zod-validated
│   │   ├── local-keys.ts        ← BYO keys in localStorage
│   │   ├── speech.ts            ← TTS/STT client helpers
│   │   └── utils.ts
│   └── hooks/{useUser,useTheme}.ts
└── README.md
```

## How API keys are resolved

For each call to `/api/gemini`, `/api/eleven/tts` and `/api/eleven/stt`,
`src/lib/api-keys.ts` picks the first available key in this order:

1. **Profile key** (logged-in user with a key saved on `/profile`)
2. **Client key** (anonymous user passing a key from `localStorage`)
3. **Server env key** (`process.env.GEMINI_API_KEY`,
   `ELEVENLABS_API_KEY`)

If none exists, the route returns a `503` with a helpful error message
(no silent failures — that was the source of the original Gemini 404
debugging pain).

## Logging

Every API route issues a `requestId` and logs:

- A one-line JSON entry to `console` (Vercel / your terminal captures it)
- A one-line JSON entry to `console` (server-side) for each API request
- `api_logs` table writes are intentionally disabled for now

The logger redacts anything that looks like an API key
(`AIza…`, `sk_…`, `Bearer …`, etc.) before emitting.

In the browser, set `localStorage.debug = '1'` to see `debug`-level
client logs (off by default).

## Match history

When the campaign ends, `ResultOverlay` posts to `/api/matches`, which
inserts into `matches` for the current `auth.uid()` — anonymous users
qualify because Supabase's anonymous sign-in still issues a real user.
The `/profile` page reads back the last 50 matches plus W/L stats from
the `profile_stats` view.

## Gamification docs

- Detailed progression rules (nerfs, 12-win completion, credits, loadout):
  - `docs/gamification-2026-04-27.md`

## Feedback

The floating bottom-right button (mounted once in `app/layout.tsx`)
opens a Radix dialog. Submissions go to `/api/feedback` → `feedback`
table. Anonymous + authenticated alike can submit; only the owner can
read their own (per RLS).

## Out of scope (for now)

- Multiplayer / leaderboards
- Deterministic seeded RNG (the prototype's RNG semantics are preserved)
- An admin viewer for `api_logs` (if you re-enable DB log inserts later)

## Scripts

```bash
npm run dev         # dev server (Turbopack)
npm run build       # production build
npm run start       # start the production server
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

## Deploy on Vercel

Set the same env vars from `.env.local` in your Vercel project settings,
especially `NEXT_PUBLIC_SITE_URL` with your production URL
(for example `https://your-app.vercel.app` or your custom domain). This is
used for auth confirmation callbacks so users land back on `/profile`
correctly after signup.
