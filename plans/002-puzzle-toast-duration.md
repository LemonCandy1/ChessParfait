# 002 — Fix Puzzle Success Toast Duration and Properties

- **Status**: DONE
- **Commit**: abe3c08
- **Severity**: HIGH
- **Category**: Easing & duration / Performance
- **Estimated scope**: 1 file (`src/pages/TrainingPuzzles.tsx`), ~20 lines changed

## Problem

When completing a chess puzzle in `src/pages/TrainingPuzzles.tsx`, the success toast uses a sluggish 700ms transition with `transition-all` and an excessive 10% scale change:

```tsx
/* src/pages/TrainingPuzzles.tsx:769-775 — current */
{/* Success Toast */}
<div className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-plum text-cream px-8 py-4 rounded-3xl font-black shadow-2xl flex items-center gap-3.5 z-100 transition-all duration-700 border border-white/10 text-sm ${showSuccess ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
    }`}>
    <div className="w-8 h-8 rounded-full bg-berry flex items-center justify-center text-white shadow-inner shrink-0">
        <Sparkles size={16} />
    </div>
```

1. **Duration**: 700ms is more than double the acceptable feedback budget (150–250ms). The user has already solved the puzzle and wants immediate confirmation; the toast floats up in slow motion.
2. **Properties**: `transition-all` animates layout and non-composite properties rather than strictly `transform` and `opacity`.
3. **Scale**: Scaling from `scale-90` (0.90) exaggerates depth and warps typography during entry.

## Target

Restrict transitions to `transform` and `opacity`. Cut duration to 220ms enter (`var(--ease-out)`) and 160ms exit (`var(--ease-in)`). Scale subtly from `scale(0.96)` and `translateY(16px)` instead of `scale-90 translate-y-12`.

```tsx
/* target JSX in src/pages/TrainingPuzzles.tsx */
<div
    className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-plum text-cream px-8 py-4 rounded-3xl font-black shadow-2xl flex items-center gap-3.5 z-100 border border-white/10 text-sm transition-[transform,opacity] ${
        showSuccess
            ? 'opacity-100 translate-y-0 scale-100 duration-220 ease-[cubic-bezier(0.23,1,0.32,1)]'
            : 'opacity-0 translate-y-4 scale-[0.96] duration-160 ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none'
    }`}
>
```

## Repo conventions to follow

- Tailwind utility classes are combined with conditional template strings.
- Custom easing curve: `cubic-bezier(0.23, 1, 0.32, 1)` for entrances, `cubic-bezier(0.4, 0, 1, 1)` for exits.

## Steps

1. In `src/pages/TrainingPuzzles.tsx`, locate the Success Toast container around line 770.
2. Replace `transition-all duration-700` with `transition-[transform,opacity]`.
3. Update the active state (`showSuccess === true`):
   - Set duration to `duration-220`.
   - Set easing to `ease-[cubic-bezier(0.23,1,0.32,1)]`.
   - Keep `opacity-100 translate-y-0 scale-100`.
4. Update the inactive state (`showSuccess === false`):
   - Replace `translate-y-12 scale-90` with `translate-y-4 scale-[0.96]`.
   - Set duration to `duration-160`.
   - Set easing to `ease-[cubic-bezier(0.4,0,1,1)]`.
   - Keep `opacity-0 pointer-events-none`.

## Boundaries

- Do NOT change the toast trigger logic, point calculations, or timer delays.
- Do NOT alter toast content, icons, or text.
- Do NOT touch other pages.

## Verification

- **Mechanical**: Run `npm run build` and ensure TypeScript and Vite compile with 0 errors.
- **Feel check**:
  - Navigate to `http://localhost:5173/TrainingPuzzles`.
  - Solve any weekly puzzle (or trigger `setShowSuccess(true)` in state).
  - Confirm the toast pops up cleanly and settles in under a quarter of a second without feeling sluggish.
  - Wait for dismissal; confirm the toast exits swiftly without lingering.
- **Done when**: The toast provides crisp, immediate reward feedback without stalling the user's focus.
