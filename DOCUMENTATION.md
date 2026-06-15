# Catan Tracker — Documentation

A web application for tracking Catan games per group, with password-gated access and per-group leaderboards.

---

## 1. Overview

Catan Tracker lets a group of friends:

- Create a private group protected by a shared password.
- Maintain a roster of players within that group.
- Log games (who played, who won, which variant, when).
- View leaderboards: most wins, most games played, and win rate.
- Browse a history of recent games.

Each "group" is isolated — its players, games, and stats are only visible to anyone who enters the group's password.

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Single deployable app, server-rendered pages + API routes |
| Language | TypeScript (strict) | Type safety across server and client |
| UI | React 19 + Tailwind CSS | Component model with utility-first styling |
| Database | SQLite via `better-sqlite3` | Zero-config persistence, single file at `./data/catan.db` |
| Auth | `bcryptjs` + `iron-session` cookies | Hashed passwords + encrypted session cookies for group access |
| Build target | Node runtime | Required for `better-sqlite3` native module |

---

## 3. Project Structure

```
catan/
├── data/                        # SQLite database file (gitignored)
│   └── catan.db                 # auto-created on first run
├── src/
│   ├── lib/
│   │   ├── db.ts                # SQLite connection + schema migrations
│   │   ├── queries.ts           # All DB read/write operations
│   │   └── session.ts           # iron-session config + access helpers
│   └── app/
│       ├── layout.tsx           # Root layout, header, theming
│       ├── globals.css          # Tailwind + Catan-themed CSS
│       ├── page.tsx             # Home: list & create groups
│       ├── CreateGroupForm.tsx  # Client form for new groups
│       ├── groups/[id]/
│       │   ├── page.tsx         # Group entry (gate OR dashboard)
│       │   ├── PasswordGate.tsx # Password entry form
│       │   └── Dashboard.tsx    # Tabbed dashboard
│       └── api/
│           └── groups/
│               ├── route.ts                       # POST create, GET list
│               └── [id]/
│                   ├── login/route.ts             # POST verify pw, DELETE leave
│                   ├── players/route.ts           # GET list, POST add
│                   ├── games/route.ts             # GET list, POST log
│                   └── leaderboard/route.ts       # GET stats
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .gitignore
├── .env.local.example
└── README.md
```

---

## 4. Data Model

Defined in `src/lib/db.ts`. All tables use `INTEGER PRIMARY KEY AUTOINCREMENT` and foreign keys with `ON DELETE CASCADE`.

### `groups`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `name` | TEXT | UNIQUE, 2–60 chars |
| `password_hash` | TEXT | bcrypt hash (10 rounds) |
| `created_at` | TEXT | ISO timestamp |

### `players`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `group_id` | INTEGER FK → groups | cascade delete |
| `name` | TEXT | UNIQUE per group, 1–40 chars |
| `created_at` | TEXT | ISO timestamp |

### `games`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `group_id` | INTEGER FK → groups | cascade delete |
| `winner_id` | INTEGER FK → players | cascade delete |
| `variant` | TEXT | one of: Base, Seafarers, Cities & Knights, Traders & Barbarians, Explorers & Pirates, Other |
| `played_at` | TEXT | ISO timestamp |
| `created_at` | TEXT | ISO timestamp |

### `game_players`
Join table mapping which players participated in each game.

| Column | Type | Notes |
|--------|------|-------|
| `game_id` | INTEGER FK → games | cascade delete |
| `player_id` | INTEGER FK → players | cascade delete |
| Primary key | (game_id, player_id) | |

### Indexes
- `idx_games_group` on `games(group_id)`
- `idx_players_group` on `players(group_id)`

---

## 5. Authentication & Access Control

### Password storage
Group passwords are hashed with **bcrypt** (10 rounds) on group creation. The plaintext password is never stored or logged.

### Session model
Implemented in `src/lib/session.ts`. An `iron-session` encrypted cookie holds:

```ts
type SessionData = {
  groupAccess?: number[]; // list of unlocked group IDs
};
```

- Cookie name: `catan_session`
- `httpOnly`, `sameSite: 'lax'`, `secure` in production
- 30-day max age
- Encryption key from `SESSION_SECRET` env var (≥ 32 chars enforced at startup)

### Access flow
1. User opens `/groups/[id]`.
2. Server checks `hasGroupAccess(id)`. If yes → render dashboard. If no → render password gate.
3. User submits password to `POST /api/groups/[id]/login`.
4. Server compares bcrypt hash; on success calls `grantGroupAccess(id)` which adds the ID to the session and saves the cookie.
5. Page refreshes and now renders the dashboard.

Creating a group automatically grants the creator access to that group.

`DELETE /api/groups/[id]/login` revokes access (called by the "Leave group" button).

### Guard helper
Every protected API route (`players`, `games`, `leaderboard`) calls a `guard()` helper that verifies:
- ID is numeric
- Group exists
- Session has access to that group

On failure it returns `400`, `404`, or `403` respectively.

---

## 6. API Reference

All responses are JSON. Mutations require an active session with access to the target group.

### `GET /api/groups`
List all groups. Public — only returns `id`, `name`, `created_at`.

### `POST /api/groups`
Create a new group.
```json
{ "name": "Friday Night Settlers", "password": "atleast4" }
```
- `201` → returns new group, grants session access.
- `400` invalid input, `409` name taken.

### `POST /api/groups/[id]/login`
Verify password and unlock the group for this session.
```json
{ "password": "..." }
```
- `200 { ok: true }` on success.
- `401` wrong password, `404` group not found.

### `DELETE /api/groups/[id]/login`
Revoke this session's access to the group.

### `GET /api/groups/[id]/players`
List players in the group (requires access).

### `POST /api/groups/[id]/players`
Add a player.
```json
{ "name": "Alice" }
```
- `409` if name already exists in group.

### `GET /api/groups/[id]/games`
List most recent 100 games. Each entry includes winner name and the participating players.

### `POST /api/groups/[id]/games`
Log a game.
```json
{
  "playerIds": [1, 2, 3],
  "winnerId": 2,
  "variant": "Base",
  "playedAt": "2026-06-13T20:00:00.000Z"
}
```
Validation:
- ≥ 2 distinct players required.
- `winnerId` must be in `playerIds`.
- All `playerIds` must belong to this group.
- `variant` falls back to `"Base"` if not in the allowed set.
- `playedAt` falls back to `now()` if missing/invalid.

Insert is wrapped in a SQLite transaction.

### `GET /api/groups/[id]/leaderboard`
Returns one row per player in the group:
```ts
{
  player_id: number;
  name: string;
  games_played: number;
  wins: number;
  win_rate: number; // 0..1, 0 when games_played === 0
}
```
Win rate is computed in JS from the SQL aggregates so divide-by-zero is handled safely.

---

## 7. UI

### Home (`/`)
Two-column layout:
- **Left:** list of existing groups, each linking to `/groups/[id]`.
- **Right:** form to create a new group (name + password).

### Group page (`/groups/[id]`)
- If session lacks access → **Password Gate** (single password input).
- If session has access → **Dashboard** with four tabs.

### Dashboard tabs

1. **Leaderboard** — three cards side-by-side:
   - Most wins (sorted by wins desc, then games desc)
   - Most games (sorted by games desc)
   - Win rate (players with ≥ 1 game, sorted by WR desc, then wins desc)
   - Top 10 in each. Rank badges colored gold / silver / brick for top 3.
2. **Log game** — pick participating players (toggle chips), pick winner from those selected, choose variant + datetime, submit. Includes a quick-add-player form alongside.
3. **History** — reverse-chronological list of games with winner highlighted, full roster, date, and variant.
4. **Players** — full roster grid + add-player form.

All data is refetched in parallel (`Promise.all`) after any mutation.

### Theme
Catan-inspired palette defined in `tailwind.config.ts`:
- `sand`, `wheat`, `wood`, `brick`, `sheep`, `ore`, `ocean`, `parchment`, `ink`

`globals.css` provides:
- Parchment background with subtle radial gradients
- `.hex` clip-path for hex tile motifs
- `.card`, `.btn`, `.input`, `.label`, `.select` component classes

---

## 8. Setup & Run

### Prerequisites
- Node.js 20+ (for native `better-sqlite3` build)

### Install
```bash
cd catan
cp .env.local.example .env.local
# edit SESSION_SECRET to a long random string (≥ 32 chars)
npm install
```

### Develop
```bash
npm run dev
```
Open http://localhost:3000.

### Production build
```bash
npm run build
npm start
```

### Environment variables
| Var | Required | Notes |
|-----|----------|-------|
| `SESSION_SECRET` | yes | ≥ 32 chars, used to encrypt session cookies |
| `NODE_ENV` | auto | enables `secure` cookies in production |

### Database
- File: `./data/catan.db`
- Auto-created on first request; schema applied idempotently via `CREATE TABLE IF NOT EXISTS`.
- WAL mode enabled for better concurrent reads.
- Reset: stop the server, delete `data/catan.db*`.

---

## 9. Design Decisions

- **SQLite over Postgres:** the app is small, single-tenant per deployment, and SQLite removes infra overhead. Easy to back up (`cp data/catan.db backup.db`).
- **One process = one DB connection** via a `globalThis` cache so Next.js hot reload doesn't leak connections.
- **Per-group password instead of user accounts:** matches the "group of friends" use case; no signup friction.
- **Session stores an array of unlocked group IDs:** a single user can unlock multiple groups in one browser without logging out.
- **Server components fetch initial data**; client components manage interactivity and refresh via fetch. Avoids overfetching while keeping the dashboard reactive.
- **Variant whitelist on the server** so the client can't smuggle arbitrary strings.
- **Game insert in a transaction** so a partial write can't leave a game without its participants.

---

## 10. Known Limitations / Future Work

- No editing or deletion of games or players yet (recent-game undo would be a useful addition).
- No per-player victory points / scores (intentionally omitted per setup choices).
- No CSV export.
- No rate limiting on login or group-creation endpoints — fine for a small private deployment, worth adding before exposing publicly.
- `npm audit` reports 2 moderate transitive vulnerabilities; review before public deploy.
- No automated tests yet — the project's coding-style rules call for ≥ 80% coverage if this graduates beyond a prototype.

---

## 11. File Index (Quick Reference)

| Concern | File |
|---------|------|
| Schema | `src/lib/db.ts` |
| All queries | `src/lib/queries.ts` |
| Session + access control | `src/lib/session.ts` |
| Group create / list API | `src/app/api/groups/route.ts` |
| Login API | `src/app/api/groups/[id]/login/route.ts` |
| Players API | `src/app/api/groups/[id]/players/route.ts` |
| Games API | `src/app/api/groups/[id]/games/route.ts` |
| Leaderboard API | `src/app/api/groups/[id]/leaderboard/route.ts` |
| Home page | `src/app/page.tsx` |
| Group gate / dashboard router | `src/app/groups/[id]/page.tsx` |
| Password gate | `src/app/groups/[id]/PasswordGate.tsx` |
| Dashboard UI | `src/app/groups/[id]/Dashboard.tsx` |
| Theme tokens | `tailwind.config.ts` |
| Global styles | `src/app/globals.css` |
