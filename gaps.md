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
| G-06 | Talent hover states (motion-spec M-05, M-06): the Figma file has no photos or copy for states 2-4. | **[PROPOSED DEFAULT]** three other GLL photos from the frame in the same blob, and three GLL lines already in the frame ("Global minds. Lithuanian roots.", "Your next chapter starts here.", "Go further, together."). | The designer's photo and line for each of the four numbers. |
| G-07 | "Join us: the logo spins" (M-14), but frame 94:84 has no logo in that section. | Not built. | Which element spins: a logo the designer means to add (where?), or the navy "Go further, together." circle. |
| G-08 | The notes give no speeds, distances or timings. | **[PROPOSED DEFAULT]** values in `design/motion-spec.md` (marquees 30 and 40 px/s, card lift 6px, photo zoom 1.06, count-up 1.8s, arrow nudge 6px). | Designer sign-off or their values. |
| G-09 | Accessibility needs a way to pause the marquees (WCAG 2.2.2); the design has none. | A "Pause moving content" button, the first tab stop, shown only on keyboard focus (motion-spec M-G5). | Designer's preferred look, or a visible control in the layout. |
