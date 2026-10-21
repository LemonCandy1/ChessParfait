import { Chess } from 'chess.js';
import { getAdminClient, getSessionAuthUser, isUuid, json, type SupabaseEnv } from '../../_lib/community';
import { ATTEMPT_COLUMNS, TRAINER_ENDGAMES, closeAttempt, closePracticeAttempt, matchesTarget, playerOutcome, type AttemptRow } from '../../_lib/endgameTrainer';
import { TABLEBASE_MAX_PIECES, countPieces, solveScore, solveState } from '../../../src/lib/endgameTrainer';

/** Replays `moves` (UCI, both sides) from the served position; returns the player's move count if it is really solved, else null. */
async function verifySolve(attempt: AttemptRow, moves: unknown): Promise<number | null> {
    const endgame = TRAINER_ENDGAMES.find(e => e.id === attempt.endgame_id);
    if (!endgame || !Array.isArray(moves) || moves.length > 400) return null;

    const game = new Chess(attempt.fen);
    let playerMoves = 0;
    for (const uci of moves) {
        if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
        if (game.turn() === attempt.player_color) playerMoves++;
        try {
            game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        } catch {
            return null;
        }
    }

    const state = solveState(game, endgame, attempt.player_color, playerMoves);
    if (state === 'solved') return playerMoves;
    if (state !== 'confirm') return null;
    // Too many pieces for the database (only possible for a held draw): holding the moves is enough.
    if (countPieces(game.fen()) > TABLEBASE_MAX_PIECES) return playerMoves;
    // If the database can't be reached, give the player the benefit of the doubt rather than a miss.
    const outcome = await playerOutcome(game.fen(), attempt.player_color);
    return outcome === null || matchesTarget(outcome, endgame.target) ? playerMoves : null;
}

/**
 * POST /api/endgame-trainer/result { attemptId, outcome: 'solved' | 'failed', moves: string[], helped?: boolean }
 * Closes the open position and moves the rating (a practice position only counts for mastery and reviews;
 * `helped` marks a practice solve that used a hint). A "solved" is only accepted if the moves replay legally
 * from the served position to the goal; otherwise it counts as a miss.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);

        const { attemptId, outcome, moves, helped } = await request.json();
        if (!isUuid(attemptId) || (outcome !== 'solved' && outcome !== 'failed')) return json({ message: 'Invalid result.' }, 400);

        const admin = getAdminClient(env);
        const { data, error } = await admin
            .from('endgame_attempts')
            .select(ATTEMPT_COLUMNS)
            .eq('id', attemptId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) throw error;
        const attempt = data as AttemptRow | null;
        if (!attempt || attempt.status !== 'open') return json({ message: 'This position has already been scored.' }, 409);

        const movesTaken = outcome === 'solved' ? await verifySolve(attempt, moves) : null;
        const solved = movesTaken !== null;
        const result = attempt.practice
            ? await closePracticeAttempt(admin, attempt, solved, helped === true)
            : await closeAttempt(admin, attempt, solved, solved ? solveScore(movesTaken, attempt.optimal_moves) : 0);
        if (!result) return json({ message: 'This position has already been scored.' }, 409);

        return json({ ...result, solved, rejected: outcome === 'solved' && !solved, movesTaken, fastestMate: attempt.optimal_moves });
    } catch (err) {
        console.error('Endgame trainer result error:', err);
        return json({ message: 'Could not save your result.' }, 500);
    }
}
