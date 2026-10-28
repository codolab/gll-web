# Motion and interaction spec

The designer's notes (received 2026-10-28, Lithuanian, verbatim at the end),
split into checkable items. Each item names the Figma nodes it acts on and how
it is verified. Values marked **[PROPOSED DEFAULT]** are not in the notes; they
are our choice until the designer says otherwise (see `gaps.md`).

## Global rules

| ID | Rule |
|---|---|
| M-G1 | The rest frame is the Figma frame. Before any pointer input, scroll trigger or animation tick, every section renders exactly as frame 94:84, so the parity gate (`npm run qa`) is unchanged. One exception: the impact numbers (M-09) sit at 0 while off screen, waiting to count; assistive tech always reads the final values. Talent (M-05): with 2 selected the photo's outline is the symmetric one minus the 2 loop's band, not Figma's own outline, so it differs from 94:265 near the 2 loop (Marius, 2026-10-29); the parity gate reports it. |
| M-G2 | `prefers-reduced-motion: reduce` stops all decorative motion (marquees, parallax, count-up, hover nudges, zoom). Functional changes (talent states, carousel step) still happen, instantly. The parity harness captures under `reduce`. |
| M-G3 | Clones made for looping carry no `data-node-id`, are `aria-hidden` and are not focusable. |
| M-G4 | Hover behaviour also triggers on keyboard focus where the element is interactive. |
| M-G5 | WCAG 2.2.2: anything that moves on its own for more than 5s can be paused. The first tab stop is a "Pause moving content" button (`aria-pressed`), visible only while focused, that pauses both marquees. Not rendered under reduced motion, where nothing moves. **[PROPOSED DEFAULT]** for its look. |

## Items

| ID | Section (node) | Behaviour | Defaults | Status before this pass |
|---|---|---|---|---|
| M-00a | all | Logo motif (circles, arcs, logo colours) repeats in photo shapes, cards and buttons. | | present in the static build |
| M-00b | all | Inter throughout; large semibold headings, lighter body text. | | present (Inter 3.19, self-hosted) |
| M-01 | hero (94:87 photo grid) | The three photo rows slide on their own as seamless loops: row 1 (94:88..94:92) and row 3 (94:98..94:102) rightward, row 2 (94:93..94:97) leftward. Changed on 2026-10-28 at Marius's request from the designer's mouse-driven pan, whose first cut (±115px at 0.2s, over 1000 px/s) caused motion sickness in review. | **[PROPOSED DEFAULT]** 20 px/s (checked under 25), period 1713px (five column pitches, whole px). Keeps moving under the pointer, since the pointer usually rests on the hero; the page pause button (M-G5) and reduced motion stop it. | static |
| M-02 | logos (94:112..94:119) | Partner logos scroll slowly to the left in a seamless loop. | **[PROPOSED DEFAULT]** 30 px/s, leftward | static |
| M-03 | logos | The strip stops while hovered (and while a logo has keyboard focus). | | static |
| M-04 | talent (94:266, 94:269, 94:268, 94:267) | The four numbered shapes are tabs: hover, focus or tap selects one. The selected number is drawn as the Figma "2" loop (one curve stroked 135px wide with round ends), turned in quarter turns to start at its own circle; the others are circles. Selecting extends the new one from its circle along its loop while the previous one shrinks back to a circle. Added 2026-10-28 at Marius's request. | **[PROPOSED DEFAULT]** 2 is selected at rest (the Figma frame) and the selection persists until another number is chosen; 0.4s ease-in-out morph; as a circle, 2 is 158.806px like 1 and 3 | static |
| M-05 | talent (94:265) | The one Figma photo stays put, and its outline is the same for every number: each circle sits in its own notch at Figma's gap, with a petal between each pair. Only the selected loop cuts in: it takes a white band off the photo, and where the band meets the next number's notch the corner is rounded, never a spike of photo. Changed 2026-10-29 at Marius's request: Figma's outline is drawn for 2 selected (cut round the 2 loop), so with any other number selected the photo looked lopsided. Before that (2026-10-28) per-number photos with turned outlines crossfaded into overlapping images and were dropped. | Photo = the Figma image fill (`scripts/assets.mjs fill`) clipped to a vector, so it is sharp at any density. Outline (`scripts/talent-mask.mjs`): Figma's three petals and its notches under 1 and beside 4; 2 and 3 take the notch under 1 (same circle size); a fourth petal, the top-left one turned 180deg. **[PROPOSED DEFAULT]** band 32px (Figma keeps 30 to 34.5 along the loop); corner radius 150px (Figma's own corner after 2), drawn once the band has finished growing (0.1s fade) and fading as it starts to shrink | static |
| M-06 | talent (94:274) | Selecting a number swaps the tagline next to it, one line at a time: the old one fades out (0.15s), then the new one fades in (0.15s). | **[PROPOSED DEFAULT]** 2 "One community. Endless possibilities." (Figma), 1 "Global minds. Lithuanian roots.", 3 "Your next chapter starts here.", 4 "Go further, together.": existing GLL lines from frame 94:84, placeholders until the designer supplies copy | static |
| M-07 | ribbons (94:140, 94:147) | "Connect globally" and "Grow together" rows scroll slowly in opposite directions, seamless loops. | **[PROPOSED DEFAULT]** 40 px/s; "Connect globally" leftward, "Grow together" rightward; both rows pause while hovered, like the logos | static |
| M-08 | programs (94:167, 94:171, 94:176) | Hovering a program card moves it slightly. | **[PROPOSED DEFAULT]** lifts 6px, 0.25s ease-out | static |
| M-09 | impact (94:189, 94:193, 94:197) | When the section first scrolls into view, the three numbers count up from 0 to their values (10,000+ / 60+ / 10+), keeping the thousands comma and the "+". Once per page load. | **[PROPOSED DEFAULT]** starts at 40% visible, 1.8s ease-out | static |
| M-10 | meet (94:230, 94:202, 94:212, 94:221) | Hovering a card (or keyboard focus inside it) zooms its photo inside the card; the frame, curve and text stay. | **[PROPOSED DEFAULT]** scale 1.06, 0.5s ease-out | static |
| M-11 | meet (94:257 prev, 94:253 next) | The arrows switch cards. | **[PROPOSED DEFAULT]** one card per click, looping through the four drawn cards (the file shows three pages of dots but only four events, G-04); dots stay as drawn | arrows wired to a track that cannot scroll at 1440 |
| M-12 | meet | Cards switch by swiping on a phone. | horizontal swipe = one card; vertical page scroll unaffected | none |
| M-13 | community, "Join us" (94:282 + 94:285, 94:303 + 94:305) | Hovering "Partner with us" or "Support us" nudges its arrow to the right. | **[PROPOSED DEFAULT]** 6px, 0.25s ease-out | static |
| M-14 | community, "Join us" | "The logo spins." | **not built**: frame 94:84 has no logo in this section (the nearest element is the navy circle with "Go further, together.", 94:288/94:298). Open question for the designer, G-07. | n/a |
| M-15 | footer (94:307) | Newsletter invitation on a darkened photo with a clear subscribe form. No motion. | | present; no backend (G-03) |

## Source (designer, 2026-10-28)

> Bendra idėja: Pagrindinis dizaino elementas paimtas iš GLL logotipo. Jo apskritimai, lankai ir spalvos atsikartoja nuotraukų formose, kortelėse ir mygtukuose, sujungdami svetainę į vientisą visumą.
>
> Šriftas: Visoje svetainėje naudojamas „Inter“. Didesni, ryškesni pavadinimai išskiria pagrindines žinutes, o lengvesnis tekstas padeda patogiai skaityti.
>
> Hero sekcija: bendruomenės nuotraukų koliažas pristato GLL žmones, pagrindinę žinutę ir kviečia tapti nariu. Animacija: koliažas juda į šonus pagal pelės padėtį, palaipsniui atskleisdamas visas nuotraukas.
>
> Partnerių sekcija: Animacija: logotipai lėtai slenka horizontaliai, užvedus pelę sustoja.
>
> „A world of Lithuanian talent“ sekcija: logotipo įkvėpta kompozicija pristato bendruomenę ir jos vertę. Animacija: užvedus pelę ant numeruotų elementų, keičiasi centrinė nuotrauka ir susijęs tekstas.
>
> „Connect globally / Grow together“ Idėja: didelis pasikartojantis tekstas akcentuoja pasaulinius ryšius ir augimą kartu. Animacija: dvi teksto eilutės lėtai slenka priešingomis kryptimis.
>
> Programų sekcija: aplink centrinę nuotrauką išdėstytos kortelės pristato GLL programas. Animacija: užvedus pelę, kortelė šiek tiek sujuda.
>
> „Global impact“ sekcija: aiškiai išskirti skaičiai parodo GLL bendruomenės mastą. Animacija: pasiekus sekciją, skaičiai palaipsniui didėja iki galutinės reikšmės.
>
> „Meet, greet and network“ sekcija: keturios kortelės su nuotraukomis ir logotipo motyvais kviečia pažinti bendruomenę bei jos veiklą. Animacija: užvedus pelę, nuotrauka priartėja; kortelės perjungiamos rodyklėmis arba braukiant telefone.
>
> „Join us“ sekcija: spalvoti, suapvalinti blokai pristato tris įsitraukimo būdus: narystę, partnerystę ir paramą. Animacija: užvedus pelę rodyklės švelniai pasislenka į dešinę, logotipas sukasi ratu.
>
> Naujienlaiškio sekcija kartu su footer: ant patamsintos nuotraukos pateikiamas kvietimas įsitraukti ir aiški prenumeratos forma.
