import { getDb } from './db';

export type Group = { id: number; name: string; created_at: string };
export type User = { id: number; username: string; created_at: string };
export type Player = {
  id: number;
  group_id: number;
  name: string;
  user_id: number | null;
};
export type Game = {
  id: number;
  group_id: number;
  winner_id: number;
  winner_name: string;
  variant: string;
  played_at: string;
  players: { id: number; name: string }[];
};
export type LeaderRow = {
  player_id: number;
  name: string;
  games_played: number;
  wins: number;
  win_rate: number;
};

export function listGroups(): Group[] {
  return getDb()
    .prepare('SELECT id, name, created_at FROM groups ORDER BY name COLLATE NOCASE')
    .all() as Group[];
}

export function getGroup(id: number): Group | undefined {
  return getDb()
    .prepare('SELECT id, name, created_at FROM groups WHERE id = ?')
    .get(id) as Group | undefined;
}

export function getGroupWithHash(
  id: number,
): (Group & { password_hash: string }) | undefined {
  return getDb()
    .prepare('SELECT id, name, created_at, password_hash FROM groups WHERE id = ?')
    .get(id) as (Group & { password_hash: string }) | undefined;
}

export function createGroup(name: string, passwordHash: string): Group {
  const info = getDb()
    .prepare('INSERT INTO groups (name, password_hash) VALUES (?, ?)')
    .run(name, passwordHash);
  return getGroup(Number(info.lastInsertRowid))!;
}

export function listPlayers(groupId: number): Player[] {
  return getDb()
    .prepare(
      'SELECT id, group_id, name, user_id FROM players WHERE group_id = ? ORDER BY name COLLATE NOCASE',
    )
    .all(groupId) as Player[];
}

export function createPlayer(groupId: number, name: string): Player {
  const info = getDb()
    .prepare('INSERT INTO players (group_id, name) VALUES (?, ?)')
    .run(groupId, name);
  return getDb()
    .prepare('SELECT id, group_id, name, user_id FROM players WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as Player;
}

export function createGame(opts: {
  groupId: number;
  winnerId: number;
  playerIds: number[];
  variant: string;
  playedAt: string;
}): number {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO games (group_id, winner_id, variant, played_at) VALUES (?, ?, ?, ?)',
      )
      .run(opts.groupId, opts.winnerId, opts.variant, opts.playedAt);
    const gameId = Number(info.lastInsertRowid);
    const stmt = db.prepare(
      'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)',
    );
    for (const pid of opts.playerIds) stmt.run(gameId, pid);
    return gameId;
  });
  return tx();
}

export function listGames(groupId: number, limit = 100): Game[] {
  const db = getDb();
  const games = db
    .prepare(
      `SELECT g.id, g.group_id, g.winner_id, g.variant, g.played_at, p.name AS winner_name
       FROM games g
       JOIN players p ON p.id = g.winner_id
       WHERE g.group_id = ?
       ORDER BY g.played_at DESC, g.id DESC
       LIMIT ?`,
    )
    .all(groupId, limit) as Omit<Game, 'players'>[];

  const playerStmt = db.prepare(
    `SELECT p.id, p.name FROM game_players gp
     JOIN players p ON p.id = gp.player_id
     WHERE gp.game_id = ?
     ORDER BY p.name COLLATE NOCASE`,
  );
  return games.map((g) => ({
    ...g,
    players: playerStmt.all(g.id) as { id: number; name: string }[],
  }));
}

export function leaderboard(groupId: number): LeaderRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
         p.id AS player_id,
         p.name,
         COUNT(DISTINCT gp.game_id) AS games_played,
         COALESCE(SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END), 0) AS wins
       FROM players p
       LEFT JOIN game_players gp ON gp.player_id = p.id
       LEFT JOIN games g ON g.id = gp.game_id
       WHERE p.group_id = ?
       GROUP BY p.id
       ORDER BY wins DESC, games_played DESC, p.name COLLATE NOCASE`,
    )
    .all(groupId) as Omit<LeaderRow, 'win_rate'>[];

  return rows.map((r) => ({
    ...r,
    win_rate: r.games_played > 0 ? r.wins / r.games_played : 0,
  }));
}

export function createUser(username: string, passwordHash: string): User {
  const info = getDb()
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return getUser(Number(info.lastInsertRowid))!;
}

export function getUser(id: number): User | undefined {
  return getDb()
    .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
    .get(id) as User | undefined;
}

export function getUserWithHash(
  username: string,
): (User & { password_hash: string }) | undefined {
  return getDb()
    .prepare(
      'SELECT id, username, created_at, password_hash FROM users WHERE username = ? COLLATE NOCASE',
    )
    .get(username) as (User & { password_hash: string }) | undefined;
}

export function claimPlayer(playerId: number, userId: number) {
  getDb()
    .prepare('UPDATE players SET user_id = ? WHERE id = ? AND user_id IS NULL')
    .run(userId, playerId);
}

export function unclaimPlayer(playerId: number, userId: number) {
  getDb()
    .prepare('UPDATE players SET user_id = NULL WHERE id = ? AND user_id = ?')
    .run(playerId, userId);
}

export function findMyPlayer(groupId: number, userId: number): Player | undefined {
  return getDb()
    .prepare(
      'SELECT id, group_id, name, user_id FROM players WHERE group_id = ? AND user_id = ?',
    )
    .get(groupId, userId) as Player | undefined;
}

export function joinGroupAsUser(
  groupId: number,
  userId: number,
  username: string,
): Player {
  const db = getDb();
  const existing = findMyPlayer(groupId, userId);
  if (existing) return existing;

  const unclaimedSameName = db
    .prepare(
      'SELECT id, group_id, name, user_id FROM players WHERE group_id = ? AND name = ? AND user_id IS NULL',
    )
    .get(groupId, username) as Player | undefined;
  if (unclaimedSameName) {
    db.prepare('UPDATE players SET user_id = ? WHERE id = ?').run(
      userId,
      unclaimedSameName.id,
    );
    return { ...unclaimedSameName, user_id: userId };
  }

  let name = username;
  let suffix = 2;
  while (
    db
      .prepare('SELECT 1 FROM players WHERE group_id = ? AND name = ?')
      .get(groupId, name)
  ) {
    name = `${username} (${suffix++})`;
  }
  const info = db
    .prepare('INSERT INTO players (group_id, user_id, name) VALUES (?, ?, ?)')
    .run(groupId, userId, name);
  return {
    id: Number(info.lastInsertRowid),
    group_id: groupId,
    user_id: userId,
    name,
  };
}

export type GlobalLeaderRow = {
  user_id: number;
  username: string;
  groups_count: number;
  games_played: number;
  wins: number;
  win_rate: number;
};

export function globalLeaderboard(): GlobalLeaderRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
         u.id AS user_id,
         u.username,
         COUNT(DISTINCT p.group_id) AS groups_count,
         COUNT(DISTINCT gp.game_id) AS games_played,
         COALESCE(SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END), 0) AS wins
       FROM users u
       JOIN players p ON p.user_id = u.id
       LEFT JOIN game_players gp ON gp.player_id = p.id
       LEFT JOIN games g ON g.id = gp.game_id
       GROUP BY u.id
       ORDER BY wins DESC, games_played DESC, u.username COLLATE NOCASE`,
    )
    .all() as Omit<GlobalLeaderRow, 'win_rate'>[];

  return rows.map((r) => ({
    ...r,
    win_rate: r.games_played > 0 ? r.wins / r.games_played : 0,
  }));
}

export function listGroupsForUser(userId: number): Group[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT gr.id, gr.name, gr.created_at
       FROM groups gr
       JOIN players p ON p.group_id = gr.id
       WHERE p.user_id = ?
       ORDER BY gr.name COLLATE NOCASE`,
    )
    .all(userId) as Group[];
}

export function getPlayer(id: number): Player | undefined {
  return getDb()
    .prepare('SELECT id, group_id, name, user_id FROM players WHERE id = ?')
    .get(id) as Player | undefined;
}

export type PersonalStats = {
  total_games: number;
  total_wins: number;
  win_rate: number;
  per_group: {
    group_id: number;
    group_name: string;
    player_name: string;
    games_played: number;
    wins: number;
    win_rate: number;
  }[];
  per_variant: {
    variant: string;
    games_played: number;
    wins: number;
    win_rate: number;
  }[];
};

export function personalStats(userId: number): PersonalStats {
  const db = getDb();
  const perGroup = db
    .prepare(
      `SELECT
         gr.id AS group_id,
         gr.name AS group_name,
         p.name AS player_name,
         COUNT(DISTINCT gp.game_id) AS games_played,
         COALESCE(SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END), 0) AS wins
       FROM players p
       JOIN groups gr ON gr.id = p.group_id
       LEFT JOIN game_players gp ON gp.player_id = p.id
       LEFT JOIN games g ON g.id = gp.game_id
       WHERE p.user_id = ?
       GROUP BY gr.id
       ORDER BY wins DESC, games_played DESC, gr.name COLLATE NOCASE`,
    )
    .all(userId) as {
    group_id: number;
    group_name: string;
    player_name: string;
    games_played: number;
    wins: number;
  }[];

  const perVariant = db
    .prepare(
      `SELECT
         g.variant,
         COUNT(DISTINCT g.id) AS games_played,
         COALESCE(SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END), 0) AS wins
       FROM players p
       JOIN game_players gp ON gp.player_id = p.id
       JOIN games g ON g.id = gp.game_id
       WHERE p.user_id = ?
       GROUP BY g.variant
       ORDER BY games_played DESC`,
    )
    .all(userId) as { variant: string; games_played: number; wins: number }[];

  const total_games = perGroup.reduce((s, r) => s + r.games_played, 0);
  const total_wins = perGroup.reduce((s, r) => s + r.wins, 0);

  return {
    total_games,
    total_wins,
    win_rate: total_games > 0 ? total_wins / total_games : 0,
    per_group: perGroup.map((r) => ({
      ...r,
      win_rate: r.games_played > 0 ? r.wins / r.games_played : 0,
    })),
    per_variant: perVariant.map((r) => ({
      ...r,
      win_rate: r.games_played > 0 ? r.wins / r.games_played : 0,
    })),
  };
}
