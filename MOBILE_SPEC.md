# Mobile composition: GLL

**Status: [PROPOSED DEFAULT], gaps.md G-01.** The Figma file has a 1440 frame
(94:84) and a 1640 frame (173:310), and no mobile frame. Below 1024px the page
renders this composition instead of a scaled canvas. It is drawn from the
desktop frame's own type, colours, copy and assets, and invents nothing the
desktop does not already say. When the designer draws a mobile frame, it
replaces this document and `src/mobile/` is rebuilt to parity, as on Social &
Things.

## Why a separate composition

The canvases are literal transcriptions verified to the pixel. Making them
re-flow would put that verification at risk on every edit, for a layout no one
drew. So `src/mobile/` is its own tree (`MobileApp.tsx`, one file per section
in `src/mobile/sections/`). It shares tokens (`src/index.css`), fonts, copy and
`public/assets/` with the canvases, and never imports a canvas section.

## Frame

- Design width **390** (iPhone 14/15). Fluid from **320** to **1023**.
- Side gutter **20px**. Content is `max-w-[640px] mx-auto` at tablet widths;
  bands (backgrounds) stay full width.
- Flow layout only: stacks and grids, no absolute coordinates except inside a
  decorative figure.
- Every section is `<section id={slug} data-section={slug}>`.
- Vertical rhythm: **64px** between bands, **48px** inside a band from heading
  to content, **16px** between cards.

## Type

Desktop sizes compressed at the top end, same weights and colours. Inter, as
everywhere (`--font-sans`). Never below 12px; body never below 15px.

| role | desktop | mobile (size / line, tracking) | weight |
|---|---|---|---|
| hero headline | 88 / 96.6, -4.11 | **44 / 46, -1.8** | 600 |
| impact "Global impact", community 10,000+ | 92-96 / 107-108 | **56 / 60, -1.75** | 600 |
| community headline | 80 / 93, -2 | **40 / 44, -1.2** | 600 |
| ribbons | 88 / 112, -2 | **44 / 56, -1** | 300 + 600 |
| section heading | 56 / 64-72 | **32 / 38, -0.6** | 600 |
| stat figure | 64 / 76, -2 | **40 / 46, -1.2** | 600 |
| footer heading "Ways to engage" | 48 / 65, -1.3 | **32 / 40, -0.8** | 600 |
| card title | 28-34 / 34-39 | **22 / 28** | 600 |
| body large (hero sub, community lead) | 24-32 / 30-40 | **17 / 26** | 400 |
| body | 17 / 25 | **15 / 22** | 400 |
| button / label (uppercase where desktop is) | 15-17 / 20-24 | **14 / 20** | 600 |
| eyebrow, card number, tag | 12-14 | **12 / 16** | 600 |

## Controls

- Every link, button and input is at least **44px tall** (and 44 wide when it
  is an icon). Pills: `h-11 px-6 rounded-full`, labels 14/600, uppercase where
  the desktop label is.
- Focus is visible (`focus-visible:outline-2 outline-offset-2`, ink or white on
  dark bands). Links stay `href="#"` (gaps.md G-03).

## Motion

Same rules as the canvases (`design/motion-spec.md` M-G1..M-G5): decorative
motion stops under `prefers-reduced-motion: reduce` and when the page's pause
control sets `[data-motion="paused"]` on `<main>`. Use the `.marquee` class from
`src/index.css` (`--marquee-shift`, `--marquee-duration`) for every moving row,
with clones `aria-hidden` and unfocusable. Speeds as desktop: hero rows 20 px/s,
logos 30, ribbons 40.

## Sections, top to bottom

1. **Nav** (sticky, `h-16`). Logo (`/assets/nav/logo.svg`) 40px tall at the
   gutter; right: the pink "JOIN US" pill (`h-11`, `bg-pink-hot`, white 14/600)
   and a 44x44 menu button (three 2px white bars, CSS, no new asset). Clear over
   the hero; an ink bar fades in once the hero has scrolled past (the desktop
   M-16 behaviour). The menu is a full-screen ink sheet: About, Network,
   Programs, Events, Join us at 28/36 600 white in 56px rows, a close button in
   the menu button's place. Escape and every link close it; focus moves into it
   on open and back to the button on close; the page behind does not scroll.
2. **Hero** (ink band, `min-h-[640px]`, `h-[100svh]` capped at 760). Three rows
   of the desktop tiles (`/assets/hero/*`, 132x116, radius 12, gap 12) fill the
   band behind a 71% `ink-deep` scrim (Rectangle 14), rows drifting right, left,
   right at 20 px/s. Copy centred, starting 112px from the top: headline 44/46
   white, sub 17/26 white (desktop copy), "BECOME A MEMBER" white pill, ink text.
3. **Logos** (white). One marquee row of the eight desktop logos at 60% of their
   desktop size, 28px above and below. The two LF marks keep `mix-blend-hard-light`
   on a white track.
4. **Talent** (white). Heading "A world of Lithuanian talent" 32/38 centred.
   Below it the desktop rest-frame figure, static: the blob photo with the four
   numbered circles and the amber "2" loop, built as one fixed-size figure
   (the desktop coordinates of group 94:264) scaled to the content width. Live
   text digits, decorative (`aria-hidden`), not tabs: the four states have no
   content yet (G-06). Tagline "One community. Endless possibilities." 22/28
   below, left-aligned. Its own copies of the photo and loop under
   `public/assets/mobile/talent/`: the canvas talent assets are being replaced
   on another branch (PR #3).
5. **Ribbons** (white). Two marquee rows, "Connect globally" (300 + 600 "globally")
   and "Grow together", 44/56, dots between phrases as desktop, rows 8px apart.
6. **Programs** (ink band). Heading 32/38 white centred (desktop copy, two
   lines). The "Programs" photo card full width (aspect 4:5, radius 16) with
   "Programs" 44/48 white and the "SEE ALL PROGRAMS" white pill centred on it.
   Then the three navy program cards stacked: number 12/16, title 22/28, meta
   15/22, body 15/22, all white, padding 24, radius 16.
7. **Impact** (periwinkle band). "Global" / pill photo + "impact" at 56/60 (the
   pill 104x58), then the three stats stacked, each a 40/46 figure over its
   15/22 label with a 1px ink/20 rule between. The count-up runs as desktop.
8. **Meet** (white). Heading 32/38 left. A horizontal scroll-snap row of the
   four desktop cards at 78% of the window (cap 320px), gap 12, the gutter as
   scroll padding; native swipe. Below: the dots as drawn and the two arrow
   buttons (44x44, desktop arrow assets) that scroll by one card.
9. **Community** (periwinkle band). Headline 40/44, lead 17/26. Bento as a
   two-column grid, gap 12: green "Partner with us" card | conversations photo;
   navy "Go further, together." circle | flag photo; the pink "10,000+" card
   (56/60 figure, 15/22 label, "Your next chapter starts here." 22/28, ink
   "BECOME A MEMBER" pill) full width; the white "Support our community" card
   full width. Corner radii from the desktop shapes, scaled.
10. **Footer** (ink band). The newsletter card full width (radius 16, photo
    `/assets/footer/newsletter-photo.webp` behind a 60% ink scrim): "Ways to
    engage" 32/40, body 15/22, EVENTS (pink) and PROGRAMS (outline) pills,
    "Subscribe to our newsletter" 22/28, the email input and SUBSCRIBE button
    stacked, each full width and 48px. Below: logo and the two social icons;
    the five link columns as a two-column grid (About, Network, Programs, Events,
    Join us), headings 17/24 600, links 15/32; the copyright line 12/18.

## Checks

`npm run qa:mobile` (scripts/mobile-check.mjs): the width-to-composition table,
no white margin beside a band on wide windows, and at 320/360/390/430/768/1023:
nothing escapes the window unclipped, every section renders, text at least
12px, controls at least 24px (44 reported), images load, no page errors.
Each section's behaviour (menu, marquees, carousel, count-up, reduced motion)
goes in `qa/mobile/<slug>.mjs`.
