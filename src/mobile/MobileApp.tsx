import Nav from './sections/Nav'
import Hero from './sections/Hero'
import Logos from './sections/Logos'
import Talent from './sections/Talent'
import Ribbons from './sections/Ribbons'
import Programs from './sections/Programs'
import Impact from './sections/Impact'
import Meet from './sections/Meet'
import Community from './sections/Community'
import Footer from './sections/Footer'

/**
 * The page below 1024px (MOBILE_SPEC.md). The Figma file has no mobile frame
 * (gaps.md G-01), so this is a flow layout drawn from the desktop frame's own
 * type, colour and assets, not a transcription; the parity harness never sees it.
 */
export default function MobileApp() {
  return (
    <div data-mobile="root" className="relative min-w-[320px] bg-white">
      <Nav />
      <Hero />
      <Logos />
      <Talent />
      <Ribbons />
      <Programs />
      <Impact />
      <Meet />
      <Community />
      <Footer />
    </div>
  )
}
