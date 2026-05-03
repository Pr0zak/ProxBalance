const { useState, useEffect } = React;

/**
 * Dark/light mode toggle. Toggles the `dark` class on document.documentElement
 * so Tailwind's class-based dark mode (configured via `darkMode: 'class'` in
 * tailwind.config.js) responds. Persists to localStorage. Defaults to dark
 * (the historical behavior of this app).
 */
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return true; // default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(d => !d);

  return { darkMode, setDarkMode, toggleDarkMode };
}
