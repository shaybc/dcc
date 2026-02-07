const THEME_STORAGE_KEY = "dcc-theme-preference";
const DEFAULT_THEME = "dark";

function getPreferredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : DEFAULT_THEME;
}

function applyTheme(theme) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", resolvedTheme);
  return resolvedTheme;
}

function setPreferredTheme(theme) {
  const resolvedTheme = applyTheme(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
  return resolvedTheme;
}

function initializeTheme() {
  return applyTheme(getPreferredTheme());
}

window.dccTheme = {
  getPreferredTheme,
  applyTheme,
  setPreferredTheme,
  initializeTheme,
  THEME_STORAGE_KEY
};

initializeTheme();
