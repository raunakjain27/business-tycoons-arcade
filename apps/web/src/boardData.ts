import eventsJson from '../../../packages/content/events.json' with { type: 'json' };
import type { TileDef, DistrictDef, TileId } from '../../../packages/engine/types';
import { getBoard, BOARDS } from '../../../packages/content/boards';

export interface BoardData {
  tiles: TileDef[];
  districts: Record<string, DistrictDef>;
}

export interface EventCardDef {
  id: number;
  text: string;
  type: string;
  amount?: number;
  targetTile?: number;
  effect?: string;
  perHouse?: number;
  perTower?: number;
}

const defaultBoard = getBoard('default');
export let BOARD_DATA: BoardData = {
  tiles: defaultBoard.tiles as TileDef[],
  districts: defaultBoard.districts as unknown as Record<string, DistrictDef>,
};

export function setBoard(key: string): void {
  const b = getBoard(key);
  let tiles = b.tiles as TileDef[];

  // If loading customfriends board, inject user's custom names from localStorage
  if (key === 'customfriends') {
    try {
      const rawUser = localStorage.getItem('cornerstone_user_account');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (Array.isArray(u.friendNames) && u.friendNames.length > 0) {
          let fIdx = 0;
          tiles = tiles.map(t => {
            if (t.type === 'property') {
              const customName = u.friendNames[fIdx % u.friendNames.length];
              fIdx++;
              return { ...t, name: customName || t.name };
            }
            return t;
          });
        }
      }
    } catch (e) {
      // fallback to defaults
    }
  }

  BOARD_DATA = {
    tiles,
    districts: b.districts as unknown as Record<string, DistrictDef>,
  };
}

export function updateTileName(tileId: TileId, newName: string): void {
  if (BOARD_DATA.tiles[tileId]) {
    BOARD_DATA.tiles[tileId] = {
      ...BOARD_DATA.tiles[tileId],
      name: newName,
    };
  }
}

export const BOARD_CURRENCY: Record<string, { symbol: string; code: string; name: string }> = {
  default: { symbol: '$', code: 'USD', name: 'US Dollars' },
  usa: { symbol: '$', code: 'USD', name: 'US Dollars' },
  uk: { symbol: '£', code: 'GBP', name: 'British Pounds' },
  india: { symbol: '₹', code: 'INR', name: 'Indian Rupees' },
  uae: { symbol: 'AED ', code: 'AED', name: 'UAE Dirhams' },
  mixed: { symbol: '€', code: 'EUR', name: 'Euros' },
  afterdark: { symbol: '$', code: 'USD', name: 'VIP Dollars' },
  customfriends: { symbol: '$', code: 'USD', name: 'Friend Bucks' },
};

export function getCurrency(boardKey: string = 'default'): { symbol: string; code: string; name: string } {
  return BOARD_CURRENCY[boardKey] || BOARD_CURRENCY.default;
}

export function formatCurrency(amount: number, boardKey: string = 'default'): string {
  const curr = getCurrency(boardKey);
  const isNegative = amount < 0;
  const absVal = Math.abs(amount).toLocaleString();
  return isNegative ? `-${curr.symbol}${absVal}` : `${curr.symbol}${absVal}`;
}

export const AVAILABLE_BOARDS = Object.keys(BOARDS);
export type BoardKey = keyof typeof BOARDS;

export const EVENT_CARDS: EventCardDef[] = eventsJson.cards as EventCardDef[];

export function getTileDef(id: TileId): TileDef {
  const tile = BOARD_DATA.tiles[id];
  if (!tile) {
    return {
      id,
      name: `Tile ${id}`,
      type: 'property',
    };
  }
  return tile;
}

export function getDistrictDef(districtId?: string | null): DistrictDef | undefined {
  if (!districtId) return undefined;
  return BOARD_DATA.districts[districtId];
}

export const PLAYER_COLORS = [
  '#3b82f6', // Sapphire Blue
  '#ef4444', // Crimson Red
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#8b5cf6', // Amethyst Purple
  '#06b6d4', // Cyan
  '#ec4899', // Bright Pink
  '#14b8a6', // Teal
];

export interface PegDef {
  id: string;
  name: string;
  icon: string;
  animation: string;
  isPremium?: boolean;
}

export const AVAILABLE_PEGS: PegDef[] = [
  { id: 'alien', name: 'Alien Invader', icon: '👾', animation: 'bounce' },
  { id: 'rocket', name: 'Cosmic Rocket', icon: '🚀', animation: 'float' },
  { id: 'car', name: 'Super Sports Car', icon: '🏎️', animation: 'vibrate' },
  { id: 'jet', name: 'Private Jet', icon: '🛩️', animation: 'tilt' },
  { id: 'cat', name: 'Lucky Fortune Cat', icon: '🐱', animation: 'pounce' },
  { id: 'robot', name: 'Cyber Bot', icon: '🤖', animation: 'wiggle' },
  // Premium VIP Pegs
  { id: 'crown', name: 'Royal Crown [VIP]', icon: '👑', animation: 'pulse', isPremium: true },
  { id: 'diamond', name: 'Giant Diamond [VIP]', icon: '💎', animation: 'sparkle', isPremium: true },
  { id: 'fire', name: 'Flame Roller [VIP]', icon: '🔥', animation: 'flare', isPremium: true },
  { id: 'ghost', name: 'Sneaky Ghost [VIP]', icon: '👻', animation: 'float', isPremium: true },
  { id: 'shark', name: 'Finance Shark [VIP]', icon: '🦈', animation: 'swim', isPremium: true },
  { id: 'yacht', name: 'Mega Yacht [VIP]', icon: '🛥️', animation: 'sway', isPremium: true },
];

export const PLAYER_ROLES = [
  { id: 'Tycoon', name: 'Tycoon', perk: '+10% rent on monopolies, starts with $1,750 cash.' },
  { id: 'Broker', name: 'Broker', perk: '15% discount when building and purchasing properties.' },
  { id: 'Negotiator', name: 'Negotiator', perk: 'May counter any trade offer with bonus influence.' },
  { id: 'Banker', name: 'Banker', perk: 'Collects 5% interest on deposits and can issue loans.' },
  { id: 'Strategist', name: 'Strategist', perk: 'Reroll dice once per 3 rounds or peek at next event.' },
  { id: 'Landlord', name: 'Landlord', perk: 'Can freeze opponent property rent once every 4 rounds.' },
] as const;

export type RoleId = (typeof PLAYER_ROLES)[number]['id'];

export const INFLUENCE_ITEMS = [
  { id: 'waiver' as const, name: 'Rent Waiver', cost: 1, desc: 'Avoid paying rent on your next opponent property landing.' },
  { id: 'lawyer' as const, name: 'Audit Defense', cost: 2, desc: 'Immediate release from the Audit Office without penalty.' },
  { id: 'rezone' as const, name: 'Rezoning Permit', cost: 2, desc: 'Bypass even-build rule for one property tier upgrade.' },
  { id: 'lobby' as const, name: 'City Lobby', cost: 3, desc: 'Trigger a market boom in your preferred district.' },
  { id: 'wildcard' as const, name: 'Turn Perk', cost: 3, desc: 'Draw 2 event cards and choose the more favorable one.' },
];
