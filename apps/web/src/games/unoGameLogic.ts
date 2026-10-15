import { useCallback, useEffect, useRef, useState } from 'react';
import { useSound } from '../useSound';

type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'draw4';

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface UnoPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  cards: UnoCard[];
  calledUno: boolean;
  color: string;
}

interface UnoState {
  deck: UnoCard[];
  discardPile: UnoCard[];
  activeColor: CardColor;
  players: UnoPlayer[];
  currentPlayerIdx: number;
  direction: 1 | -1;
  winner: UnoPlayer | null;
  gameLog: string[];
  lastPlayedAnim: string | null;
}

type UnoAction =
  | { type: 'PLAY_CARD'; playerId: string; card: UnoCard; chosenColor?: CardColor }
  | { type: 'DRAW_CARD'; playerId: string }
  | { type: 'CALL_UNO' }
  | { type: 'CHOOSE_WILD_COLOR'; color: CardColor }
  | { type: 'RESTART' }
  | { type: 'START_MATCH'; players: UnoPlayer[]; startCard: UnoCard; roomCode: string };

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

function clampDirection(dir: number): 1 | -1 {
  if (dir === 1 || dir === -1) return dir as 1 | -1;
  return 1;
}

export function createUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let id = 1;

  for (const c of colors) {
    deck.push({ id: `c-${id++}`, color: c, value: '0' });
    const numbers: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = 0; i < 2; i++) {
      for (const n of numbers) {
        deck.push({ id: `c-${id++}`, color: c, value: n });
      }
      deck.push({ id: `c-${id++}`, color: c, value: 'skip' });
      deck.push({ id: `c-${id++}`, color: c, value: 'reverse' });
      deck.push({ id: `c-${id++}`, color: c, value: 'draw2' });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c-${id++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `c-${id++}`, color: 'wild', value: 'draw4' });
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function deckSlice(deck: UnoCard[], count = 7): UnoCard[] {
  return deck.slice(0, count);
}

function withStartingHand(deck: UnoCard[], players: Array<Partial<UnoPlayer>>, count = 7): UnoPlayer[] {
  const hand = deckSlice(deck, count);
  return players.map((p): UnoPlayer => ({
    id: p.id ?? `p-${Math.random().toString(36).substring(2, 8)}`,
    name: p.name ?? 'Player',
    avatar: p.avatar ?? '👤',
    isBot: p.isBot ?? false,
    color: p.color ?? '#888',
    cards: hand,
    calledUno: false,
  }));
}

function makeStartCard(deck: UnoCard[]): UnoCard {
  let startCard = deck.pop()!;
  while (startCard.color === 'wild') {
    deck.unshift(startCard);
    startCard = deck.pop()!;
  }
  return startCard;
}

function initialStateFromMatch(
  players: UnoPlayer[],
  startCard: UnoCard,
  roomCode: string,
): UnoState {
  return {
    deck: [],
    discardPile: [startCard],
    activeColor: startCard.color,
    players,
    currentPlayerIdx: 0,
    direction: 1,
    winner: null,
    gameLog: [
      `🎮 Match started in room ${roomCode}! Starting card: ${startCard.color.toUpperCase()} ${startCard.value}`,
    ],
    lastPlayedAnim: null,
  };
}

function makePlayersFromRoom(room: { players: Array<{ id?: string; name?: string; avatar?: string; isBot?: boolean; color?: string }> }, deck: UnoCard[]): UnoPlayer[] {
  if (room.players && room.players.length >= 2) {
    return withStartingHand(deck, room.players as Array<Partial<UnoPlayer>>);
  }
  return withStartingHand(deck, [
    { id: 'p1', name: 'You (Champion)', isBot: false, avatar: '👑', color: '#ec4899' },
    { id: 'p2', name: 'Bot Alex 🤖', isBot: true, avatar: '🤖', color: '#3b82f6' },
  ]);
}

function isCardPlayable(card: UnoCard, topCard: UnoCard | undefined, activeColor: CardColor): boolean {
  if (!topCard) return false;
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

function resolveNextIdx(
  currentPlayerIdx: number,
  direction: 1 | -1,
  players: UnoPlayer[],
  skipCount: number,
): number {
  const numPlayers = players.length;
  if (numPlayers === 0) return 0;
  let nextIdx = (currentPlayerIdx + direction * (1 + skipCount)) % numPlayers;
  if (nextIdx < 0) nextIdx += numPlayers;
  return nextIdx;
}

function findTargetPlayer(
  currentPlayerIdx: number,
  direction: 1 | -1,
  players: UnoPlayer[],
): UnoPlayer | undefined {
  const targetIdx = resolveNextIdx(currentPlayerIdx, direction, players, 0);
  return players[targetIdx];
}

function applyDrawFromDeckOrDiscard(deck: UnoCard[], discardPile: UnoCard[], count: number): { deck: UnoCard[]; discardPile: UnoCard[]; drawn: UnoCard[] } {
  let currentDeck = deck.slice();
  let currentDiscard = discardPile.slice();
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length <= 1) break;
      const top = currentDiscard.pop()!;
      currentDeck = shuffleArray(currentDiscard);
      currentDiscard = [top];
    }
    if (currentDeck.length > 0) {
      drawn.push(currentDeck.pop()!);
    }
  }

  return { deck: currentDeck, discardPile: currentDiscard, drawn };
}

function playBotCardId(botPlayer: UnoPlayer, topCard: UnoCard | undefined, activeColor: CardColor): UnoCard | undefined {
  const playable = botPlayer.cards.filter((c) => isCardPlayable(c, topCard, activeColor));
  if (playable.length === 0) return undefined;
  const chosen = playable.find((c) => c.color !== 'wild') || playable[0];
  return chosen;
}

function chooseWildColorForBot(): CardColor {
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function useUnoGame(initialPlayers: UnoPlayer[], roomCode: string) {
  const sound = useSound();

  const [state, setState] = useState<UnoState>(() => {
    const deck = createUnoDeck();
    const players = makePlayersFromRoom({ players: initialPlayers.map((p) => ({ ...p })) }, deck);

    const startCard = makeStartCard(deck);

    return initialStateFromMatch(players, startCard, roomCode);
  });

  const deckRef = useRef<UnoCard[]>([]);
  const discardPileRef = useRef<UnoCard[]>([]);
  const playersRef = useRef<UnoPlayer[]>([]);

  // Keep refs in sync with state so callbacks always read the latest truth.
  useEffect(() => {
    deckRef.current = state.deck;
    discardPileRef.current = state.discardPile;
    playersRef.current = state.players;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const addLog = useCallback((msg: string) => {
    setState((prev) => ({
      ...prev,
      gameLog: [msg, ...prev.gameLog.slice(0, 19)],
    }));
  }, []);

  const setLastPlayedAnim = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, lastPlayedAnim: id }));
  }, []);

  const setActiveColor = useCallback((color: CardColor) => {
    setState((prev) => ({ ...prev, activeColor: color }));
  }, []);

  const setDirection = useCallback((dir: 1 | -1) => {
    setState((prev) => ({ ...prev, direction: dir }));
  }, []);

  const setCurrentPlayerIdx = useCallback((idx: number) => {
    setState((prev) => ({ ...prev, currentPlayerIdx: idx }));
  }, []);

  const setWinner = useCallback((winner: UnoPlayer | null) => {
    setState((prev) => ({ ...prev, winner }));
  }, []);

  const fetchTopCard = useCallback((): UnoCard | undefined => {
    const pile = discardPileRef.current;
    if (!pile || pile.length === 0) return undefined;
    return pile[pile.length - 1];
  }, []);

  const topCard = fetchTopCard();

  const syncDeck = useCallback((deck: UnoCard[]) => {
    deckRef.current = deck;
    setState((prev) => ({ ...prev, deck }));
  }, []);

  const syncDiscard = useCallback((pile: UnoCard[]) => {
    discardPileRef.current = pile;
    setState((prev) => ({ ...prev, discardPile: pile }));
  }, []);

  const syncPlayers = useCallback((players: UnoPlayer[]) => {
    playersRef.current = players;
    setState((prev) => ({ ...prev, players }));
  }, []);

  const drawCards = useCallback(
    (playerId: string, count: number): UnoCard[] => {
      const currentDeck = deckRef.current ?? [];
      const currentDiscard = discardPileRef.current ?? [];
      const { deck, discardPile, drawn } = applyDrawFromDeckOrDiscard(currentDeck, currentDiscard, count);

      syncDeck(deck);
      syncDiscard(discardPile);

      const updatedPlayers = (playersRef.current ?? []).map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            cards: p.cards.concat(drawn),
            calledUno: false,
          };
        }
        return p;
      });

      syncPlayers(updatedPlayers);
      return drawn;
    },
    [syncDeck, syncDiscard, syncPlayers],
  );

  const executeCardPlay = useCallback(
    (playerId: string, card: UnoCard, chosenColor?: CardColor) => {
      const player = (playersRef.current ?? []).find((p) => p.id === playerId);
      if (!player || state.winner) return;

      const remainingCards = player.cards.filter((c) => c.id !== card.id);

      syncPlayers(
        (playersRef.current ?? []).map((p) => {
          if (p.id === playerId) {
            const autoUno = remainingCards.length === 1;
            return { ...p, cards: remainingCards, calledUno: autoUno };
          }
          return p;
        }),
      );

      const currentDiscard = discardPileRef.current ?? [];
      const newDiscard = currentDiscard.concat([card]);
      syncDiscard(newDiscard);
      setLastPlayedAnim(card.id);
      setTimeout(() => setLastPlayedAnim(null), 600);

      if (['wild', 'draw4', 'skip', 'reverse', 'draw2'].includes(card.value)) {
        sound.playCardSpecial();
      } else {
        sound.playCardFlip();
      }

      const newColor = chosenColor || (card.color === 'wild' ? 'red' : card.color);
      setActiveColor(newColor);

      addLog(
        `${player.name} played ${card.color.toUpperCase()} ${card.value}${chosenColor ? ` (picked ${chosenColor})` : ''}`,
      );

      if (remainingCards.length === 0) {
        sound.playVictory();
        setWinner(player);
        addLog(`🎉 ${player.name} has played all cards and WON the match!`);
        return;
      }

      if (remainingCards.length === 1) {
        sound.playCardSpecial();
        addLog(`⚠️ ${player.name} calls UNO! Only 1 card left!`);
      }

      let skip = 0;
      let newDir = state.direction;

      if (card.value === 'reverse') {
        newDir = clampDirection(-state.direction);
        setDirection(newDir);
        addLog(`🔄 Play order reversed!`);
      } else if (card.value === 'skip') {
        skip = 1;
        addLog(`🚫 Next player was skipped!`);
      } else if (card.value === 'draw2') {
        skip = 1;
        const target = findTargetPlayer(state.currentPlayerIdx, state.direction, playersRef.current ?? []);
        if (target) {
          drawCards(target.id, 2);
          addLog(`💥 ${target.name} draws 2 cards and skips turn!`);
        }
      } else if (card.value === 'draw4') {
        skip = 1;
        const target = findTargetPlayer(state.currentPlayerIdx, state.direction, playersRef.current ?? []);
        if (target) {
          drawCards(target.id, 4);
          addLog(`💣 ${target.name} draws 4 cards and skips turn!`);
        }
      }

      const nextIdx = resolveNextIdx(state.currentPlayerIdx, newDir, playersRef.current ?? [], skip);
      setCurrentPlayerIdx(nextIdx);
    },
    [state.winner, state.direction, state.currentPlayerIdx, sound, addLog, setLastPlayedAnim, setActiveColor, setDirection, setCurrentPlayerIdx, setWinner, syncPlayers, syncDiscard, drawCards],
  );

  const botPlay = useCallback(
    (bot: UnoPlayer) => {
      if (state.winner) return;
      const chosen = playBotCardId(bot, fetchTopCard(), state.activeColor);
      if (chosen) {
        const botColorChoice = chosen.color === 'wild' ? chooseWildColorForBot() : undefined;
        executeCardPlay(bot.id, chosen, botColorChoice);
      } else {
        drawCards(bot.id, 1);
        addLog(`${bot.name} had no playable cards and drew 1.`);
        setCurrentPlayerIdx(resolveNextIdx(state.currentPlayerIdx, state.direction, playersRef.current ?? [], 0));
      }
    },
    [state.winner, fetchTopCard, state.activeColor, state.currentPlayerIdx, state.direction, playersRef.current, executeCardPlay, drawCards, addLog, setCurrentPlayerIdx],
  );

  const scheduleBotTurn = useCallback(
    (bot: UnoPlayer) => {
      const timer = setTimeout(() => {
        if (state.winner) return;
        const currentPlayer = (playersRef.current ?? [])[state.currentPlayerIdx];
        if (currentPlayer?.id !== bot.id) return;
        botPlay(bot);
      }, 1100);
      return timer;
    },
    [state.winner, playersRef.current, state.currentPlayerIdx, botPlay],
  );

  const handleDrawCard = useCallback(() => {
    if (state.winner) return;
    const curPlayer = (playersRef.current ?? [])[state.currentPlayerIdx];
    if (!curPlayer || curPlayer.isBot) return;

    drawCards(curPlayer.id, 1);
    addLog('You drew 1 card.');
    setCurrentPlayerIdx(resolveNextIdx(state.currentPlayerIdx, state.direction, playersRef.current ?? [], 0));
  }, [state.winner, state.currentPlayerIdx, state.direction, playersRef.current, drawCards, addLog, setCurrentPlayerIdx]);

  const handleCallUno = useCallback(() => {
    addLog('🗣️ You called UNO!');
  }, [addLog]);

  const handleRestart = useCallback(() => {
    const deck = createUnoDeck();
    const players: UnoPlayer[] = withStartingHand(deck, initialPlayers.map((p) => ({ ...p })));

    const startCard = makeStartCard(deck);

    deckRef.current = deck;
    discardPileRef.current = [startCard];
    playersRef.current = players;

    setState(initialStateFromMatch(players, startCard, roomCode));
  }, [initialPlayers, roomCode]);

  useEffect(() => {
    if (state.winner || state.players.length === 0) return;

    const cur = state.players[state.currentPlayerIdx];
    if (cur && cur.isBot) {
      const timer = scheduleBotTurn(cur);
      return () => clearTimeout(timer);
    }
  }, [state.winner, state.players, state.currentPlayerIdx, scheduleBotTurn]);

  return {
    // Public read-only view
    deck: state.deck,
    discardPile: state.discardPile,
    activeColor: state.activeColor,
    players: state.players,
    currentPlayerIdx: state.currentPlayerIdx,
    direction: state.direction,
    winner: state.winner,
    gameLog: state.gameLog,
    lastPlayedAnim: state.lastPlayedAnim,
    topCard,

    // Actions
    handlePlayerPlay: useCallback(
      (card: UnoCard) => {
        if (state.winner) return;
        const curPlayer = (playersRef.current ?? [])[state.currentPlayerIdx];
        if (!curPlayer || curPlayer.isBot) return;
        if (!isCardPlayable(card, fetchTopCard(), state.activeColor)) return;

        if (card.color === 'wild') {
          // Wild color picker is handled by the UI via CHOOSE_WILD_COLOR later.
          // We stash the pending wild card in a temp ref for the next action.
          pendingWildRef.current = card;
        } else {
          executeCardPlay(curPlayer.id, card);
        }
      },
      [state.winner, playersRef.current, state.currentPlayerIdx, fetchTopCard, state.activeColor, executeCardPlay],
    ),

    handleDrawCard,
    handleCallUno,
    handleRestart,

    // Used by the wild-color picker modal
    pickWildColor: useCallback(
      (color: CardColor) => {
        const pending = pendingWildRef.current;
        if (!pending) return;
        const curPlayer = (playersRef.current ?? [])[state.currentPlayerIdx];
        if (!curPlayer) return;
        pendingWildRef.current = null;
        executeCardPlay(curPlayer.id, pending, color);
      },
      [playersRef.current, state.currentPlayerIdx, executeCardPlay],
    ),

    // Used by lobby to start a fresh match after add-player changes
    resetFromPlayers: useCallback(
      (playersArg: UnoPlayer[]) => {
        const deck = createUnoDeck();
        const players = withStartingHand(deck, playersArg.map((p) => ({ ...p })));

        const startCard = makeStartCard(deck);

        deckRef.current = deck;
        discardPileRef.current = [startCard];
        playersRef.current = players;

        setState(initialStateFromMatch(players, startCard, roomCode));
      },
      [roomCode],
    ),
  };
}

// Temporary ref for the pending wild card chosen in the UI modal.
const pendingWildRef = { current: null as UnoCard | null };

export type { UnoState };
