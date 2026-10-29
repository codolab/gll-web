/**
 * nav - Figma 94:120 (origin 24, 0); wide 173:347 (origin 27.33, 0). Logo, five
 * links, pink "JOIN US" pill. Inside the group both frames share every offset;
 * only the logo differs: wide's group 173:349 is stretched to 85.4 wide (its
 * vectors x-scaled by about 1.139), transcribed as drawn in a render of its own.
 */
import { useCanvasSurface } from '../surface'

// Text boxes from 94:131's children (wide 173:358's, same offsets). Figma's hug width
// and centring ignore the trailing space in the copy, as CSS does once it collapses at the line end.
const LINKS = [
  { text: 'About ', left: 435, width: 69 },
  { text: 'Network', left: 528, width: 97 },
  { text: 'Programs ', left: 649, width: 109 },
  { text: 'Events ', left: 782, width: 77 },
  { text: 'Join us ', left: 883, width: 81 },
]

const LAYOUT = {
  desktop: {
    root: '94:120', nav: '94:121', links: '94:131', join: '94:137', label: '94:138',
    link: ['94:132', '94:133', '94:134', '94:135', '94:136'],
    // Figma's SVG export rounds the canvas up to 75x74 from the group origin.
    logo: { id: '94:122', w: 74.99864196777344, src: '/assets/nav/logo.svg', iw: 75 },
  },
  wide: {
    root: '173:347', nav: '173:348', links: '173:358', join: '173:364', label: '173:365',
    link: ['173:359', '173:360', '173:361', '173:362', '173:363'],
    logo: { id: '173:349', w: 85.415283203125, src: '/assets/nav/wide-logo.svg', iw: 86 },
  },
}

export default function Nav() {
  const L = LAYOUT[useCanvasSurface()]
  return (
    <div className="relative size-full" data-node-id={L.root}>
      <nav className="absolute inset-0" data-node-id={L.nav}>
        <a
          href="#"
          className="absolute block"
          style={{ left: 0, top: 10.58984375, width: L.logo.w, height: 73.89771270751953 }}
          data-node-id={L.logo.id}
        >
          <img src={L.logo.src} alt="Global Lithuanian Leaders" width={L.logo.iw} height={74} className="block max-w-none" />
        </a>

        <div className="absolute" style={{ left: 435, top: 23, width: 529, height: 53 }} data-node-id={L.links}>
          {LINKS.map((l, i) => (
            <a
              key={L.link[i]}
              href="#"
              className="absolute top-0 flex h-[53px] items-center justify-center whitespace-nowrap text-[24px] font-normal leading-[52.79999923706055px] text-white"
              style={{ left: l.left - 435, width: l.width }}
              data-node-id={L.link[i]}
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
          data-node-id={L.join}
        >
          <span
            className="absolute left-[32px] flex h-[24px] w-[64px] justify-center whitespace-nowrap text-[16px] font-semibold uppercase leading-[24px] text-white"
            style={{ top: 12.659793853759766 }}
            data-node-id={L.label}
          >
            join us
          </span>
        </a>
      </nav>
    </div>
  )
}
