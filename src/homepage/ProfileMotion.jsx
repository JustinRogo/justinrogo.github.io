import { useEffect, useRef, useState } from 'react';
import GlareHover from './vendor/GlareHover.jsx';
import SplitText from './vendor/SplitText.jsx';
import './profile-motion.css';

const QUIET = '(prefers-reduced-motion: reduce), (prefers-contrast: more), (forced-colors: active)';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function useMotionPreferences(onQuiet) {
  const [quiet, setQuiet] = useState(() => matchMedia(QUIET).matches || document.hidden);
  const [finePointer, setFinePointer] = useState(() => matchMedia(FINE_POINTER).matches);
  const quietCallback = useRef(onQuiet);
  quietCallback.current = onQuiet;

  useEffect(() => {
    const preferences = matchMedia(QUIET);
    const pointer = matchMedia(FINE_POINTER);
    const controller = new AbortController();
    function sync() {
      const quietNow = preferences.matches || document.hidden;
      if (quietNow) quietCallback.current?.();
      setQuiet(quietNow);
      setFinePointer(pointer.matches);
    }
    preferences.addEventListener('change', sync, { signal: controller.signal });
    pointer.addEventListener('change', sync, { signal: controller.signal });
    document.addEventListener('visibilitychange', sync, { signal: controller.signal });
    sync();
    return () => controller.abort();
  }, []);

  return { quiet, finePointer };
}

export function ProfileName({ text }) {
  const finished = useRef(false);
  const { quiet } = useMotionPreferences(() => { finished.current = true; });
  if (quiet || finished.current) return <span className="profile-name">{text}</span>;

  return <SplitText text={text} tag="span" className="profile-name"
    trigger="load" splitType="chars" textAlign="inherit"
    delay={18} duration={0.42} ease="power3.out"
    from={{ opacity: 0.45, y: 8, filter: 'blur(2px)' }}
    to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    onLetterAnimationComplete={() => { finished.current = true; }} />;
}

export function ContactGlare({ link }) {
  const { quiet, finePointer } = useMotionPreferences();
  if (quiet || !finePointer) return null;

  return <GlareHover eventTarget={link} className="contact-glare"
    width="100%" height="100%" borderRadius="inherit"
    glareColor="var(--contact-glare-color)" glareOpacity={0.18}
    glareSize={36} glareAngle={-35} variant="sheen" rimGlint={false}
    transitionDuration={480} playOnce />;
}
