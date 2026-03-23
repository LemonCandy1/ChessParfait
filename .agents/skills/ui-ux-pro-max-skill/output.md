## Design System: ChessParfait

### Pattern
- **Name:** Feature-Rich Showcase
- **CTA Placement:** Above fold
- **Sections:** Hero > Features > CTA

### Style
- **Name:** 3D & Hyperrealism
- **Keywords:** Depth, realistic textures, 3D models, spatial navigation, tactile, skeuomorphic elements, rich detail, immersive
- **Best For:** Gaming, product showcase, immersive experiences, high-end e-commerce, architectural viz, VR/AR
- **Performance:** ❌ Poor | **Accessibility:** ⚠ Not accessible

### Colors
| Role | Hex |
|------|-----|
| Primary | #2563EB |
| Secondary | #3B82F6 |
| CTA | #F97316 |
| Background | #F8FAFC |
| Text | #1E293B |

*Notes: Cheerful pink + reward gold*

### Typography
- **Heading:** Plus Jakarta Sans
- **Body:** Plus Jakarta Sans
- **Mood:** friendly, modern, saas, clean, approachable, professional
- **Best For:** SaaS products, web apps, dashboards, B2B, productivity tools
- **Google Fonts:** https://fonts.google.com/share?selection.family=Plus+Jakarta+Sans:wght@300;400;500;600;700
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

### Key Effects
WebGL/Three.js 3D, realistic shadows (layers), physics lighting, parallax (3-5 layers), smooth 3D (300-400ms)

### Avoid (Anti-patterns)
- Complex shadows
- 3D effects

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px

