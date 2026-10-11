import { useEffect, useState, useRef } from 'react';

export function AnimatedNumber({ value = 0, duration = 500 }) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(display);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const start = displayRef.current;
    const diff = value - start;
    if (diff === 0) return undefined;

    const startTime = performance.now();
    let frameId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, duration]);

  return <span>{display}</span>;
}

export default AnimatedNumber;
