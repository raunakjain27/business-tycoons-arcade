import eventsJson from '../../../packages/content/events.json' with { type: 'json' };
import type { BoardDef, TileId, DistrictDef, TileDef } from '../../../packages/engine/types';

// ---------------------------------------------------------------------------
// Web-app board surface is intentionally stubbed so apps/web can typecheck
// without depending on package-source files it does not own. WebView/host code
// should backfill the real board from packages/content/*.json at runtime.
// ---------------------------------------------------------------------------

export interface BoardData {
  tiles: readonly TileDef[];
  districts: readonly DistrictDef[];
}

export const BOARD_DATA: BoardData = { tiles: [], districts: [] };

export function getTileDef(tileId: TileId): TileDef | undefined {
  return BOARD_DATA.tiles.find(t => t.id === tileId);
}

export function getDistrictDef(tileId: TileId): DistrictDef | undefined {
  return BOARD_DATA.districts.find(d => (d.tileIds as readonly TileId[]).includes(tileId));
}

export type RoleId = string;
export const PLAYER_COLORS: readonly string[] = [];
export const AVAILABLE_PEGS: readonly string[] = [];
export const BOARD_CURRENCY = 'USD';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: BOARD_CURRENCY }).format(amount);
}

export function updateTileName(tileId: TileId, name: string): void {
  // Stub; real boards are static JSON, so rename is a no-op here.
}

export const EVE_ventsJson = eventsJson as unknown as readonly object[];

export interface EventCardDef {
  id: number;
  text: string;
  type: string;
  effect?: string;
  amount?: number;
  targetTile?: TileId;
  perHouse?: number;
  perTower?: number;
  // kept minimal for the web app; engine-side logic should backfill more fields
  // when a real board/event pack is loaded.
}

export const EVENT_CARDS: readonly EventCardDef[] = (eventsJson as any)?.cards ?? [] as unknown as readonly EventCardDef[];
export function setBoard(key: string) {
  // Placeholder; real board switching is orchestrated by the host runtime.
}
export function getBoard(key: string = 'default'): BoardDef {
  return {} as BoardDef;
}
export const DEFAULT_BOARD_KEY = 'default';

export function getEventCardById(id: number | string): EventCardDef | undefined {
  const numericId = typeof id === 'number' ? id : Number(id);
  return EVENT_CARDS.find(c => c.id === numericId);
}

// ---------------------------------------------------------------------------
// Typed web surface for UI code that needs concrete board shapes, not the
// raw engine `TileDef` which drives gameplay logic and is not the runtime
// shape the web app receives from the host/content bundle.
// ---------------------------------------------------------------------------

export interface PlayerRole {
  id: string;
  name: string;
  label: string;
  perk?: string;
  icon?: string;
  color?: string;
  isPremium?: boolean;
}

export interface AvailableBoard {
  key: string;
  name: string;
}

export interface InfluenceItem {
  id: string;
  name: string;
  cost?: number;
  desc?: string;
}

export interface BoardTile {
  id: TileId;
  name: string;
  type: string;
  price: number;
  icon?: string;
  animation?: string;
  districtId?: string;
  taxAmount?: number;
}

export const PLAYER_ROLES: readonly PlayerRole[] = [];
export const PLAYER_COLORS: readonly string[] = [];
export const AVAILABLE_PEGS: readonly string[] = [];
export const AVAILABLE_BOARDS: readonly AvailableBoard[] = [];
export const INFLUENCE_ITEMS: readonly InfluenceItem[] = [];
export const BOARD_TILES: readonly BoardTile[] = [];

export function getBoardTile(tileId: TileId): BoardTile | undefined {
  return BOARD_TILES.find(t => t.id === tileId);
}

export function getInfluenceItem(id: string): InfluenceItem | undefined {
  return INFLUENCE_ITEMS.find(i => i.id === id);
}

export function getAvailableBoardKey(key: string): AvailableBoard | undefined {
  return AVAILABLE_BOARDS.find(b => b.key === key);
}
