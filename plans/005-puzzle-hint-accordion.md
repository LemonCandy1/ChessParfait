# 005 — Smooth Tactical Clue Accordion Expansion

- **Status**: DONE
- **Commit**: abe3c08
- **Severity**: MEDIUM
- **Category**: Interruptibility / Missed opportunities
- **Estimated scope**: 1 file (`src/pages/TrainingPuzzles.tsx`), ~25 lines changed

## Problem

In `src/pages/TrainingPuzzles.tsx`, clicking the hint button conditionally mounts `{showHint && <div ...>}` directly:

```tsx
/* src/pages/TrainingPuzzles.tsx:726-734 — current */
{/* Hint Card */}
{showHint && (
    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-300">
        <Lightbulb className="text-amber-600 shrink-0 mt-0.5" size={16} />
        <div>
            <span className="block font-black uppercase tracking-wider text-[10px] text-amber-700 mb-0.5">Tactical Clue</span>
            <span>{currentHint}</span>
        </div>
    </div>
)}
```

When clicked, the hint card teleports into the layout, instantaneously shoving the status card and bottom navigation down by ~70px. The abrupt layout jump disorients the user's cursor and gaze right as they are analyzing the board.

## Target

Implement an animated CSS grid-row expansion (`grid-template-rows: 0fr` to `1fr`) so the container smoothly unrolls over 200ms (`var(--ease-out)`), while the clue content fades in over 160ms. Toggling hint off reverses smoothly without layout snaps.

```tsx
/* target JSX structure */
<div
    className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        showHint ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
    }`}
>
    <div className="overflow-hidden">
        <div
            className={`p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2.5 transition-opacity duration-160 ${
                showHint ? 'opacity-100 delay-50' : 'opacity-0'
            }`}
        >
            <Lightbulb className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <div>
                <span className="block font-black uppercase tracking-wider text-[10px] text-amber-700 mb-0.5">Tactical Clue</span>
                <span>{currentHint}</span>
            </div>
        </div>
    </div>
</div>
```

## Repo conventions to follow

- CSS grid-row accordion trick (`grid-rows-[0fr]` to `grid-rows-[1fr]`) to animate height without hardcoding fixed pixel values.
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)`.

## Steps

1. In `src/pages/TrainingPuzzles.tsx`, wrap the hint card in a dual-layer grid container:
   - Outer layer: `grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${showHint ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`.
   - Middle layer: `overflow-hidden`.
   - Inner card: apply `transition-opacity duration-160` based on `showHint`.
2. Remove the ad-hoc `animate-in fade-in duration-300` class.

## Boundaries

- Do NOT alter hint extraction logic or puzzle data.
- Do NOT change the colors or icon of the hint card.
- Do NOT change layout or spacing of the surrounding board elements.

## Verification

- **Mechanical**: Run `npm run build` and ensure exit code 0.
- **Feel check**:
  - Go to `http://localhost:5173/TrainingPuzzles`.
  - Pick a puzzle and click the "Need a Hint?" button.
  - Confirm the clue rolls down smoothly without an instantaneous jarring jump.
  - Click the button again (or reset); confirm it smoothly rolls back up.
- **Done when**: The clue appears like an expanding physical drawer rather than a teleporting box.
