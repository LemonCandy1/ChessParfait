# 001 — Tighten Button Press Feedback and Eliminate transition-all

- **Status**: DONE
- **Commit**: abe3c08
- **Severity**: HIGH
- **Category**: Easing & duration / Performance / Physicality
- **Estimated scope**: 1 file (`src/index.css`), ~25 lines changed

## Problem

Button press feedback across the entire application is sluggish, mushy, and off-GPU. All button utility classes in `src/index.css` use `transition-all duration-300 active:scale-95`. 

1. `300ms` is double the standard UI button feedback budget of 100–160ms. Depressing and releasing a button feels delayed.
2. `active:scale-95` is an exaggerated scale depression that visually distorts button borders and text.
3. `transition-all` forces browser recalculation and repaint on layout properties (padding, shadow, borders) rather than hardware-accelerated transforms.
4. `active:translate-y-0` fights with `hover:-translate-y-0.5` through a 300ms symmetric transition rather than a crisp asymmetric press response.

```css
/* src/index.css:37-47 — current */
  .soft-button {
    @apply bg-plum text-cream font-bold rounded-xl shadow-[0_4px_15px_rgb(74,21,75,0.2)] hover:shadow-[0_8px_25px_rgb(74,21,75,0.3)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 active:translate-y-0;
  }

  .soft-button-berry {
    @apply bg-berry text-white font-bold rounded-xl shadow-[0_4px_15px_rgb(210,49,87,0.2)] hover:shadow-[0_8px_25px_rgb(210,49,87,0.3)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 active:translate-y-0;
  }

  .soft-button-outline {
    @apply bg-white border-2 border-plum/10 text-plum font-bold rounded-xl shadow-sm hover:border-berry hover:text-berry hover:shadow-[0_8px_25px_rgb(210,49,87,0.15)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 active:translate-y-0;
  }
```

## Target

Define shared easing tokens in `@theme` in `src/index.css` (`--ease-out`, `--ease-in`). Replace `transition-all duration-300` with explicit property transitions on `transform`, `box-shadow`, and `background-color`. Introduce asymmetric timing: fast 80ms compression on press, 140ms snappy return on release, and subtle `scale(0.975)`. Add `@media (prefers-reduced-motion: reduce)` to suppress geometric scaling.

```css
/* target token additions in @theme */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);

/* target button utility rules */
  .soft-button,
  .soft-button-berry,
  .soft-button-outline {
    transition: transform 140ms var(--ease-out), box-shadow 140ms ease-out, background-color 140ms ease-out, border-color 140ms ease-out;
    will-change: transform;
  }

  .soft-button:hover,
  .soft-button-berry:hover,
  .soft-button-outline:hover {
    transform: translateY(-2px);
  }

  .soft-button:active,
  .soft-button-berry:active,
  .soft-button-outline:active {
    transform: translateY(0) scale(0.975);
    transition-duration: 80ms;
  }

  @media (prefers-reduced-motion: reduce) {
    .soft-button,
    .soft-button-berry,
    .soft-button-outline {
      transform: none !important;
      transition: background-color 140ms ease-out, border-color 140ms ease-out;
    }
    .soft-button:hover,
    .soft-button-berry:hover,
    .soft-button-outline:hover,
    .soft-button:active,
    .soft-button-berry:active,
    .soft-button-outline:active {
      transform: none !important;
    }
  }
```

## Repo conventions to follow

- Theme tokens are defined in `src/index.css` inside the `@theme` block.
- Utilities are authored in `src/index.css` inside `@layer utilities`.

## Steps

1. In `src/index.css`, inside `@theme`, define the shared motion curve tokens:
   ```css
   --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
   --ease-in: cubic-bezier(0.4, 0, 1, 1);
   ```
2. In `src/index.css`, update `.soft-button`, `.soft-button-berry`, and `.soft-button-outline` within `@layer utilities`:
   - Remove `transition-all duration-300`, `hover:-translate-y-0.5`, `active:scale-95`, and `active:translate-y-0` from the `@apply` lists.
   - Add explicit CSS rules for transition properties (`transform 140ms var(--ease-out)`, `box-shadow 140ms ease-out`), `:hover` (`transform: translateY(-2px)`), and `:active` (`transform: translateY(0) scale(0.975); transition-duration: 80ms;`).
3. Add the `@media (prefers-reduced-motion: reduce)` block to prevent transform jumps for users who have requested reduced motion while keeping background and border feedback intact.

## Boundaries

- Do NOT change button colors, font styling, borders, or padding.
- Do NOT touch React component files that use `.soft-button`.
- Do NOT add external animation libraries or NPM dependencies.

## Verification

- **Mechanical**: Run `npm run build` (`tsc -b && vite build`) and confirm exit code 0.
- **Feel check**:
  - Open `http://localhost:5173/` in a browser. Click any `.soft-button` (such as "Login" or "Train Philidor Position").
  - Confirm the button depresses instantly (80ms) without visual lag.
  - Release the mouse button and confirm a smooth, instantaneous snap-back (140ms).
  - Open DevTools $\rightarrow$ Rendering $\rightarrow$ check "Emulate CSS media feature prefers-reduced-motion: reduce". Verify buttons do not physically move or scale, but color/shadow feedback still works.
- **Done when**: Clicking buttons feels mechanical and tactile rather than mushy, with zero layout jank.
