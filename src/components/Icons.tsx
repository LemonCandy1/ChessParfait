import React from 'react';

export interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

// Pawn Cupcake Icon (Pawn Game)
export function PawnCupcakeIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Cupcake Wrapper */}
            <path d="M7 15L8.5 21H15.5L17 15" />
            <path d="M10 15L10.5 21" />
            <path d="M14 15L13.5 21" />
            
            {/* Frosting Dome */}
            <path d="M6 15C5 13.5 7 11.5 9 12C10 10.5 14 10.5 15 12C17 11.5 19 13.5 18 15Z" />
            
            {/* Chess Pawn Head (Cherry) */}
            <circle cx="12" cy="7" r="2" />
            <path d="M11 9H13" />
        </svg>
    );
}

// Chess Cake Slice Icon (Weekly Puzzles, Piece of Cake)
// A clean, stylized 2D side-facing cake slice with dripping frosting and a cherry on top.
export function ChessCakeSliceIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Cake Slice Base Outline */}
            <path d="M4 14V19L20 18V11" />
            
            {/* Wavy Layer Line inside the cake */}
            <path d="M4 16.5C6 17.5 7 15.5 9 16.5C11 17.5 12 15.5 14 16.5C16 17.5 17 15.5 20 16.5" />
            
            {/* Frosting / Glaze Layer (Top & Dripping Edge) */}
            <path d="M4 13C6 11 14 8 20 10" />
            <path d="M4 13C4.5 14.5 5.5 14.5 6 13.5L8.5 12.8C9 14.3 10 14.3 10.5 12.8L16.5 11.2C17 12.7 18 12.7 18.5 11.2L20 10" />

            {/* Cherry on top */}
            <circle cx="12" cy="7.5" r="1.8" />
            {/* Cherry stem */}
            <path d="M12 5.7C11.5 4 9.5 3 8 2.5" />
        </svg>
    );
}

// Pie Icon (Challenge Roulette, Hard Tart)
export function PieIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Pie Dish Base */}
            <path d="M4 14L6 19H18L20 14" />
            
            {/* Pie Top Crust */}
            <path d="M4 14C4 10.5 20 10.5 20 14Z" />
            <path d="M3 14H21" />
            
            {/* Steam Vents */}
            <path d="M9 12H11" />
            <path d="M13 12H15" />
            <path d="M12 10.5V11.5" />
        </svg>
    );
}

// Ghost Chef Icon (Imposter Chess)
export function GhostChefIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Minimal Ghost Body */}
            <path d="M6 12C6 8.7 8.7 6 12 6C15.3 6 18 8.7 18 12V19C17 18 16 18 15 19C14 18 13 18 12 19C11 18 10 18 9 19C8 18 7 18 6 19V12Z" />
            
            {/* Chef's Hat */}
            <path d="M10 6V4.5C10 3.5 11 3 12 3C13 3 14 3.5 14 4.5V6" />
            
            {/* Simple Mask */}
            <rect x="8" y="9.5" width="8" height="2" rx="1" fill="currentColor" />
            
            {/* Cutout eyes */}
            <circle cx="10.5" cy="10.5" r="0.5" fill="white" />
            <circle cx="13.5" cy="10.5" r="0.5" fill="white" />
            
            {/* Small Smile */}
            <path d="M11 14.5C11 15 13 15 13 14.5" />
        </svg>
    );
}

// Snowflake Icon (Brain Freeze)
export function SnowflakeIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Main axes */}
            <path d="M12 2V22" />
            <path d="M2 12H22" />
            <path d="M4.9 4.9L19.1 19.1" />
            <path d="M4.9 19.1L19.1 4.9" />
            
            {/* Branch Chevrons */}
            <path d="M9.5 5.5L12 8L14.5 5.5" />
            <path d="M9.5 18.5L12 16L14.5 18.5" />
            <path d="M5.5 9.5L8 12L5.5 14.5" />
            <path d="M18.5 9.5L16 12L18.5 14.5" />
        </svg>
    );
}

// Skull Icon (Challenge)
export function SkullIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Skull Outline */}
            <path d="M6 12C6 8.7 8.7 6 12 6C15.3 6 18 8.7 18 12C18 14.5 16 15 16 17V19C16 19.5 15.5 20 15 20H9C8.5 20 8 19.5 8 19V17C8 15 6 15 6 12Z" />
            
            {/* Eye Holes */}
            <circle cx="10" cy="11.5" r="1.2" />
            <circle cx="14" cy="11.5" r="1.2" />
            
            {/* Nose cavity */}
            <path d="M12 14L11.5 15H12.5Z" />
            
            {/* Teeth */}
            <path d="M10 18V20" />
            <path d="M12 18V20" />
            <path d="M14 18V20" />
        </svg>
    );
}

// Chess Pawn Icon (Pawn Game)
export function ChessPawnIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="5.5" r="2.5" />
            <path d="M9 9.5C9.5 9, 14.5 9, 15 9.5" />
            <path d="M10 9.5C10 13, 8.5 18, 6.5 20H17.5C15.5 18, 14 13, 14 9.5Z" />
            <path d="M5 21.5H19" />
        </svg>
    );
}

// Roulette Icon (Challenge Roulette)
export function RouletteIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 2V5" />
            <path d="M12 19V22" />
            <path d="M2 12H5" />
            <path d="M19 12H22" />
            <path d="M4.9 4.9L7 7" />
            <path d="M17 17L19.1 19.1" />
            <path d="M4.9 19.1L7 17" />
            <path d="M17 7L19.1 4.9" />
        </svg>
    );
}

// Puzzle Icon (Weekly Puzzles)
export function PuzzleIcon({ size = 24, ...props }: CustomIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M6 6H10C10 4, 11 3.5, 12 3.5C13 3.5, 14 4, 14 6H18V10C16.5 10, 16 11, 16 12C16 13, 16.5 14, 18 14V18H6V14C4.5 14, 4 13, 4 12C4 11, 4.5 10, 6 10Z" />
        </svg>
    );
}
