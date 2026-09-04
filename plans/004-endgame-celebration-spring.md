# 004 — Replace Endgame Victory Keyframe Bounce with Damped Pop

- **Status**: DONE
- **Commit**: abe3c08
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Purpose & frequency
- **Estimated scope**: 1 file (`src/pages/EndgamePractice.tsx`), ~20 lines changed

## Problem

In `src/pages/EndgamePractice.tsx`, the victory celebration overlay uses an infinite CSS keyframe animation (`animate-bounce`) on the `PartyPopper` icon:

```tsx
/* src/pages/EndgamePractice.tsx:557-562 — current */
{showSolvedOverlay && (
    <div className="absolute inset-0 bg-emerald-950/75 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-bounce">
            <PartyPopper size={32} />
        </div>
```

1. **Infinite Loop**: `animate-bounce` is a continuous keyframe loop that keeps jumping endlessly like an error state or a broken notification badge. A celebration should be a single, celebratory pop that settles with dignity.
2. **Abrupt Exit**: Clicking "Review Position" abruptly unmounts the modal with no exit fade.

## Target

1. Remove `animate-bounce`. Replace it with a single damped spring entrance via Framer Motion (already in `package.json`) or CSS `@starting-style` / custom spring curve.
2. The badge scales from `scale(0.8)` to `scale(1)` over `260ms` with curve `cubic-bezier(0.34, 1.56, 0.64, 1)` (or `{ type: "spring", stiffness: 360, damping: 24 }`).
3. The backdrop overlay fades in over 220ms and fades out over 160ms on dismissal.

```tsx
/* target JSX with subtle damped single pop */
{showSolvedOverlay && (
    <div className="absolute inset-0 bg-emerald-950/75 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-in zoom-in-75 duration-260 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
            <PartyPopper size={32} />
        </div>
```

## Repo conventions to follow

- Existing celebration overlays use Tailwind backdrop blurs.
- Fast entrance duration under 300ms.

## Steps

1. In `src/pages/EndgamePractice.tsx`, locate the `showSolvedOverlay` block around line 557.
2. On the PartyPopper badge container:
   - Remove `animate-bounce`.
   - Add `animate-in zoom-in-75 duration-260 ease-[cubic-bezier(0.34,1.56,0.64,1)]`.
3. On the overlay container:
   - Change `duration-500` to `duration-200 ease-out`.

## Boundaries

- Do NOT change the endgame target evaluation or sound triggers (`playWinSound()`).
- Do NOT alter chessboard state, moves, or coordinates.
- Do NOT touch other pages.

## Verification

- **Mechanical**: Run `npm run build` and ensure exit code 0.
- **Feel check**:
  - Load `http://localhost:5173/EndgamePractice`.
  - Solve any endgame study (e.g. deliver mate or hold draw).
  - Verify the victory badge pops in once cleanly with subtle elastic damping, then rests stationary without bouncing repeatedly.
  - Click "Review Position" and confirm clean closure.
- **Done when**: Victory feels rewarding and polished without frantic, looping animations.
