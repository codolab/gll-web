/** nav - Figma 94:120. Logo, five links, pink "JOIN US" pill. Origin is (24, 0). */

// Text boxes from 94:131's children. Figma's hug width and centring ignore the
// trailing space in the copy, as CSS does once it collapses at the line end.
const LINKS = [
  { id: '94:132', text: 'About ', left: 435, width: 69 },
  { id: '94:133', text: 'Network', left: 528, width: 97 },
  { id: '94:134', text: 'Programs ', left: 649, width: 109 },
  { id: '94:135', text: 'Events ', left: 782, width: 77 },
  { id: '94:136', text: 'Join us ', left: 883, width: 81 },
]

export default function Nav() {
  return (
    <div className="relative size-full" data-node-id="94:120">
      <nav className="absolute inset-0" data-node-id="94:121">
        <a
          href="#"
          className="absolute block"
          style={{ left: 0, top: 10.58984375, width: 74.99864196777344, height: 73.89771270751953 }}
          data-node-id="94:122"
        >
          {/* Figma's SVG export rounds the canvas up to 75x74 from the group origin. */}
          <img src="/assets/nav/logo.svg" alt="Global Lithuanian Leaders" width={75} height={74} className="block max-w-none" />
        </a>

        <div className="absolute" style={{ left: 435, top: 23, width: 529, height: 53 }} data-node-id="94:131">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href="#"
              className="absolute top-0 flex h-[53px] items-center justify-center whitespace-nowrap text-[24px] font-normal leading-[52.79999923706055px] text-white"
              style={{ left: l.left - 435, width: l.width }}
              data-node-id={l.id}
            >
              {/* Chromium's baseline is round(ascent) + floor(half-leading); Figma rounds
                  the exact one. At 24/52.8 that is 1px lower, as measured. */}
              <span className="relative top-px">{l.text}</span>
            </a>
          ))}
        </div>

        <a
          href="#"
          className="absolute block h-[49.31958770751953px] w-[128px] rounded-[138.7113494873047px] bg-[#ff4c77]"
          style={{ left: 1262, top: 23.33984375 }}
          data-node-id="94:137"
        >
          <span
            className="absolute left-[32px] flex h-[24px] w-[64px] justify-center whitespace-nowrap text-[16px] font-semibold uppercase leading-[24px] text-white"
            style={{ top: 12.659793853759766 }}
            data-node-id="94:138"
          >
            join us
          </span>
        </a>
      </nav>
    </div>
  )
}
