import type { SupabaseClient, User } from '@supabase/supabase-js';

// Player data lives in public.profiles and public.points_ledger (see the 20261010 migration),
// not in auth user_metadata. This module exports no onRequest handlers, so Pages does not route it.

export interface PawnStats {
    whiteWins: number;
    whiteLosses: number;
    blackWins: number;
    blackLosses: number;
}

export interface ProfileRow {
    id: string;
    username: string | null;
    email: string | null;
    real_email: string | null;
    avatar_url: string | null;
    points: number;
    pawn_stats: PawnStats;
    training_plan: string | null;
    is_coach: boolean;
    endgame_rating: number;
    endgame_best: number;
    endgame_played: number;
    created_at: string;
}

export interface SolvedPuzzle {
    id: string;
    week: number;
    difficulty: string;
    title: string;
    points: number;
    solvedAt: string;
}

export type PointsSource = 'puzzle' | 'endgame' | 'training';

const PROFILE_COLUMNS = 'id, username, email, real_email, avatar_url, points, pawn_stats, training_plan, is_coach, endgame_rating, endgame_best, endgame_played, created_at';

export const VIRTUAL_EMAIL_DOMAIN = '@chessparfait.com';

/** Postgres unique-violation code (e.g. a username taken by someone else). */
export const UNIQUE_VIOLATION = '23505';

/**
 * The user's profile. Every account gets one from a database trigger; this also creates it if an
 * account somehow has none, so callers can rely on a row existing.
 */
export async function getProfile(admin: SupabaseClient, user: User): Promise<ProfileRow> {
    const read = () => admin.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle();

    const { data, error } = await read();
    if (error) throw error;
    if (data) return data as ProfileRow;

    const { error: insertError } = await admin
        .from('profiles')
        .upsert({ id: user.id, email: user.email?.toLowerCase() ?? null }, { onConflict: 'id', ignoreDuplicates: true });
    if (insertError) throw insertError;

    const { data: created, error: rereadError } = await read();
    if (rereadError || !created) throw rereadError ?? new Error('Profile could not be created.');
    return created as ProfileRow;
}

/**
 * Finds the profile using `username`, ignoring case. Goes through a database function so the match
 * is exact (no wildcards) and uses the case-insensitive unique index.
 */
export async function findProfileByUsername(admin: SupabaseClient, username: string): Promise<ProfileRow | null> {
    const { data, error } = await admin.rpc('find_profile_by_username', { p_username: username.trim() });
    if (error) throw error;
    return ((Array.isArray(data) ? data[0] : data) as ProfileRow | undefined) ?? null;
}

/** Finds the profile whose sign-in email is `email` (case-insensitive). */
export async function findProfileByEmail(admin: SupabaseClient, email: string): Promise<ProfileRow | null> {
    const { data, error } = await admin
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('email', email.trim().toLowerCase())
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow) ?? null;
}

export async function updateProfile(admin: SupabaseClient, userId: string, changes: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'points' | 'is_coach' | 'endgame_rating' | 'endgame_best' | 'endgame_played'>>) {
    const { error } = await admin
        .from('profiles')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', userId);
    if (error) throw error;
}

/** The user's solved puzzles, newest first, in the shape the site has always used. */
export async function solvedPuzzlesFor(admin: SupabaseClient, userId: string): Promise<SolvedPuzzle[]> {
    const { data, error } = await admin
        .from('points_ledger')
        .select('source_id, points, details, created_at')
        .eq('user_id', userId)
        .eq('source', 'puzzle')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: { source_id: string; points: number; details: Record<string, unknown>; created_at: string }) => ({
        id: row.source_id,
        week: Number(row.details?.week) || 0,
        difficulty: String(row.details?.difficulty ?? ''),
        title: String(row.details?.title ?? row.details?.difficulty ?? ''),
        points: row.points,
        solvedAt: row.created_at
    }));
}

/**
 * Pays a reward once. The database records it and adds the points in one transaction, so
 * parallel requests can neither lose points nor pay the same reward twice.
 */
export async function awardPoints(
    admin: SupabaseClient,
    userId: string,
    source: PointsSource,
    sourceId: string,
    points: number,
    details: Record<string, unknown> = {}
): Promise<{ awarded: boolean; totalPoints: number }> {
    const { data, error } = await admin.rpc('award_points', {
        p_user: userId,
        p_source: source,
        p_source_id: sourceId,
        p_points: points,
        p_details: details
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { awarded: boolean; total_points: number } | undefined;
    return { awarded: !!row?.awarded, totalPoints: row?.total_points ?? 0 };
}

/** The real email to show the player, hiding the virtual address used by username accounts. */
export const visibleEmail = (email: string | null | undefined) =>
    email && !email.endsWith(VIRTUAL_EMAIL_DOMAIN) ? email : undefined;

/** The user object the site's AuthContext expects. */
export function clientUser(user: User, profile: ProfileRow, solvedPuzzles: SolvedPuzzle[], email: string | undefined) {
    return {
        id: user.id,
        username: profile.username || user.user_metadata?.username || '',
        email,
        avatarUrl: profile.avatar_url || undefined,
        pawnStats: profile.pawn_stats,
        createdAt: user.created_at,
        points: profile.points,
        isCoach: profile.is_coach,
        endgameRating: profile.endgame_rating,
        endgameBest: profile.endgame_best,
        endgamePlayed: profile.endgame_played,
        solvedPuzzles
    };
}

/** Profile, puzzles and client user in one go, for the sign-in endpoints. */
export async function loadClientUser(admin: SupabaseClient, user: User, email: string | undefined) {
    const [profile, solvedPuzzles] = await Promise.all([getProfile(admin, user), solvedPuzzlesFor(admin, user.id)]);
    return { profile, user: clientUser(user, profile, solvedPuzzles, email) };
}
