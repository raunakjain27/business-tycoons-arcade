-- ==============================================================================
-- CORNERSTONE ARCADE & MINI-GAMES PRODUCTION DATABASE SCHEMA
-- Target: PostgreSQL 15+ / Supabase / Neon / AWS Aurora Serverless
-- Focus: Strict Anonymity (Zero PII), Ephemeral Rooms, Session Nonces & Audit Logs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ANONYMOUS USERS (NO PII, ZERO TRACKING)
-- ------------------------------------------------------------------------------
-- Users authenticate with a client-generated or server-issued ephemeral token.
-- No emails, no real names, no IP addresses stored.
CREATE TABLE IF NOT EXISTS anonymous_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of anonymous session token
    handle VARCHAR(32) NOT NULL,                    -- Display moniker (e.g. "ShadowPhantom#4821")
    avatar_id VARCHAR(64) NOT NULL DEFAULT 'ninja', -- ID of chosen visual persona
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_vip BOOLEAN NOT NULL DEFAULT FALSE,          -- Unlock 18+ boards, custom names, custom pegs
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_anon_users_token_hash ON anonymous_users (session_token_hash);

-- ------------------------------------------------------------------------------
-- 2. GAME ROOMS & SESSIONS
-- ------------------------------------------------------------------------------
-- Tracks game rooms across Cornerstone, Uno, Ludo, Traitors, Snakes & Ladders, Sequence
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(8) NOT NULL UNIQUE,           -- e.g. "TR89X1", "SQ409A"
    game_type VARCHAR(32) NOT NULL,                 -- 'cornerstone', 'uno', 'ludo', 'traitors', 'snakes', 'sequence', 'word'
    host_user_id UUID REFERENCES anonymous_users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'lobby',    -- 'lobby', 'in_progress', 'completed', 'abandoned'
    max_players INT NOT NULL DEFAULT 8,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    allow_bots BOOLEAN NOT NULL DEFAULT FALSE,
    voice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    voice_room_token VARCHAR(128),                  -- Ephemeral LiveKit / WebRTC room ID
    game_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Custom board settings, cash, timers, 18+ mode
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms (status);

-- ------------------------------------------------------------------------------
-- 3. ROOM PARTICIPANTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES anonymous_users(id) ON DELETE CASCADE,
    seat_index INT NOT NULL,
    player_name VARCHAR(32) NOT NULL,
    player_color VARCHAR(16) NOT NULL,
    player_peg VARCHAR(32) NOT NULL DEFAULT 'classic',
    is_bot BOOLEAN NOT NULL DEFAULT FALSE,
    is_connected BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(32),                               -- e.g. 'Traitor', 'Faithful' in Traitors
    score_or_cash BIGINT DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, seat_index)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants (room_id);

-- ------------------------------------------------------------------------------
-- 4. EPHEMERAL GAME AUDIT & ACTIONS LOG (FOR DISPUTE RESOLUTION & VERIFICATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    turn_index INT NOT NULL,
    player_name VARCHAR(32) NOT NULL,
    action_type VARCHAR(64) NOT NULL,               -- e.g. 'ROLL_DICE', 'SACRED_SHIELD', 'MURDER', 'BUY_PROPERTY'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_audit_room ON game_audit_logs (room_id, turn_index);

-- ------------------------------------------------------------------------------
-- 5. ANONYMOUS VIP PASS PURCHASES (CRYPTO / STRIPE PAYMENT INTENTS)
-- ------------------------------------------------------------------------------
-- Links one-time anonymous payments to unlock 18+ boards without storing credit cards
CREATE TABLE IF NOT EXISTS anonymous_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash VARCHAR(64) NOT NULL,
    item_type VARCHAR(32) NOT NULL,                 -- '18_plus_pack', 'custom_names_pass', 'animated_pegs_bundle'
    payment_provider VARCHAR(32) NOT NULL,          -- 'crypto_usdc', 'stripe_ephemeral'
    payment_reference VARCHAR(128) NOT NULL UNIQUE, -- Blockchain tx hash or Stripe payment intent ID
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_token ON anonymous_entitlements (session_token_hash);
