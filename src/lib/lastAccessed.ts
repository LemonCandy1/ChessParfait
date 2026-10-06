/**
 * Remembers the endgame each user last practiced and the strategy topic they last studied.
 * Stored per account in localStorage, next to the endgame drill progress ("guest" when signed out).
 */

export interface LastPractice {
    endgameId: string;
    at: number;
}

export interface LastStrategy {
    topicId: string;
    title: string;
    step: number; // 0-based step index
    totalSteps: number;
    at: number;
}

type Kind = 'practice' | 'strategy';
type Entries = { practice: LastPractice; strategy: LastStrategy };

const storageKey = (kind: Kind, username?: string | null) =>
    `chessparfait_last_${kind}_${username || 'guest'}`;

export function readLastAccessed<K extends Kind>(kind: K, username?: string | null): Entries[K] | null {
    try {
        const saved = localStorage.getItem(storageKey(kind, username));
        return saved ? (JSON.parse(saved) as Entries[K]) : null;
    } catch {
        return null;
    }
}

export function writeLastAccessed<K extends Kind>(kind: K, username: string | null | undefined, value: Entries[K]): void {
    try {
        localStorage.setItem(storageKey(kind, username), JSON.stringify(value));
    } catch {
        // Storage can be unavailable (private mode, quota); remembering the last endgame is optional.
    }
}

/** "just now", "5 minutes ago", "yesterday", "3 days ago"... */
export function timeAgo(at: number, now: number = Date.now()): string {
    const minutes = Math.floor((now - at) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
}
