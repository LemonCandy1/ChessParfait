export interface LevelTier {
    level: number;
    title: string;
    minPoints: number;
    maxPoints: number;
    badgeName: string;
}

export const LEVEL_TIERS: LevelTier[] = [
    { level: 1, title: 'Pawn Blunderer', minPoints: 0, maxPoints: 100, badgeName: 'Pawn' },
    { level: 2, title: 'Trojan\'s Knight', minPoints: 100, maxPoints: 250, badgeName: 'Knight' },
    { level: 3, title: 'Bishop Tactician', minPoints: 250, maxPoints: 500, badgeName: 'Bishop' },
    { level: 4, title: 'Rook Master', minPoints: 500, maxPoints: 900, badgeName: 'Rook' },
    { level: 5, title: 'Queen Sovereign', minPoints: 900, maxPoints: 1500, badgeName: 'Queen' },
    { level: 6, title: 'Grandmaster Parfait', minPoints: 1500, maxPoints: 2500, badgeName: 'King' },
    { level: 7, title: 'Legend', minPoints: 2500, maxPoints: 4000, badgeName: 'Crown' }
];

export interface LevelInfo {
    level: number;
    title: string;
    badgeName: string;
    points: number;
    currentTierMin: number;
    nextTierPoints: number;
    pointsToNextLevel: number;
    progressPercentage: number;
    isMaxLevel: boolean;
}

/**
 * Calculates current level, title, and progress toward the next level based on total points.
 */
export function calculateLevelInfo(totalPoints: number = 0): LevelInfo {
    const points = Math.max(0, Math.floor(totalPoints));

    for (let i = 0; i < LEVEL_TIERS.length; i++) {
        const tier = LEVEL_TIERS[i];
        if (points < tier.maxPoints || i === LEVEL_TIERS.length - 1) {
            const currentTierMin = tier.minPoints;
            const nextTierPoints = tier.maxPoints;
            const isMaxLevel = i === LEVEL_TIERS.length - 1 && points >= tier.maxPoints;

            const span = nextTierPoints - currentTierMin;
            const earnedInTier = Math.max(0, points - currentTierMin);
            const progressPercentage = isMaxLevel
                ? 100
                : Math.min(100, Math.max(0, Math.round((earnedInTier / span) * 100)));
            const pointsToNextLevel = isMaxLevel ? 0 : Math.max(0, nextTierPoints - points);

            return {
                level: tier.level,
                title: tier.title,
                badgeName: tier.badgeName,
                points,
                currentTierMin,
                nextTierPoints,
                pointsToNextLevel,
                progressPercentage,
                isMaxLevel
            };
        }
    }

    // Default fallback
    return {
        level: 1,
        title: LEVEL_TIERS[0].title,
        badgeName: LEVEL_TIERS[0].badgeName,
        points,
        currentTierMin: 0,
        nextTierPoints: 100,
        pointsToNextLevel: Math.max(0, 100 - points),
        progressPercentage: Math.min(100, Math.max(0, points)),
        isMaxLevel: false
    };
}

/**
 * Formats points awarded for puzzle difficulties.
 */
export const DIFFICULTY_POINTS: Record<string, number> = {
    'Piece of Cake': 25,
    'Hard Tart': 50,
    'Cherry Bomb': 100,
    'Challenge': 100
};

/**
 * Formats a join date timestamp into a human-friendly string and relative age.
 */
export function formatJoinDate(isoDateString?: string): { formattedDate: string; relativeTime: string } {
    if (!isoDateString) {
        return { formattedDate: 'Recently', relativeTime: 'New Member' };
    }

    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) {
            return { formattedDate: 'Recently', relativeTime: 'New Member' };
        }

        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let relativeTime = 'Joined today';
        if (diffDays === 1) {
            relativeTime = '1 day ago';
        } else if (diffDays > 1 && diffDays < 7) {
            relativeTime = `${diffDays} days ago`;
        } else if (diffDays >= 7 && diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            relativeTime = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        } else if (diffDays >= 30 && diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            relativeTime = months === 1 ? '1 month ago' : `${months} months ago`;
        } else if (diffDays >= 365) {
            const years = Math.floor(diffDays / 365);
            relativeTime = years === 1 ? '1 year ago' : `${years} years ago`;
        }

        return { formattedDate, relativeTime };
    } catch {
        return { formattedDate: 'Recently', relativeTime: 'New Member' };
    }
}
