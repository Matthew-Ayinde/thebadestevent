export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "rinwa-theme";

// Inlined in <head> so the saved (or OS-preferred) theme is applied before first paint — no flash.
// The admin console is dark-only, so it is left on the :root defaults.
export const themeInitScript = `(function(){try{if(location.pathname.indexOf("/admin")===0)return;var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}})()`;
