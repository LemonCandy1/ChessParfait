import type { Colour } from './endgameTrainer';

export interface TrainerStats {
    rating: number;
    best: number;
    played: number;
    provisional: boolean;
}

export interface TrainerPosition {
    attemptId: string;
    fen: string;
    playerColor: Colour;
    endgame: {
        id: string;
        title: string;
        category: string;
        target: 'win' | 'draw';
        mateRequired: boolean;
        rating: number;
        keyTip: string;
        description: string;
        theoryNotes: string;
    };
    stats: TrainerStats;
    /** True when this endgame is back because the player failed it before. */
    review: boolean;
    /** Fastest mate in moves from this position, when known. */
    fastestMate: number | null;
    /** True when this is an unfinished position handed back to play again. */
    resumed: boolean;
    /** Set when the previous position was skipped and counted as a miss. */
    missed: { change: number } | null;
}

export interface TrainerResult extends TrainerStats {
    change: number;
    pointsAwarded: number;
    solved: boolean;
    /** The browser said solved but the moves didn't check out. */
    rejected: boolean;
    /** Share of the full rating gain earned: 1 for a clean solve, as little as 0.25 for a slow one, 0 for a fail. */
    score: number;
    movesTaken: number | null;
    fastestMate: number | null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data as T;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const getTrainerStats = () => request<TrainerStats>('/api/endgame-trainer');

/** The next position; an unfinished one comes back first. `skip` gives up the open position as a miss instead. */
export const nextPosition = (skip = false) => request<TrainerPosition>('/api/endgame-trainer/next', post({ skip }));

export const sendResult = (attemptId: string, outcome: 'solved' | 'failed', moves: string[]) =>
    request<TrainerResult>('/api/endgame-trainer/result', post({ attemptId, outcome, moves }));
