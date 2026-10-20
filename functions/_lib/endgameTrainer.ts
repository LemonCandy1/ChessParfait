import type { SupabaseClient } from '@supabase/supabase-js';
import endgames from '../../src/data/endgames.json';
import {
    BEST_RATING_POINTS,
    LEADERBOARD_MIN_PLAYED,
    TABLEBASE_MAX_PIECES,
    countPieces,
    endgameRatingChange,
    movesToMate,
    newMilestones,
    pickEndgame,
    nextReviewGap,
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

/** The endgames with their live ratings: endgames.json holds starting values, endgame_ratings the adjusted ones. */
export async function currentEndgames(admin: SupabaseClient): Promise<TrainerEndgame[]> {
    const { data, error } = await admin.from('endgame_ratings').select('endgame_id, rating');
    if (error) throw error;
    const live = new Map(((data ?? []) as { endgame_id: string; rating: number }[]).map(r => [r.endgame_id, r.rating]));
    return TRAINER_ENDGAMES.map(e => ({ ...e, rating: live.get(e.id) ?? e.rating }));
}

export interface AttemptRow {
    id: string;
    user_id: string;
    endgame_id: string;
    fen: string;
    player_color: Colour;
    status: 'open' | 'solved' | 'failed';
    optimal_moves: number | null;
}

export const ATTEMPT_COLUMNS = 'id, user_id, endgame_id, fen, player_color, status, optimal_moves';

/** The fastest mate in moves for the player to move in `fen`, if the endgame database knows it (not for 7 pieces or draws). */
export async function fastestMate(fen: string, playerColor: Colour): Promise<number | null> {
    if (countPieces(fen) > TABLEBASE_MAX_PIECES || fen.split(' ')[1] !== playerColor) return null;
    const result = await queryTablebase(fen);
    return result?.dtm && result.dtm > 0 ? movesToMate(result.dtm) : null;
}

/** A failed endgame now due for review (oldest first), skipping the one just played. */
export async function dueReview(admin: SupabaseClient, userId: string, lastId: string | null): Promise<string | null> {
    const { data, error } = await admin
        .from('endgame_reviews')
        .select('endgame_id')
        .eq('user_id', userId)
        .lte('due_at', new Date().toISOString())
        .order('due_at')
        .limit(3);
    if (error) throw error;
    return ((data ?? []) as { endgame_id: string }[]).map(r => r.endgame_id).find(id => id !== lastId) ?? null;
}

/** Moves the endgame's review date: back in 5 minutes after a fail, further away after each solve. */
async function scheduleReview(admin: SupabaseClient, userId: string, endgameId: string, solved: boolean) {
    const { data, error } = await admin.from('endgame_reviews').select('gap_minutes').eq('user_id', userId).eq('endgame_id', endgameId).maybeSingle();
    if (error) throw error;
    const gap = nextReviewGap((data as { gap_minutes: number } | null)?.gap_minutes ?? null, solved);
    if (gap === null) return;
    const { error: writeError } = await admin.from('endgame_reviews').upsert({
        user_id: userId,
        endgame_id: endgameId,
        gap_minutes: gap,
        due_at: new Date(Date.now() + gap * 60000).toISOString()
    });
    if (writeError) throw writeError;
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
        // Check a few candidates at once rather than one after another, so the next position loads quickly.
        for (let round = 0; round < 2; round++) {
            const candidates = Array.from({ length: 4 }, () => transformPosition(endgame.fen, endgame.playerColor, randomTransform(endgame.fen, true)))
                .filter((v): v is { fen: string; playerColor: Colour } => v !== null);
            const outcomes = await Promise.all(candidates.map(v => playerOutcome(v.fen, v.playerColor)));
            const match = candidates.find((_, i) => outcomes[i] && matchesTarget(outcomes[i]!, endgame.target));
            if (match) return match;
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
    /** Share of the full rating gain earned: 1 for a clean solve, as little as 0.25 for a slow one, 0 for a fail. */
    score: number;
}

/**
 * Closes an open attempt, moves the player's and the endgame's ratings by `score` (see solveScore), updates the
 * review schedule and pays +5 points for each new 100 the best rating passes. Returns null if the attempt was
 * already closed (a double submit), so it is never counted twice.
 */
export async function closeAttempt(admin: SupabaseClient, attempt: AttemptRow, solved: boolean, score = solved ? 1 : 0): Promise<AttemptResult | null> {
    const [endgames, stats] = await Promise.all([currentEndgames(admin), trainerStats(admin, attempt.user_id)]);
    const endgame = endgames.find(e => e.id === attempt.endgame_id);
    const change = endgame ? ratingChange(stats.rating, endgame.rating, score, stats.played) : 0;
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
    // These don't depend on each other, so they run together to keep the result quick.
    const updateProfile = async () => {
        const { error } = await admin
            .from('profiles')
            .update({ endgame_rating: rating, endgame_best: best, endgame_played: played, updated_at: new Date().toISOString() })
            .eq('id', attempt.user_id);
        if (error) throw error;
    };
    // The endgame moves the other way: up when failed, down when solved.
    const adjustEndgame = async () => {
        if (!endgame) return;
        const { error } = await admin.rpc('adjust_endgame_rating', {
            p_endgame: endgame.id,
            p_start: TRAINER_ENDGAMES.find(e => e.id === endgame.id)!.rating,
            p_change: endgameRatingChange(endgame.rating, stats.rating, score)
        });
        if (error) throw error;
    };
    const payMilestones = async () => {
        const paid = await Promise.all(newMilestones(stats.best, best).map(milestone =>
            awardPoints(admin, attempt.user_id, 'endgame', `trainer-best-${milestone}`, BEST_RATING_POINTS, { milestone })));
        return paid.filter(p => p.awarded).length * BEST_RATING_POINTS;
    };
    const [, , , pointsAwarded] = await Promise.all([
        updateProfile(),
        adjustEndgame(),
        scheduleReview(admin, attempt.user_id, attempt.endgame_id, solved),
        payMilestones()
    ]);

    return { rating, best, played, provisional: played < LEADERBOARD_MIN_PLAYED, change: rating - stats.rating, pointsAwarded, score };
}

/** The player's latest attempt that has been shown (open or finished), ignoring a prepared one. */
export async function latestAttempt(admin: SupabaseClient, userId: string): Promise<AttemptRow | null> {
    const { data, error } = await admin
        .from('endgame_attempts')
        .select(ATTEMPT_COLUMNS)
        .eq('user_id', userId)
        .neq('status', 'queued')
        .order('created_at', { ascending: false })
        .limit(1);
    if (error) throw error;
    return (data?.[0] ?? null) as AttemptRow | null;
}

export interface NewAttempt {
    attempt: { id: string; fen: string; player_color: string; optimal_moves: number | null };
    endgame: TrainerEndgame;
    stats: TrainerStats;
    review: boolean;
}

/**
 * Picks the next endgame (a failed one due for review first, otherwise one near the player's rating, never
 * `lastId` again), makes a checked variation and saves it as an attempt with `status`: 'open' to play now,
 * or 'queued' to be prepared in the background. Returns null if one with that status already exists.
 */
export async function createAttempt(admin: SupabaseClient, userId: string, lastId: string | null, status: 'open' | 'queued'): Promise<NewAttempt | null> {
    const [stats, endgames, reviewId] = await Promise.all([trainerStats(admin, userId), currentEndgames(admin), dueReview(admin, userId, lastId)]);
    const endgame = endgames.find(e => e.id === reviewId) ?? pickEndgame(endgames, stats.rating, lastId);
    const variation = await makeVariation(endgame);
    const optimal = endgame.target === 'win' ? await fastestMate(variation.fen, variation.playerColor) : null;

    const { data, error } = await admin
        .from('endgame_attempts')
        .insert({ user_id: userId, endgame_id: endgame.id, fen: variation.fen, player_color: variation.playerColor, rating_before: stats.rating, optimal_moves: optimal, status })
        .select('id')
        .single();
    if (error) {
        if ((error as { code?: string }).code === '23505') return null;
        throw error;
    }
    return {
        attempt: { id: (data as { id: string }).id, fen: variation.fen, player_color: variation.playerColor, optimal_moves: optimal },
        endgame,
        stats,
        review: reviewId === endgame.id
    };
}

/** Turns the player's prepared position into the one they are playing now, or null if none is ready. */
export async function activateQueued(admin: SupabaseClient, userId: string, ratingNow: number): Promise<AttemptRow | null> {
    const { data, error } = await admin
        .from('endgame_attempts')
        .update({ status: 'open', rating_before: ratingNow, created_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'queued')
        .select(ATTEMPT_COLUMNS);
    if (error) throw error;
    return (data?.[0] ?? null) as AttemptRow | null;
}
