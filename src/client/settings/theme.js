export function updateThemeToggleLabel(themeToggleLabel, isLightMode) {
  if (!themeToggleLabel) return;
  themeToggleLabel.textContent = isLightMode ? "Light mode" : "Dark mode";
}

export function initThemeSettings({ themeToggle, themeToggleLabel }) {
  if (!themeToggle) return;

  const currentTheme = window.dccTheme?.getPreferredTheme?.() || "dark";
  const isLightMode = currentTheme === "light";
  themeToggle.checked = isLightMode;
  updateThemeToggleLabel(themeToggleLabel, isLightMode);

  themeToggle.addEventListener("change", (event) => {
    const nextTheme = event.target.checked ? "light" : "dark";
    const appliedTheme = window.dccTheme?.setPreferredTheme?.(nextTheme) || nextTheme;
    updateThemeToggleLabel(themeToggleLabel, appliedTheme === "light");
  });
}
