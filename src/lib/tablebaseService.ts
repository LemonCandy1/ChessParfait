/**
 * Service to interface with Lichess Syzygy 7-Piece Endgame Tablebases.
 * Provides mathematically optimal move suggestions, Distance to Mate (DTM), 
 * Distance to Zero (DTZ), and stubborn defensive move ranking.
 */

/**
 * Lichess result categories. The position's own category is from the point of view of the side
 * to move. Each move's category describes the position AFTER that move, so it is from the
 * opponent's point of view: a move marked 'loss' is a winning move for the side playing it.
 */
export type TablebaseCategory =
    | 'win' | 'syzygy-win' | 'maybe-win' | 'cursed-win'
    | 'draw' | 'unknown'
    | 'blessed-loss' | 'maybe-loss' | 'syzygy-loss' | 'loss';

export interface TablebaseMove {
    uci: string;
    san: string;
    category: TablebaseCategory; // Opponent's point of view (see above)
    dtm: number | null; // Distance to mate, from the opponent's point of view
    dtz: number | null; // Distance to zeroing, from the opponent's point of view
    checkmate: boolean;
    stalemate: boolean;
    insufficient_material: boolean;
}

export interface TablebaseResult {
    category: TablebaseCategory; // Side to move's point of view
    dtm: number | null; // Positive: side to move mates; negative: side to move gets mated
    dtz: number | null;
    moves: TablebaseMove[];
    /** All moves ordered best-first for the side to move: fastest win, then draws, then the most stubborn losses. */
    rankedMoves: TablebaseMove[];
    bestMove: TablebaseMove | null;
}

export type TablebaseOutcome = 'win' | 'cursed-win' | 'draw' | 'blessed-loss' | 'loss';

/** Outcome for the side whose point of view `category` is expressed in. Cursed wins and blessed losses are drawn by the 50-move rule. */
export function outcomeOf(category: TablebaseCategory | string): TablebaseOutcome {
    switch (category) {
        case 'win':
        case 'syzygy-win':
        case 'maybe-win':
            return 'win';
        case 'cursed-win':
            return 'cursed-win';
        case 'blessed-loss':
            return 'blessed-loss';
        case 'loss':
        case 'syzygy-loss':
        case 'maybe-loss':
            return 'loss';
        default:
            return 'draw';
    }
}

const OPPOSITE_OUTCOME: Record<TablebaseOutcome, TablebaseOutcome> = {
    win: 'loss',
    'cursed-win': 'blessed-loss',
    draw: 'draw',
    'blessed-loss': 'cursed-win',
    loss: 'win'
};

/** The same result seen from the other side of the board. */
export function flipOutcome(outcome: TablebaseOutcome): TablebaseOutcome {
    return OPPOSITE_OUTCOME[outcome];
}

/** Outcome of playing `move`, for the side that plays it. */
export function outcomeForMover(move: TablebaseMove): TablebaseOutcome {
    return flipOutcome(outcomeOf(move.category));
}

const OUTCOME_RANK: Record<TablebaseOutcome, number> = {
    win: 4,
    'cursed-win': 3,
    draw: 2,
    'blessed-loss': 1,
    loss: 0
};

/** Moves to mate after the move (falls back to DTZ when DTM is unavailable). */
function distanceAfter(move: TablebaseMove): number {
    const d = move.dtm ?? move.dtz;
    return d === null ? 0 : Math.abs(d);
}

/** Orders moves best-first for the side to move. Lichess's own order is kept among equal moves. */
export function rankMovesForMover(moves: TablebaseMove[]): TablebaseMove[] {
    return [...moves].sort((a, b) => {
        const outcomeA = outcomeForMover(a);
        const outcomeB = outcomeForMover(b);
        if (outcomeA !== outcomeB) return OUTCOME_RANK[outcomeB] - OUTCOME_RANK[outcomeA];
        // Winning: mate as fast as possible. Losing: resist as long as possible.
        if (outcomeA === 'win' || outcomeA === 'cursed-win') return distanceAfter(a) - distanceAfter(b);
        if (outcomeA === 'loss' || outcomeA === 'blessed-loss') return distanceAfter(b) - distanceAfter(a);
        return 0;
    });
}

// In-memory cache for fast lookups
const tablebaseCache = new Map<string, TablebaseResult>();

export async function queryTablebase(fen: string): Promise<TablebaseResult | null> {
    const cleanFen = fen.trim();
    if (tablebaseCache.has(cleanFen)) {
        return tablebaseCache.get(cleanFen)!;
    }

    try {
        const encodedFen = encodeURIComponent(cleanFen);
        const res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodedFen}`);
        
        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        
        const moves: TablebaseMove[] = (data.moves || []).map((m: any) => ({
            uci: m.uci,
            san: m.san,
            category: m.category,
            dtm: typeof m.dtm === 'number' ? m.dtm : null,
            dtz: typeof m.dtz === 'number' ? m.dtz : null,
            checkmate: Boolean(m.checkmate),
            stalemate: Boolean(m.stalemate),
            insufficient_material: Boolean(m.insufficient_material)
        }));

        const rankedMoves = rankMovesForMover(moves);

        const result: TablebaseResult = {
            category: data.category || 'unknown',
            dtm: typeof data.dtm === 'number' ? data.dtm : null,
            dtz: typeof data.dtz === 'number' ? data.dtz : null,
            moves,
            rankedMoves,
            bestMove: rankedMoves[0] ?? null
        };

        tablebaseCache.set(cleanFen, result);
        return result;
    } catch (err) {
        console.warn('Tablebase fetch failed:', err);
        return null;
    }
}
