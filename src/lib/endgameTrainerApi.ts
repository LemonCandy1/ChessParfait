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
    };
    stats: TrainerStats;
    /** True when this endgame is back because the player failed it before. */
    review: boolean;
    /** Fastest mate in moves from this position, when known. */
    fastestMate: number | null;
    /** Set when the previous position was left open and counted as a miss. */
    missed: { change: number } | null;
}

export interface TrainerResult extends TrainerStats {
    change: number;
    pointsAwarded: number;
    solved: boolean;
    /** The browser said solved but the moves didn't check out. */
    rejected: boolean;
    /** Credit for the attempt: 1 for a clean solve, less for a slow one, 0 for a fail. */
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

export const nextPosition = () => request<TrainerPosition>('/api/endgame-trainer/next', post({}));

export const sendResult = (attemptId: string, outcome: 'solved' | 'failed', moves: string[]) =>
    request<TrainerResult>('/api/endgame-trainer/result', post({ attemptId, outcome, moves }));
