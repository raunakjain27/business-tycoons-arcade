import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface PersistedUser {
  id: string;
  sessionTokenHash: string;
  handle: string;
  avatarId: string;
  coins: number;
  xp: number;
  level: number;
  dailyStreak: number;
  gamesWon: number;
  isVip: boolean;
  unlockedBoards: string[];
  unlockedPegs: string[];
  unlockedSoundPacks: string[];
  activeSoundPack: string;
  unlockedCelebrations: string[];
  activeCelebration: string;
  friendNames: string[];
  trophies: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogEntry {
  id: string;
  roomId: string;
  turnIndex: number;
  playerName: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface RoomMeta {
  roomId: string;
  roomCode: string;
  gameType: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'in_progress' | 'completed';
  createdAt: number;
  updatedAt: number;
}

interface DatabaseState {
  users: Record<string, PersistedUser>;
  auditLogs: AuditLogEntry[];
  rooms: Record<string, RoomMeta>;
}

export class ArcadeDatabase {
  private filePath: string;
  private state: DatabaseState;
  private saveTimeout: NodeJS.Timeout | null = null;
  private supabaseUrl = process.env.SUPABASE_URL || '';
  private supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  constructor() {
    this.filePath = path.resolve(process.cwd(), '.arcade_database.json');
    this.state = this.loadState();
    if (this.supabaseUrl && this.supabaseKey) {
      console.log('⚡ Supabase Cloud Persistence detected and active!');
    }
  }

  private async syncToSupabase(user: PersistedUser): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseKey) return;
    try {
      await fetch(`${this.supabaseUrl}/rest/v1/anonymous_users`, {
        method: 'POST',
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          session_token_hash: user.sessionTokenHash,
          handle: user.handle,
          avatar_id: user.avatarId,
          is_vip: user.isVip,
          settings_json: {
            coins: user.coins,
            xp: user.xp,
            level: user.level,
            dailyStreak: user.dailyStreak,
            gamesWon: user.gamesWon,
            unlockedBoards: user.unlockedBoards,
            unlockedPegs: user.unlockedPegs,
            friendNames: user.friendNames,
            trophies: user.trophies,
          },
          last_active_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[SUPABASE SYNC WARNING]', err);
    }
  }

  private loadState(): DatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not load database file, initializing empty state:', err);
    }

    return {
      users: {
        'usr_shark': {
          id: 'usr_shark',
          sessionTokenHash: 'bot_shark_hash',
          handle: 'Victor Shark',
          avatarId: '🦈',
          coins: 14500,
          xp: 4200,
          level: 18,
          dailyStreak: 14,
          gamesWon: 34,
          isVip: true,
          unlockedBoards: ['default', 'india', 'usa', 'afterdark'],
          unlockedPegs: ['shark', 'crown', 'diamond'],
          unlockedSoundPacks: ['arcade', 'cyberpunk'],
          activeSoundPack: 'arcade',
          unlockedCelebrations: ['confetti', 'fireworks'],
          activeCelebration: 'fireworks',
          friendNames: [],
          trophies: ['monopoly_king', 'auction_ace'],
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now(),
        },
        'usr_banker': {
          id: 'usr_banker',
          sessionTokenHash: 'bot_banker_hash',
          handle: 'Penny Banker',
          avatarId: '🏦',
          coins: 9800,
          xp: 3100,
          level: 14,
          dailyStreak: 9,
          gamesWon: 22,
          isVip: false,
          unlockedBoards: ['default', 'uk', 'mixed'],
          unlockedPegs: ['car', 'jet'],
          unlockedSoundPacks: ['arcade'],
          activeSoundPack: 'arcade',
          unlockedCelebrations: ['confetti'],
          activeCelebration: 'confetti',
          friendNames: [],
          trophies: ['quick_draw'],
          createdAt: Date.now() - 86400000 * 20,
          updatedAt: Date.now(),
        },
      },
      auditLogs: [],
      rooms: {},
    };
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.flushToDisk();
    }, 1000);
  }

  private flushToDisk() {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to flush database to disk:', err);
    }
  }

  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public syncUser(payload: Partial<PersistedUser> & { id: string }): PersistedUser {
    // Defensive: sanitize before merging even if the route already validated.
    const safe = this.sanitizeUserInput(payload);
    const existing = this.state.users[safe.id] || null;
    const now = Date.now();

    const merged: PersistedUser = {
      id: safe.id,
      sessionTokenHash: safe.sessionTokenHash || (existing ? existing.sessionTokenHash : this.hashToken(safe.id)),
      handle: safe.handle || existing?.handle || 'Player',
      avatarId: safe.avatarId || existing?.avatarId || '👑',
      // Anti-cheat: coins, XP, and achievements only ever increase or merge upward.
      coins: Math.max(safe.coins ?? 0, existing?.coins ?? 0),
      xp: Math.max(safe.xp ?? 0, existing?.xp ?? 0),
      level: Math.max(safe.level ?? 1, existing?.level ?? 1),
      dailyStreak: Math.max(safe.dailyStreak ?? 1, existing?.dailyStreak ?? 1),
      gamesWon: Math.max(safe.gamesWon ?? 0, existing?.gamesWon ?? 0),
      isVip: safe.isVip ?? existing?.isVip ?? false,
      unlockedBoards: Array.from(new Set([...(existing?.unlockedBoards || ['default']), ...(safe.unlockedBoards || [])])),
      unlockedPegs: Array.from(new Set([...(existing?.unlockedPegs || ['classic']), ...(safe.unlockedPegs || [])])),
      unlockedSoundPacks: Array.from(new Set([...(existing?.unlockedSoundPacks || ['arcade']), ...(safe.unlockedSoundPacks || [])])),
      activeSoundPack: safe.activeSoundPack || existing?.activeSoundPack || 'arcade',
      unlockedCelebrations: Array.from(new Set([...(existing?.unlockedCelebrations || ['confetti']), ...(safe.unlockedCelebrations || [])])),
      activeCelebration: safe.activeCelebration || existing?.activeCelebration || 'confetti',
      friendNames: safe.friendNames || existing?.friendNames || [],
      trophies: Array.from(new Set([...(existing?.trophies || []), ...(safe.trophies || [])])),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.state.users[safe.id] = merged;
    this.scheduleSave();
    this.syncToSupabase(merged).catch(() => {});
    return merged;
  }

  private sanitizeUserInput(
    payload: Partial<PersistedUser> & { id: string }
  ): Partial<PersistedUser> & { id: string } {
    const coerce = (val: unknown, fallback: string): string => {
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim().slice(0, 64);
      }
      return fallback;
    };

    const sanitizeStringArray = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length <= 64)
        .slice(0, 256);
    };

    return {
      id: coerce(payload.id, 'unknown'),
      handle: payload.handle != null ? coerce(payload.handle, 'Player') : undefined,
      avatarId: payload.avatarId != null ? coerce(payload.avatarId, '👑') : undefined,
      coins: typeof payload.coins === 'number' && Number.isFinite(payload.coins) && payload.coins >= 0
        ? Math.floor(payload.coins)
        : undefined,
      xp: typeof payload.xp === 'number' && Number.isFinite(payload.xp) && payload.xp >= 0
        ? Math.floor(payload.xp)
        : undefined,
      level: typeof payload.level === 'number' && Number.isFinite(payload.level) && payload.level >= 1 && payload.level <= 100
        ? Math.floor(payload.level)
        : undefined,
      dailyStreak: typeof payload.dailyStreak === 'number' && Number.isFinite(payload.dailyStreak) && payload.dailyStreak >= 0
        ? Math.floor(payload.dailyStreak)
        : undefined,
      gamesWon: typeof payload.gamesWon === 'number' && Number.isFinite(payload.gamesWon) && payload.gamesWon >= 0
        ? Math.floor(payload.gamesWon)
        : undefined,
      isVip: payload.isVip == null ? undefined : Boolean(payload.isVip),
      unlockedBoards: sanitizeStringArray(payload.unlockedBoards),
      unlockedPegs: sanitizeStringArray(payload.unlockedPegs),
      unlockedSoundPacks: sanitizeStringArray(payload.unlockedSoundPacks),
      activeSoundPack: payload.activeSoundPack != null ? coerce(payload.activeSoundPack, 'arcade') : undefined,
      unlockedCelebrations: sanitizeStringArray(payload.unlockedCelebrations),
      activeCelebration: payload.activeCelebration != null ? coerce(payload.activeCelebration, 'confetti') : undefined,
      friendNames: sanitizeStringArray(payload.friendNames),
      trophies: sanitizeStringArray(payload.trophies),
      sessionTokenHash: payload.sessionTokenHash != null ? coerce(payload.sessionTokenHash, '') : undefined,
    };
  }

  public getUser(idOrHash: string): PersistedUser | null {
    if (this.state.users[idOrHash]) {
      return this.state.users[idOrHash];
    }
    const found = Object.values(this.state.users).find(u => u.sessionTokenHash === idOrHash);
    return found || null;
  }

  public setUserCoins(idOrHash: string, coins: number): PersistedUser | null {
    const user = this.getUser(idOrHash);
    if (!user) return null;
    const merged = this.syncUser({ ...user, coins });
    return merged;
  }

  public incrementCoins(idOrHash: string, delta: number): PersistedUser | null {
    const user = this.getUser(idOrHash);
    if (!user) return null;
    const next = Math.max(0, user.coins + delta);
    return this.setUserCoins(user.id, next);
  }

  public getLeaderboard(limit = 10): {
    byCoins: PersistedUser[];
    byStreak: PersistedUser[];
    byWins: PersistedUser[];
  } {
    const allUsers = Object.values(this.state.users);

    const byCoins = [...allUsers]
      .sort((a, b) => b.coins - a.coins)
      .slice(0, limit);

    const byStreak = [...allUsers]
      .sort((a, b) => b.dailyStreak - a.dailyStreak)
      .slice(0, limit);

    const byWins = [...allUsers]
      .sort((a, b) => b.gamesWon - a.gamesWon)
      .slice(0, limit);

    return { byCoins, byStreak, byWins };
  }

  public recordAuditLog(log: Omit<AuditLogEntry, 'id' | 'createdAt'>): AuditLogEntry {
    const entry: AuditLogEntry = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    this.state.auditLogs.push(entry);
    // Keep max 1000 logs in memory
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs.splice(0, this.state.auditLogs.length - 1000);
    }
    this.scheduleSave();
    return entry;
  }

  public registerRoom(room: RoomMeta): void {
    this.state.rooms[room.roomId] = { ...room, updatedAt: Date.now() };
    this.scheduleSave();
  }

  public removeRoom(roomId: string): void {
    delete this.state.rooms[roomId];
    this.scheduleSave();
  }

  public getPublicRooms(): RoomMeta[] {
    return Object.values(this.state.rooms).filter(r => r.status !== 'completed');
  }
}

export const database = new ArcadeDatabase();
