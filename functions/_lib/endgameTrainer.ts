import type { SupabaseClient } from '@supabase/supabase-js';
import endgames from '../../src/data/endgames.json';
import {
    BEST_RATING_POINTS,
    LEADERBOARD_MIN_PLAYED,
    TABLEBASE_MAX_PIECES,
    countPieces,
    newMilestones,
    randomTransform,
    ratingChange,
    transformPosition,
    type Colour,
    type TrainerEndgame
} from '../../src/lib/endgameTrainer';
import { flipOutcome, outcomeOf, queryTablebase, type TablebaseOutcome } from '../../src/lib/tablebaseService';
import { awardPoints } from './profiles';

// Shared helpers for the /api/endgame-trainer endpoints. No onRequest handlers, so Pages does not route it.

export const TRAINER_ENDGAMES = endgames as TrainerEndgame[];

export interface AttemptRow {
    id: string;
    user_id: string;
    endgame_id: string;
    fen: string;
    player_color: Colour;
    status: 'open' | 'solved' | 'failed';
}

export interface TrainerStats {
    rating: number;
    best: number;
    played: number;
    provisional: boolean;
}

export async function trainerStats(admin: SupabaseClient, userId: string): Promise<TrainerStats> {
    const { data, error } = await admin.from('profiles').select('endgame_rating, endgame_best, endgame_played').eq('id', userId).single();
    if (error) throw error;
    const row = data as { endgame_rating: number; endgame_best: number; endgame_played: number };
    return { rating: row.endgame_rating, best: row.endgame_best, played: row.endgame_played, provisional: row.endgame_played < LEADERBOARD_MIN_PLAYED };
}

/** The result for the player in `fen`, from the endgame database, or null if it can't be looked up. */
export async function playerOutcome(fen: string, playerColor: Colour): Promise<TablebaseOutcome | null> {
    if (countPieces(fen) > TABLEBASE_MAX_PIECES) return null;
    const result = await queryTablebase(fen);
    if (!result) return null;
    const outcome = outcomeOf(result.category);
    return fen.split(' ')[1] === playerColor ? outcome : flipOutcome(outcome);
}

/** True if the outcome is what the endgame teaches: a win for "win", a draw (by the 50-move rule too) for "draw". */
export const matchesTarget = (outcome: TablebaseOutcome, target: 'win' | 'draw') =>
    target === 'win' ? outcome === 'win' : outcome === 'draw' || outcome === 'cursed-win' || outcome === 'blessed-loss';

/**
 * A fresh variation of `endgame`. Small positions are moved around the board and kept only if the endgame
 * database confirms the same result; anything else (or if no checked shift works) is only flipped or
 * colour-swapped, which can't change the result.
 */
export async function makeVariation(endgame: TrainerEndgame): Promise<{ fen: string; playerColor: Colour }> {
    if (countPieces(endgame.fen) <= TABLEBASE_MAX_PIECES) {
        for (let tries = 0; tries < 6; tries++) {
            const v = transformPosition(endgame.fen, endgame.playerColor, randomTransform(endgame.fen, true));
            if (!v) continue;
            const outcome = await playerOutcome(v.fen, v.playerColor);
            if (outcome && matchesTarget(outcome, endgame.target)) return v;
        }
    }
    for (let tries = 0; tries < 10; tries++) {
        const v = transformPosition(endgame.fen, endgame.playerColor, randomTransform(endgame.fen, false));
        if (v) return v;
    }
    return { fen: endgame.fen, playerColor: endgame.playerColor };
}

export interface AttemptResult extends TrainerStats {
    change: number;
    pointsAwarded: number;
}

/**
 * Closes an open attempt as solved or failed, moves the rating and pays +5 points for each new 100 the best
 * rating passes. Returns null if the attempt was already closed (a double submit), so it is never counted twice.
 */
export async function closeAttempt(admin: SupabaseClient, attempt: AttemptRow, solved: boolean): Promise<AttemptResult | null> {
    const endgame = TRAINER_ENDGAMES.find(e => e.id === attempt.endgame_id);
    const stats = await trainerStats(admin, attempt.user_id);
    const change = endgame ? ratingChange(stats.rating, endgame.rating, solved, stats.played) : 0;
    const rating = Math.max(100, stats.rating + change);

    const { data: claimed, error: claimError } = await admin
        .from('endgame_attempts')
        .update({ status: solved ? 'solved' : 'failed', rating_after: rating, finished_at: new Date().toISOString() })
        .eq('id', attempt.id)
        .eq('status', 'open')
        .select('id');
    if (claimError) throw claimError;
    if (!claimed?.length) return null;

    const best = Math.max(stats.best, rating);
    const played = stats.played + 1;
    const { error } = await admin
        .from('profiles')
        .update({ endgame_rating: rating, endgame_best: best, endgame_played: played, updated_at: new Date().toISOString() })
        .eq('id', attempt.user_id);
    if (error) throw error;

    let pointsAwarded = 0;
    for (const milestone of newMilestones(stats.best, best)) {
        const { awarded } = await awardPoints(admin, attempt.user_id, 'endgame', `trainer-best-${milestone}`, BEST_RATING_POINTS, { milestone });
        if (awarded) pointsAwarded += BEST_RATING_POINTS;
    }

    return { rating, best, played, provisional: played < LEADERBOARD_MIN_PLAYED, change: rating - stats.rating, pointsAwarded };
}
