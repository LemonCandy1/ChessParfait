import { Chess, type Move } from 'chess.js';

/**
 * Practical win conditions for endgame drills that end before checkmate.
 *
 * - Pawn endgames: a side wins once it promotes to a queen safely.
 * - Queen vs rook: the queen side wins once the queen captures the rook safely.
 *
 * "Safely" means that, with the other side to move, the new queen cannot be captured,
 * the other side has no immediate checkmate, and the position is not stalemate or any
 * other draw.
 */

export type DrillGoal = 'pawn-promotion' | 'queen-wins-rook';

export function drillGoalFor(endgame: { id: string; category: string }): DrillGoal | null {
    if (endgame.category === 'Pawn Endgames') return 'pawn-promotion';
    if (endgame.id.startsWith('queen-vs-rook')) return 'queen-wins-rook';
    return null;
}

/** True if, with the side to move in `game`, the queen on `square` can be safely kept. */
function queenIsSafe(game: Chess, square: string): boolean {
    if (game.isGameOver()) return false;

    for (const reply of game.moves({ verbose: true })) {
        if (reply.to === square) return false;

        // The defender must not have a checkmate in reply either.
        const probe = new Chess(game.fen());
        probe.move(reply);
        if (probe.isCheckmate()) return false;
    }
    return true;
}

/**
 * Returns the colour that achieved the drill's goal with `lastMove`, or null.
 * `game` is the position after `lastMove` was played.
 */
export function goalAchievedBy(goal: DrillGoal | null, game: Chess, lastMove: Move | undefined): 'w' | 'b' | null {
    if (!goal || !lastMove) return null;

    if (goal === 'pawn-promotion' && lastMove.promotion === 'q' && queenIsSafe(game, lastMove.to)) {
        return lastMove.color;
    }

    if (goal === 'queen-wins-rook' && lastMove.piece === 'q' && lastMove.captured === 'r' && queenIsSafe(game, lastMove.to)) {
        return lastMove.color;
    }

    return null;
}
