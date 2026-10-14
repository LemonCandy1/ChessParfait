import type { TrainingLog } from './training';

export interface TrainingOverview {
    planId: string | null;
    defaultPlanId: string;
    logs: TrainingLog[];
    streak: number;
}

export interface TrainingSaveResult {
    log: TrainingLog;
    pointsAwarded: number;
    bonus: number;
    totalPoints: number;
    streak: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data as T;
}

const post = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

export const getTraining = (from: string, to: string, today: string) =>
    request<TrainingOverview>(`/api/training?from=${from}&to=${to}&today=${today}`);

export const saveTrainingPlan = (planId: string) =>
    request<{ planId: string }>('/api/training/plan', post({ planId }));

export const saveTrainingDay = (day: string, planId: string, completedItems: string[]) =>
    request<TrainingSaveResult>('/api/training/log', post({ day, planId, completedItems }));
