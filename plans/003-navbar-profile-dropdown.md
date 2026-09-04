# 003 — Anchor Profile Dropdown Origin and Add Smooth Exit Transition

- **Status**: DONE
- **Commit**: abe3c08
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Interruptibility
- **Estimated scope**: 1 file (`src/components/Navbar/Navbar.tsx`), ~25 lines changed

## Problem

In `src/components/Navbar/Navbar.tsx`, the profile dropdown uses Tailwind `animate-in fade-in slide-in-from-top-2 duration-300`:

```tsx
/* src/components/Navbar/Navbar.tsx:146 — current */
<div className="absolute right-0 top-full mt-2.5 w-64 bg-white rounded-3xl shadow-2xl border-2 border-plum/15 p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
```

1. **No Exit Transition**: When the user clicks away or toggles the avatar button, `isProfileOpen` becomes false and the dropdown instantly vanishes from the DOM with zero transition, creating an abrupt, jarring visual snap.
2. **Missing Transform Origin**: The menu has no `transform-origin` set, defaulting to center rather than expanding outward from its trigger button in the top right.
3. **Keyframe Entry**: `animate-in` uses CSS keyframes that cannot be reversed or interrupted smoothly mid-transition.

## Target

Anchor `transform-origin: top right`. Use CSS transitions or a lightweight presence state so the dropdown scales smoothly from the trigger avatar (`scale(0.96) translateY(-4px)` to `scale(1) translateY(0)`) over 180ms on open (`var(--ease-out)`), and transitions closed (`scale(0.97)` and `opacity: 0`) over 140ms on close (`var(--ease-in)`).

```tsx
/* target state and container structure */
const [isProfileOpen, setIsProfileOpen] = useState(false);
const [isProfileMounted, setIsProfileMounted] = useState(false);

// Keep mounted during exit transition
useEffect(() => {
    if (isProfileOpen) {
        setIsProfileMounted(true);
    } else {
        const timer = setTimeout(() => setIsProfileMounted(false), 150);
        return () => clearTimeout(timer);
    }
}, [isProfileOpen]);

/* target JSX */
{isProfileMounted && (
    <>
        <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsProfileOpen(false)}
        />
        <div 
            className={`absolute right-0 top-full mt-2.5 w-64 bg-white rounded-3xl shadow-2xl border-2 border-plum/15 p-4 z-[9999] origin-top-right transition-[transform,opacity] ${
                isProfileOpen
                    ? 'opacity-100 scale-100 translate-y-0 duration-180 ease-[cubic-bezier(0.23,1,0.32,1)]'
                    : 'opacity-0 scale-[0.97] -translate-y-1 duration-140 ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none'
            }`}
        >
```

## Repo conventions to follow

- Nav component state lives at top of `Navbar.tsx`.
- Tailwind utilities with arbitrary easing curves: `ease-[cubic-bezier(0.23,1,0.32,1)]`.

## Steps

1. In `src/components/Navbar/Navbar.tsx`:
   - Add `isProfileMounted` state with a 150ms unmount delay when `isProfileOpen` turns false.
2. Replace `{isProfileOpen && (` at line 138 with `{isProfileMounted && (`.
3. Update the dropdown container div:
   - Remove `animate-in fade-in slide-in-from-top-2 duration-300`.
   - Add `origin-top-right transition-[transform,opacity]`.
   - Apply conditional classes for open vs closing state.

## Boundaries

- Do NOT alter dropdown contents (avatar, points, level, links).
- Do NOT alter mobile menu behavior or styles in this plan.
- Do NOT add external dependencies.

## Verification

- **Mechanical**: Run `npm run build` and ensure TypeScript compiles without error.
- **Feel check**:
  - Open `http://localhost:5173/` while logged in.
  - Click the profile avatar pill in the top right of the navbar.
  - Verify the dropdown blossoms out from the top-right corner where the button is, rather than dropping vaguely from the center.
  - Click outside the dropdown to close it. Verify the dropdown smoothly recedes into the top right before unmounting, rather than vanishing instantaneously.
- **Done when**: Opening and closing the profile dropdown feels like a physical, anchored expansion and collapse.
