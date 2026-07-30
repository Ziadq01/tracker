export const THEME_STORAGE_KEY = "adrix-theme";
export const SIDEBAR_STORAGE_KEY = "adrix-sidebar";

/**
 * Inlined into <head> and run before first paint, so neither the theme nor the
 * collapsed sidebar flashes or shifts the layout on load. Both are expressed as
 * classes on <html> and driven entirely by CSS, which keeps them out of React
 * state and avoids a hydration mismatch.
 */
export const SHELL_INIT_SCRIPT = `
(function () {
  try {
    var d = document.documentElement;
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    d.classList.toggle('dark', dark);

    if (localStorage.getItem('${SIDEBAR_STORAGE_KEY}') === 'collapsed') {
      d.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
})();
`;
