/**
 * Service to interface with Lichess Syzygy 7-Piece Endgame Tablebases.
 * Provides mathematically optimal move suggestions, Distance to Mate (DTM), 
 * Distance to Zero (DTZ), and stubborn defensive move ranking.
 */

export interface TablebaseMove {
    uci: string;
    san: string;
    category: 'win' | 'loss' | 'draw' | 'unknown';
    dtm: number | null; // Distance to Mate (positive for winning side, negative for losing side)
    dtz: number | null; // Distance to Zero (50-move rule counter)
    checkmate: boolean;
    stalemate: boolean;
    insufficient_material: boolean;
}

export interface TablebaseResult {
    category: 'win' | 'loss' | 'draw' | 'unknown';
    dtm: number | null;
    dtz: number | null;
    moves: TablebaseMove[];
    bestMove: TablebaseMove | null;
    mostStubbornMove: TablebaseMove | null; // Move with longest moves to mate for defender
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

        // Best move for the current side (shortest DTM to win, or draw if losing)
        let bestMove: TablebaseMove | null = null;
        if (moves.length > 0) {
            // Sort to find the best move
            // If winning: move with lowest positive DTM (fastest mate)
            // If drawing: move with draw category
            // If losing: move with most negative DTM (longest resistance)
            bestMove = moves[0];
        }

        // Most stubborn defensive move:
        // When the opponent is defending, they want the move that prolongs the game the most
        // (i.e. if losing, smallest absolute dtm or furthest dtm from 0, e.g. -35 is more stubborn than -2).
        let mostStubbornMove: TablebaseMove | null = null;
        if (moves.length > 0) {
            const losingMoves = moves.filter(m => m.category === 'loss' || (m.dtm !== null && m.dtm < 0));
            if (losingMoves.length > 0) {
                // Sort by most negative dtm (largest distance to mate)
                losingMoves.sort((a, b) => {
                    const dtmA = a.dtm !== null ? Math.abs(a.dtm) : 0;
                    const dtmB = b.dtm !== null ? Math.abs(b.dtm) : 0;
                    return dtmB - dtmA; // Descending distance to mate
                });
                mostStubbornMove = losingMoves[0];
            } else {
                mostStubbornMove = moves[0];
            }
        }

        const result: TablebaseResult = {
            category: data.category || 'unknown',
            dtm: typeof data.dtm === 'number' ? data.dtm : null,
            dtz: typeof data.dtz === 'number' ? data.dtz : null,
            moves,
            bestMove,
            mostStubbornMove
        };

        tablebaseCache.set(cleanFen, result);
        return result;
    } catch (err) {
        console.warn('Tablebase fetch failed:', err);
        return null;
    }
}
