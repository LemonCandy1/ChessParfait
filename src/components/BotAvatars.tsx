import type { ComponentType, SVGProps } from 'react';
import type { PracticeOpponent } from '../lib/stockfishEngine';

// Cartoon avatars for the practice opponents. Drawn on a 64×64 grid with plum outlines
// so they match the site's palette. Each one reads at 20px as well as at 64px.

const OUTLINE = '#4A154B';

type AvatarProps = SVGProps<SVGSVGElement> & { size?: number | string; title?: string };

function Svg({ size = 40, title, children, ...props }: AvatarProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            {...props}
        >
            {title && <title>{title}</title>}
            <g stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                {children}
            </g>
        </svg>
    );
}

/** Maia 1100: a happy slice of strawberry shortcake. */
export function StrawberryShortcakeAvatar(props: AvatarProps) {
    return (
        <Svg {...props}>
            {/* Cake body: sponge, cream and jam layers */}
            <rect x="9" y="27" width="46" height="29" rx="7" fill="#F7D9A8" />
            <path d="M9 39h46" />
            <rect x="9" y="37" width="46" height="5" fill="#FFF7EC" stroke="none" />
            <path d="M9 37h46M9 42h46" />
            <path d="M14 39.5h4M23 39.5h4M32 39.5h4M41 39.5h4" stroke="#E8456B" strokeWidth={3} />
            {/* Whipped cream top */}
            <path d="M8 30c0-4 3-6 6-6 1-4 5-5 8-3 2-3 7-3 9 0 2-3 7-3 9 0 3-2 7-1 8 3 3 0 6 2 6 6 0 2-1 3-3 3H11c-2 0-3-1-3-3z" fill="#FFFBF4" />
            {/* Strawberry */}
            <path d="M32 21c-6 0-9-4-9-8 0-3 3-4 9-4s9 1 9 4c0 4-3 8-9 8z" fill="#E8456B" />
            <path d="M27 9c2-3 3-4 5-4s3 1 5 4c-2 1-3 1-5 0-2 1-3 1-5 0z" fill="#4CAF6A" />
            <g stroke="none" fill="#FFE3A3">
                <circle cx="29" cy="13" r="0.9" />
                <circle cx="35" cy="13" r="0.9" />
                <circle cx="32" cy="16.5" r="0.9" />
            </g>
            {/* Face: closed happy eyes, big smile, blush */}
            <path d="M21 48c1.5-2 4.5-2 6 0M37 48c1.5-2 4.5-2 6 0" />
            <path d="M28 51c1.5 2.5 6.5 2.5 8 0" />
            <g stroke="none" fill="#F49AB0" opacity={0.85}>
                <ellipse cx="17.5" cy="51.5" rx="3" ry="1.8" />
                <ellipse cx="46.5" cy="51.5" rx="3" ry="1.8" />
            </g>
        </Svg>
    );
}

/** Maia 1500: a confident lemon tart. */
export function LemonTartAvatar(props: AvatarProps) {
    return (
        <Svg {...props}>
            {/* Fluted pastry case */}
            <path
                d="M7 30h50l-4 22c-.5 3-3 5-6 5H17c-3 0-5.5-2-6-5L7 30z"
                fill="#E9B866"
            />
            <path d="M15 33l1.5 21M23 33l.8 22M32 33v22M41 33l-.8 22M49 33l-1.5 21" strokeWidth={1.5} opacity={0.35} />
            {/* Lemon curd surface */}
            <ellipse cx="32" cy="30" rx="26" ry="8" fill="#FFD84D" />
            <ellipse cx="32" cy="29" rx="18" ry="4.5" fill="#FFE98A" stroke="none" />
            {/* Lemon slice on top */}
            <path d="M24 26a8 8 0 0 1 16 0z" fill="#FFF3B0" />
            <path d="M32 26v-7M32 26l-5.5-5M32 26l5.5-5" strokeWidth={1.5} />
            {/* Mint leaf */}
            <path d="M40 23c3-4 7-4 9-3-1 3-5 5-9 3z" fill="#4CAF6A" />
            {/* Face: calm eyes and a confident smirk */}
            <circle cx="23" cy="43" r="2.4" fill={OUTLINE} stroke="none" />
            <circle cx="41" cy="43" r="2.4" fill={OUTLINE} stroke="none" />
            <circle cx="23.8" cy="42.2" r="0.8" fill="#fff" stroke="none" />
            <circle cx="41.8" cy="42.2" r="0.8" fill="#fff" stroke="none" />
            <path d="M28 49c3 1.5 6 1.5 9-1" />
            <g stroke="none" fill="#F4A261" opacity={0.6}>
                <ellipse cx="17" cy="48" rx="2.6" ry="1.6" />
                <ellipse cx="47" cy="48" rx="2.6" ry="1.6" />
            </g>
        </Svg>
    );
}

/** Maia 1900: an angry cherry. */
export function AngryCherryAvatar(props: AvatarProps) {
    return (
        <Svg {...props}>
            {/* Stem and leaf */}
            <path d="M33 22c1-7 5-13 12-16" strokeWidth={3} />
            <path d="M42 9c5-3 11-2 14 1-4 4-10 4-14-1z" fill="#4CAF6A" />
            {/* Cherry */}
            <path
                d="M32 58c-13 0-23-8-23-19 0-11 8-17 15-17 3 0 5 1 8 2 3-1 5-2 8-2 7 0 15 6 15 17 0 11-10 19-23 19z"
                fill="#D7263D"
            />
            <path d="M18 33c2-4 5-6 9-6" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} />
            {/* Angry brows and eyes */}
            <path d="M18 36l9 4M46 36l-9 4" strokeWidth={3} />
            <circle cx="24" cy="44" r="2.6" fill={OUTLINE} stroke="none" />
            <circle cx="40" cy="44" r="2.6" fill={OUTLINE} stroke="none" />
            {/* Gritted teeth frown */}
            <path d="M25 52c2-3 12-3 14 0z" fill="#fff" />
            <path d="M29.5 50v2.3M34.5 50v2.3" strokeWidth={1.5} />
            {/* Steam puffs */}
            <path d="M10 22c-2-2 0-4 2-3M54 24c2-2 0-4-2-3" strokeWidth={2} opacity={0.6} />
        </Svg>
    );
}

/** Stockfish: just a computer. */
export function ComputerAvatar(props: AvatarProps) {
    return (
        <Svg {...props}>
            {/* Monitor */}
            <rect x="7" y="9" width="50" height="35" rx="5" fill="#E9E4F0" />
            <rect x="12" y="14" width="40" height="25" rx="2" fill="#2D0D2E" />
            {/* Screen content: evaluation lines and a cursor */}
            <g stroke="#7CE0A3" strokeWidth={2}>
                <path d="M17 20h14M17 25h20M17 30h10" />
            </g>
            <rect x="29" y="28.5" width="4" height="3" fill="#7CE0A3" stroke="none" />
            <circle cx="32" cy="41.5" r="1" fill={OUTLINE} stroke="none" />
            {/* Stand and keyboard */}
            <path d="M27 44l-2 7h14l-2-7" fill="#D5CCE1" />
            <rect x="12" y="51" width="40" height="6" rx="2" fill="#E9E4F0" />
            <path d="M18 54h4M26 54h12M42 54h4" strokeWidth={1.5} />
        </Svg>
    );
}

const AVATARS: Record<PracticeOpponent, ComponentType<AvatarProps>> = {
    maia_1100: StrawberryShortcakeAvatar,
    maia_1500: LemonTartAvatar,
    maia_1900: AngryCherryAvatar,
    stockfish: ComputerAvatar,
};

export function BotAvatar({ opponent, ...props }: AvatarProps & { opponent: PracticeOpponent }) {
    const Avatar = AVATARS[opponent];
    return <Avatar {...props} />;
}
