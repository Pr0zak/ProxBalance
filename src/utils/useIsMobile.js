const { useState, useEffect } = React;

/**
 * Custom hook to detect mobile viewport.
 * Uses matchMedia for efficient, event-driven detection.
 * @param {number} breakpoint - Max width in px to consider "mobile" (default 768 = Tailwind md:)
 * @returns {boolean} true if viewport is at or below the breakpoint
 */
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
