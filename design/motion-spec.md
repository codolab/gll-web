# Motion and interaction spec

The designer's notes (received 2026-10-28, Lithuanian, verbatim at the end),
split into checkable items. Each item names the Figma nodes it acts on and how
it is verified. Values marked **[PROPOSED DEFAULT]** are not in the notes; they
are our choice until the designer says otherwise (see `gaps.md`).

## Global rules

| ID | Rule |
|---|---|
| M-G1 | The rest frame is the Figma frame. Before any pointer input, scroll trigger or animation tick, every section renders exactly as frame 94:84, so the parity gate (`npm run qa`) is unchanged. One exception: the impact numbers (M-09) sit at 0 while off screen, waiting to count; assistive tech always reads the final values. |
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
| M-04 | talent (94:266, 94:269, 94:268, 94:267) | The four numbered shapes (1 green circle, 2 amber pill, 3 pink circle, 4 navy circle) are interactive: hover, focus or tap selects one. | **[PROPOSED DEFAULT]** the selection persists until another number is chosen; 1 is selected at rest | static |
| M-05 | talent (94:265) | Selecting a number swaps the central blob photo, same blob outline. | **[PROPOSED DEFAULT]** 0.3s crossfade; photos for 2-4 are other GLL photos from this Figma file (the file has no states for this) | static |
| M-06 | talent (94:274) | ...and swaps the tagline next to it. | **[PROPOSED DEFAULT]** 1 "One community. Endless possibilities." (Figma), 2 "Global minds. Lithuanian roots.", 3 "Your next chapter starts here.", 4 "Go further, together.": existing GLL lines from frame 94:84, placeholders until the designer supplies copy | static |
| M-07 | ribbons (94:140, 94:147) | "Connect globally" and "Grow together" rows scroll slowly in opposite directions, seamless loops. | **[PROPOSED DEFAULT]** 40 px/s; "Connect globally" leftward, "Grow together" rightward; both rows pause while hovered, like the logos | static |
| M-08 | programs (94:167, 94:171, 94:176) | Hovering a program card moves it slightly. | **[PROPOSED DEFAULT]** lifts 6px, 0.25s ease-out | static |
| M-09 | impact (94:189, 94:193, 94:197) | When the section first scrolls into view, the three numbers count up from 0 to their values (10,000+ / 60+ / 10+), keeping the thousands comma and the "+". Once per page load. | **[PROPOSED DEFAULT]** starts at 40% visible, 1.8s ease-out | static |
| M-10 | meet (94:230, 94:202, 94:212, 94:221) | Hovering a card (or keyboard focus inside it) zooms its photo inside the card; the frame, curve and text stay. | **[PROPOSED DEFAULT]** scale 1.06, 0.5s ease-out | static |
| M-11 | meet (94:257 prev, 94:253 next) | The arrows switch cards. | **[PROPOSED DEFAULT]** one card per click, looping through the four drawn cards (the file shows three pages of dots but only four events, G-04); dots stay as drawn | arrows wired to a track that cannot scroll at 1440 |
| M-12 | meet | Cards switch by swiping on a phone. | horizontal swipe = one card; vertical page scroll unaffected | none |
| M-13 | community, "Join us" (94:282 + 94:285, 94:303 + 94:305) | Hovering "Partner with us" or "Support us" nudges its arrow to the right. | **[PROPOSED DEFAULT]** 6px, 0.25s ease-out | static |
| M-14 | community, "Join us" | "The logo spins." | **not built**: frame 94:84 has no logo in this section (the nearest element is the navy circle with "Go further, together.", 94:288/94:298). Open question for the designer, G-07. | n/a |
| M-15 | footer (94:307) | Newsletter invitation on a darkened photo with a clear subscribe form. No motion. | | present; no backend (G-03) |
| M-16 | nav (94:120) | Sticky header: the nav stays at the top of the viewport while the page scrolls. Not in the designer's notes; Marius asked for it on 2026-10-28. | **[PROPOSED DEFAULT]** At the top of the page the nav is the Figma frame on a clear layer. Once the hero's rounded bottom reaches the nav, an ink (#0b1722) bar with a soft shadow fades in behind it over 0.3s (instant under reduced motion). Full size, no shrink or hide. Keyboard focus scrolls a control clear of the bar (WCAG 2.4.11). | static |

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
