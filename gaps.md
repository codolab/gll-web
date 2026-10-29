# Gaps

Open questions and deliberate limitations. Each one is a decision for Codo Lab
or the client, not a defect in the build.

| ID | Gap | Current behaviour | Needs |
|---|---|---|---|
| G-01 | No mobile or tablet frame exists in the Figma file. | Below 1440px the whole canvas scales down instead of reflowing. | Mobile frame(s) from the designer, then a mobile surface like Social & Things. |
| G-02 | The file has two desktop frames: 27:63 "GLL" (1440x7875) and 94:84 "GLL (1)" (1440x7895). | Built 94:84, the frame the brief linked. | Confirm 94:84 is the current design. |
| G-03 | Every link and button has no destination; the newsletter form has no backend. | `href="#"`, the form does nothing. | Site map / URLs, and a newsletter provider. |
| G-04 | The events carousel has three pages of dots but only four cards drawn. Marquee intent is now confirmed by the designer (motion-spec M-02, M-07). | Arrows and swipe step one card, looping through the four drawn cards; the dots stay as drawn. | The rest of the event list, and how the dots should count pages. |
| G-05 | Hosting and domain are unknown; the repo had no commits. | Local build only. | Deploy target (Vercel project?) and domain. |
| G-06 | Talent hover states (motion-spec M-04..M-06): the Figma file draws only state 2 (the amber loop extended, with its line); it has no copy for 1, 3 and 4. | **[PROPOSED DEFAULT]** a photo per number again (Marius, 2026-10-29, after one photo for every state from 2026-10-28): the Figma photo for 2 and the hero photos 94:93, 94:95 and 94:101 for 1, 3 and 4, in one outline made the same for every number (Marius, 2026-10-29; Figma's is cut for 2 only) and three GLL lines already in the frame ("Global minds. Lithuanian roots.", "Your next chapter starts here.", "Go further, together."). | Marius is asking the designer (2026-10-28). The designer's photo and line for numbers 1, 3 and 4. |
| G-07 | "Join us: the logo spins" (M-14), but frame 94:84 has no logo in that section. | Not built. | Marius is asking the designer (2026-10-28). Which element spins: a logo the designer means to add (where?), or the navy "Go further, together." circle. |
| G-08 | The notes give no speeds, distances or timings. | **[PROPOSED DEFAULT]** values in `design/motion-spec.md` (marquees 30 and 40 px/s, card lift 6px, photo zoom 1.06, count-up 1.8s, arrow nudge 6px). | Accepted by Marius 2026-10-28; change only if the designer sends values. |
| G-09 | Accessibility needs a way to pause the marquees (WCAG 2.2.2); the design has none. | Mouse: hovering a row pauses it. Keyboard: a "Pause moving content" button, the first tab stop, shown only on focus (motion-spec M-G5). Touch: no way to pause yet. | Closed 2026-10-28: Marius accepted this coverage as is. No visible control and no tap-to-stop; on phones, the system reduce-motion setting stops all motion. |
| G-10 | The sticky nav (motion-spec M-16) has no scrolled state in the design. | **[PROPOSED DEFAULT]** the full-size nav on an ink bar that fades in once the hero has scrolled past; clear over the hero. | The designer's scrolled state: bar colour, height, and whether the nav shrinks, or hides while scrolling down. |
