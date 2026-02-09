const { useState } = React;

export function useDarkMode(initialDark = true) {
  const [darkMode, setDarkMode] = useState(initialDark);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return { darkMode, setDarkMode, toggleDarkMode };
}
