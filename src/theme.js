// ── Shared building blocks for the sign-in page and the dashboard ──
// Anything that both pages need lives here once: the palette, the fonts, the buttons,
// the text inputs and the logo. If you change a colour here, both pages change with it.

// ── Design tokens (the same teal palette as the landing page) ──
export const c = {
  bg: "#F7FAF9",
  surface: "#FFFFFF",
  border: "#E4E9E8",
  teal: "#0E8074",
  tealDark: "#0B685F",
  tealSoft: "#E6F3F1",
  tealFaint: "#F1F8F7",
  tealDeep: "#073F39",
  text: "#111827",
  textSoft: "#6B7280",
  textFaint: "#9CA3AF",
  danger: "#B42318",
}

// ── Base CSS ──
// Every class here starts with "sy-" so it cannot clash with the landing page ("st-"),
// the sign-in page ("au-") or the dashboard ("db-"). Put class "sy-root" on the outermost
// element of a page to switch these styles on.
export const baseCss = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border};
  --teal: ${c.teal}; --teal-dark: ${c.tealDark}; --teal-soft: ${c.tealSoft};
  --teal-faint: ${c.tealFaint}; --teal-deep: ${c.tealDeep};
  --text: ${c.text}; --soft: ${c.textSoft}; --faint: ${c.textFaint}; --danger: ${c.danger};
  --ease: cubic-bezier(.2, .8, .2, 1);
}
.sy-root { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; }
.sy-root * { box-sizing: border-box; }
:where(.sy-root) :is(h1, h2, h3) { font-family: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif;
  margin: 0; letter-spacing: -0.02em; line-height: 1.12; }
:where(.sy-root) p { margin: 0; }

.sy-logo { display: inline-flex; align-items: center; gap: 8px; font: 700 20px 'Bricolage Grotesque', sans-serif; letter-spacing: -0.02em; text-decoration: none; }

/* a clickable logo gets a taller tap area */
.sy-logo-link { padding: 8px 0; }

/* buttons */
.sy-btn { font: 600 15px 'Inter', system-ui, sans-serif; border-radius: 10px; cursor: pointer;
  padding: 12px 22px; border: 1px solid transparent; transition: background .15s, border-color .15s, color .15s; }
.sy-btn-sm { padding: 9px 16px; font-size: 13.5px; border-radius: 8px; }
.sy-btn-primary { background: var(--teal); color: #fff; }
.sy-btn-primary:hover:not(:disabled) { background: var(--teal-dark); }
.sy-btn-ghost { background: var(--surface); color: var(--text); border-color: var(--border); }
.sy-btn-ghost:hover:not(:disabled) { border-color: var(--teal); color: var(--teal); }
.sy-btn:disabled { opacity: .6; cursor: not-allowed; }

/* text inputs */
.sy-input { width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--surface); color: var(--text); font: 400 15px 'Inter', system-ui, sans-serif;
  transition: border-color .15s, box-shadow .15s; }
.sy-input::placeholder { color: var(--faint); }
.sy-input:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 0 3px rgba(14,128,116,.18); }

/* keyboard focus ring for everything else */
.sy-root button:focus-visible, .sy-root a:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }

/* one shared entrance animation: fade and rise */
@keyframes sy-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

/* On phones, inputs smaller than 16px make iPhones zoom the page when you tap them */
@media (max-width: 560px) { .sy-input { font-size: 16px; } }

/* People who ask their device for less motion get no animations at all */
@media (prefers-reduced-motion: reduce) {
  .sy-root *, .sy-root *::before, .sy-root *::after { animation: none !important; transition: none !important; }
}
`
