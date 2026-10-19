import { Chess } from 'chess.js';
import { getAdminClient, getSessionAuthUser, isUuid, json, type SupabaseEnv } from '../../_lib/community';
import { TRAINER_ENDGAMES, closeAttempt, matchesTarget, playerOutcome, type AttemptRow } from '../../_lib/endgameTrainer';
import { TABLEBASE_MAX_PIECES, countPieces, solveState } from '../../../src/lib/endgameTrainer';

/** Replays `moves` (UCI, both sides) from the served position and checks the player really solved it. */
async function verifySolve(attempt: AttemptRow, moves: unknown): Promise<boolean> {
    const endgame = TRAINER_ENDGAMES.find(e => e.id === attempt.endgame_id);
    if (!endgame || !Array.isArray(moves) || moves.length > 400) return false;

    const game = new Chess(attempt.fen);
    let playerMoves = 0;
    for (const uci of moves) {
        if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;
        if (game.turn() === attempt.player_color) playerMoves++;
        try {
            game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        } catch {
            return false;
        }
    }

    const state = solveState(game, endgame, attempt.player_color, playerMoves);
    if (state === 'solved') return true;
    if (state !== 'confirm') return false;
    // Too many pieces for the database (only possible for a held draw): holding the moves is enough.
    if (countPieces(game.fen()) > TABLEBASE_MAX_PIECES) return true;
    // If the database can't be reached, give the player the benefit of the doubt rather than a miss.
    const outcome = await playerOutcome(game.fen(), attempt.player_color);
    return outcome === null || matchesTarget(outcome, endgame.target);
}

/**
 * POST /api/endgame-trainer/result { attemptId, outcome: 'solved' | 'failed', moves: string[] }
 * Closes the open position and moves the rating. A "solved" is only accepted if the moves replay legally
 * from the served position to the goal; otherwise it counts as a miss.
 */
export async function onRequestPost(context: { request: Request; env: SupabaseEnv }) {
    const { request, env } = context;
    try {
        const user = await getSessionAuthUser(request, env);
        if (!user) return json({ message: 'Please sign in to use the endgame trainer.' }, 401);

        const { attemptId, outcome, moves } = await request.json();
        if (!isUuid(attemptId) || (outcome !== 'solved' && outcome !== 'failed')) return json({ message: 'Invalid result.' }, 400);

        const admin = getAdminClient(env);
        const { data, error } = await admin
            .from('endgame_attempts')
            .select('id, user_id, endgame_id, fen, player_color, status')
            .eq('id', attemptId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) throw error;
        const attempt = data as AttemptRow | null;
        if (!attempt || attempt.status !== 'open') return json({ message: 'This position has already been scored.' }, 409);

        const solved = outcome === 'solved' && await verifySolve(attempt, moves);
        const result = await closeAttempt(admin, attempt, solved);
        if (!result) return json({ message: 'This position has already been scored.' }, 409);

        return json({ ...result, solved, rejected: outcome === 'solved' && !solved });
    } catch (err) {
        console.error('Endgame trainer result error:', err);
        return json({ message: 'Could not save your result.' }, 500);
    }
}
