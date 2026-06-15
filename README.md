# Catan Tracker

Web app for tracking Catan games, winners, and per-group leaderboards. Each group is gated by a password; anyone with the password can add players and log games for that group.

## Stack

- Next.js 15 (App Router, React 19, TypeScript)
- SQLite via `better-sqlite3` (file at `./data/catan.db`)
- Password hashing with `bcryptjs`
- Session cookies via `iron-session`
- Tailwind CSS

## Setup

```bash
cp .env.local.example .env.local
# edit SESSION_SECRET to a long random string (>= 32 chars)

npm install
npm run dev
```

Open http://localhost:3000.

## Features

- Create groups with their own password
- Add players per group
- Log games: pick players, pick winner, choose variant + date
- Leaderboards: most wins, most games, win rate
- Game history with variant + date

## Data

SQLite file lives at `./data/catan.db`. Back it up or delete it to reset.
