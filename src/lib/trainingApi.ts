import type { TrainingLog } from './training';

export interface TrainingHistory {
    logs: TrainingLog[];
    streak: number;
    /** Missed days in the range that were used as the week's rest day. */
    restDays: string[];
}

export type CoachStatus = 'pending' | 'accepted' | null;

export interface TrainingOverview extends TrainingHistory {
    planId: string | null;
    defaultPlanId: string;
    coach: CoachStatus;
}

export interface CoachStudent extends TrainingHistory {
    id: string;
    username: string;
    status: 'pending' | 'accepted';
    planId: string | null;
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

const post = (body: unknown, method = 'POST'): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

export const getTraining = (from: string, to: string, today: string) =>
    request<TrainingOverview>(`/api/training?from=${from}&to=${to}&today=${today}`);

export const saveTrainingPlan = (planId: string) =>
    request<{ planId: string }>('/api/training/plan', post({ planId }));

export const saveTrainingDay = (day: string, planId: string, completedItems: string[]) =>
    request<TrainingSaveResult>('/api/training/log', post({ day, planId, completedItems }));

/** Student: accept the coach's invite, or decline it / stop sharing. */
export const setCoachSharing = (action: 'accept' | 'stop') =>
    request<{ coach: CoachStatus }>('/api/training/coach', post({ action }));

export const getStudents = (today: string) =>
    request<{ students: CoachStudent[] }>(`/api/coach/students?today=${today}`);

export const inviteStudent = (username: string) =>
    request<{ success: true }>('/api/coach/students', post({ username }));

export const removeStudent = (studentId: string) =>
    request<{ success: true }>('/api/coach/students', post({ studentId }, 'DELETE'));

export const getStudentTraining = (studentId: string, from: string, to: string, today: string) =>
    request<TrainingHistory>(`/api/coach/students/${studentId}?from=${from}&to=${to}&today=${today}`);
