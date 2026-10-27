# Gaps

Open questions and deliberate limitations. Each one is a decision for Codo Lab
or the client, not a defect in the build.

| ID | Gap | Current behaviour | Needs |
|---|---|---|---|
| G-01 | No mobile or tablet frame exists in the Figma file. | Below 1440px the whole canvas scales down instead of reflowing. | Mobile frame(s) from the designer, then a mobile surface like Social & Things. |
| G-02 | The file has two desktop frames: 27:63 "GLL" (1440x7875) and 94:84 "GLL (1)" (1440x7895). | Built 94:84, the frame the brief linked. | Confirm 94:84 is the current design. |
| G-03 | Every link and button has no destination; the newsletter form has no backend. | `href="#"`, the form does nothing. | Site map / URLs, and a newsletter provider. |
| G-04 | The logo strip and the two text ribbons look like marquees, and the events carousel has three pages of dots but only four cards drawn. | Static, exactly as drawn. | Confirm intended motion and the rest of the carousel content. |
| G-05 | Hosting and domain are unknown; the repo had no commits. | Local build only. | Deploy target (Vercel project?) and domain. |
