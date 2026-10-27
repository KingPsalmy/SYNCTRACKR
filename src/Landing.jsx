import { useState, useEffect, useRef } from "react"

// ── Design tokens ──
// Same teal palette as your original page, plus extra teal shades
// (tealFaint, tealDeep) so the page has depth without leaving the family.
const c = {
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
}

// ── Copy lives in plain arrays so you can edit words without touching layout ──
const navLinks = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Plugin Intelligence", href: "#plugins" },
  { label: "Pricing", href: "#pricing" },
]

const steps = [
  { title: "Create a project", text: "Name it and add the basics: tempo, key and the DAW you use." },
  { title: "Connect your folder", text: "Pick your project folder in the desktop app. SyncTrackr saves a version each time you save in your DAW. You can also save a version by hand." },
  { title: "Restore any version", text: "Browse your history, open any version and bring the session back, with a list of the plugins it used." },
]

const bigFeatures = [
  { title: "Automatic backups",
    text: "A small desktop app watches your project folder and saves a version whenever you save in your DAW.",
    rows: [["Saved midnight-echoes.flp", "2 min ago"], ["Version 13 created", "2 min ago"], ["Uploaded 84 MB", "2 min ago"]] },
  { title: "Reads your project files",
    text: "SyncTrackr looks inside the project and records what it finds, starting with FL Studio.",
    rows: [["Tracks found", "3"], ["Plugins found", "7"], ["Presets recorded", "7"]] },
  { title: "Restore help",
    text: "Rebuild a session from any saved version, with a checklist of the files and plugins you need.",
    checks: ["Project file", "Plugins to install", "Presets to load"] },
]

// The stops on the "project journey" timeline (taken from your dashboard mockup).
const journey = [
  { label: "Project created", when: "5 days ago" },
  { label: "Version 3", when: "4 days ago" },
  { label: "Version 5", when: "3 days ago" },
  { label: "Version 8", when: "Yesterday" },
  { label: "Version 12", when: "Today" },
]

const smallFeatures = [
  { title: "Version history", text: "Every save has a note, a date and the file you attached, so you can see how a track evolved." },
  { title: "Private cloud storage", text: "Your files sit in private storage. Only you can request them, and each download link expires within minutes." },
  { title: "Works with any DAW", text: "FL Studio, Ableton, Logic, Pro Tools: if it makes a file, you can save it as a version." },
  { title: "Delete means delete", text: "Removing a version also removes its file from storage, so nothing lingers after you delete it." },
]

const pluginFacts = [
  { label: "Plugin", text: "Which plugin sat on the track" },
  { label: "Version", text: "The plugin version you used" },
  { label: "Preset", text: "The preset that was loaded" },
  { label: "Order", text: "Where it sat in the signal chain" },
]

// The "Works with" names that glide across the bottom of the hero. Add or remove names here.
// The marquee speed adjusts by itself to the length of this list.
const daws = [
  "FL Studio", "Cubase", "Reason", "Pro Tools", "Studio One", "Ableton Live", "Logic Pro",
  "Bitwig Studio", "Cakewalk", "GarageBand", "MOTU Digital Performer", "Ardour", "Any DAW that saves a file",
]

// "amount" is a plain number so the price can count up when it scrolls into view.
const tiers = [
  { name: "Free", storage: "5 GB", amount: 0, cta: "Start free", primary: true,
    points: ["Projects up to 1 GB", "Keeps your latest version", "Private by default"] },
  { name: "Starter", storage: "100 GB", amount: 19, cta: "Choose Starter",
    points: ["Everything in Free", "Basic version history"] },
  { name: "Creator", storage: "200 GB", amount: 39, cta: "Choose Creator",
    points: ["Full version history", "Faster sync"] },
  { name: "Pro", storage: "1 TB", amount: 69, cta: "Choose Pro",
    points: ["Unlimited version history", "Priority support"] },
]

// Example data for the interactive preview in the hero.
const demoVersions = [
  { id: "v12", label: "Version 12", when: "Today", note: "Vocal chain and sidechain added",
    tracks: [
      { name: "Lead vocal", chain: [["Parametric EQ", "Vocal Air"], ["Compressor", "Smooth 3:1"], ["Plate Reverb", "Short Plate"]] },
      { name: "Bass", chain: [["Saturator", "Warm Low"], ["Compressor", "Sidechain Kick"]] },
      { name: "Drum bus", chain: [["Parametric EQ", "Punch"], ["Compressor", "Glue 2:1"]] },
    ] },
  { id: "v8", label: "Version 8", when: "Yesterday", note: "Reworked the drop",
    tracks: [
      { name: "Lead vocal", chain: [["Parametric EQ", "Vocal Air"], ["Compressor", "Smooth 3:1"]] },
      { name: "Bass", chain: [["Saturator", "Warm Low"]] },
      { name: "Drum bus", chain: [["Compressor", "Glue 2:1"]] },
    ] },
  { id: "v5", label: "Version 5", when: "3 days ago", note: "Rough arrangement",
    tracks: [
      { name: "Lead vocal", chain: [["Parametric EQ", "Default"]] },
      { name: "Bass", chain: [["Saturator", "Default"]] },
      { name: "Drum bus", chain: [["Compressor", "Default"]] },
    ] },
]

// ── All styling lives here as real CSS ──
// Inline styles cannot do hover, focus outlines, media queries or keyframe animations.
// A <style> tag can. The :root block turns the JS palette into CSS variables.
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg: ${c.bg}; --surface: ${c.surface}; --border: ${c.border};
  --teal: ${c.teal}; --teal-dark: ${c.tealDark}; --teal-soft: ${c.tealSoft};
  --teal-faint: ${c.tealFaint}; --teal-deep: ${c.tealDeep};
  --text: ${c.text}; --soft: ${c.textSoft}; --faint: ${c.textFaint};
  --ease: cubic-bezier(.2, .8, .2, 1);
}
.st-root { background: var(--bg); color: var(--text); min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; overflow-x: clip; }
.st-root * { box-sizing: border-box; }
/* When a nav link jumps to a section, stop just below the sticky header instead of under it */
.st-root [id] { scroll-margin-top: 76px; }
:where(.st-root) :is(h1, h2, h3) { font-family: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif;
  margin: 0; letter-spacing: -0.02em; line-height: 1.12; }
:where(.st-root) p { margin: 0; }
.st-container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.st-wide { max-width: 1360px; margin: 0 auto; padding: 0 28px; }
.st-section { padding-top: 88px; padding-bottom: 88px; }
.st-h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 700; margin-bottom: 14px; }
.st-lead { font-size: 17px; color: var(--soft); max-width: 560px; }

/* ═══ MOTION ═══ */

/* Text reveal: each word sits in a clipped box and slides up from below it */
.st-w { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: .14em; margin-bottom: -.14em; }
.st-wi { display: inline-block; transform: translateY(115%); transition: transform .85s var(--ease); }
.st-in .st-wi { transform: none; }

/* Scroll reveal: one base class, with a different starting position per kind */
.st-rv { opacity: 0; transform: translateY(28px);
  transition: opacity .7s ease var(--d, 0s), transform .8s var(--ease) var(--d, 0s); }
.st-rv.st-k-zoom { transform: scale(.9) translateY(20px); }
.st-rv.st-k-left { transform: translateX(-48px); }
.st-rv.st-k-right { transform: translateX(48px); }
.st-rv.st-in { opacity: 1; transform: none; }

/* Wipe: a section is uncovered from left to right */
.st-wipe { clip-path: inset(0 100% 0 0); transition: clip-path 1s cubic-bezier(.7, 0, .2, 1); }
.st-wipe.st-in { clip-path: inset(0 0 0 0); }

/* Load animations: play once when the page opens */
@keyframes st-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes st-from-right { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: none; } }
@keyframes st-slide { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
.st-load { animation: st-up .8s var(--ease) both; animation-delay: var(--d, 0s); }

/* Marquee: the track holds two copies, so sliding by -50% loops cleanly */
@keyframes st-scroll { to { transform: translateX(-50%); } }

/* Scroll progress bar at the very top of the screen */
.st-progress { position: absolute; left: 0; top: 0; height: 3px; width: 100%; background: var(--teal);
  transform-origin: left; transform: scaleX(0); }

/* Scroll-driven words: they light up as you scroll past them */
.st-sw { color: #C3CFCC; transition: color .3s; }
.st-sw.on { color: var(--text); }

/* buttons */
.st-btn { font: 600 15px 'Inter', system-ui, sans-serif; border-radius: 10px; cursor: pointer;
  padding: 13px 24px; border: 1px solid transparent; transition: background .15s, border-color .15s, color .15s; }
.st-btn-sm { padding: 10px 18px; font-size: 13.5px; border-radius: 8px; }
.st-btn-primary { background: var(--teal); color: #fff; }
.st-btn-primary:hover { background: var(--teal-dark); }
.st-btn-light { background: #fff; color: var(--teal-deep); }
.st-btn-light:hover { background: var(--teal-soft); }
.st-btn-ghost { background: transparent; color: var(--text); border-color: var(--border); }
.st-btn-ghost:hover { border-color: var(--teal); color: var(--teal); }
.st-btn-outline { background: var(--surface); color: var(--teal); border-color: var(--teal); }
.st-btn-outline:hover { background: var(--teal-soft); }
.st-btn:focus-visible, .st-root a:focus-visible, .st-commit:focus-visible, .st-burger:focus-visible, .st-link:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }

/* ═══ HEADER (logo and links left, sign in and button right) ═══ */
.st-header { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); transition: box-shadow .25s; }
.st-header.st-scrolled { box-shadow: 0 8px 24px -14px rgba(7,63,57,.35); }
.st-header-row { display: flex; align-items: center; height: 68px; transition: height .25s; }
.st-header.st-scrolled .st-header-row { height: 58px; }
.st-nav-left { display: flex; align-items: center; gap: 36px; }
.st-nav { display: flex; align-items: center; gap: 24px; }
.st-nav a { position: relative; font-size: 13.5px; font-weight: 500; color: var(--text); text-decoration: none; padding: 6px 0; }
.st-nav a::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--teal);
  transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease); }
.st-nav a:hover { color: var(--teal); }
.st-nav a:hover::after { transform: scaleX(1); }
.st-nav-right { margin-left: auto; display: flex; align-items: center; gap: 22px; }
.st-link { background: none; border: 0; font: 500 13.5px 'Inter', sans-serif; color: var(--text); cursor: pointer; padding: 8px 2px; }
.st-link:hover { color: var(--teal); }
.st-logo { display: flex; align-items: center; gap: 8px; font: 700 20px 'Bricolage Grotesque', sans-serif; color: var(--teal); text-decoration: none; padding: 8px 0; }

/* mobile menu button: three lines that turn into an X */
.st-burger { display: none; margin-left: auto; width: 42px; height: 42px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--surface); cursor: pointer; align-items: center; justify-content: center; flex-direction: column; gap: 5px; }
.st-burger span { display: block; width: 18px; height: 2px; background: var(--text); border-radius: 2px; transition: transform .3s var(--ease), opacity .2s; }
.st-burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.st-burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.st-burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* mobile menu panel: height animates from 0fr to 1fr */
.st-mobile { display: grid; grid-template-rows: 0fr; visibility: hidden; transition: grid-template-rows .35s var(--ease), visibility 0s .35s; }
.st-mobile.open { grid-template-rows: 1fr; visibility: visible; transition-delay: 0s; }
.st-mobile-inner { overflow: hidden; }
.st-mobile-pad { padding: 8px 28px 24px; border-top: 1px solid var(--border); display: grid; gap: 4px;
  max-height: calc(100vh - 70px); max-height: calc(100dvh - 70px); overflow-y: auto; }
.st-mobile-pad a { padding: 12px 0; font-size: 16px; font-weight: 500; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border); }
.st-mobile-pad .st-btn { margin-top: 12px; width: 100%; }

/* ═══ HERO (dark teal, with a dotted texture, drifting glows and a cursor spotlight) ═══ */
.st-hero-wrap { position: relative; overflow: hidden; isolation: isolate; color: #fff;
  background: linear-gradient(155deg, #0B5A52 0%, #073F39 55%, #052E2A 100%); }
.st-hero-wrap::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background-image: radial-gradient(rgba(255,255,255,.17) 1.2px, transparent 1.7px); background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse at 72% 38%, #000 0%, transparent 72%);
  mask-image: radial-gradient(ellipse at 72% 38%, #000 0%, transparent 72%); }
.st-hero-wrap::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(420px circle at var(--gx, 70%) var(--gy, 30%), rgba(127,209,198,.16), transparent 65%); }
.st-orb { position: absolute; z-index: -1; border-radius: 50%; filter: blur(80px); pointer-events: none; }
.st-orb-a { width: 380px; height: 380px; right: -60px; top: -80px; background: rgba(14,128,116,.55);
  transform: translate(calc(var(--p, 0) * 70px), calc(var(--p, 0) * -140px)); }
.st-orb-b { width: 300px; height: 300px; left: -80px; bottom: 40px; background: rgba(127,209,198,.22);
  transform: translate(calc(var(--p, 0) * -40px), calc(var(--p, 0) * 120px)); }
.st-hero { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: center; padding: 88px 24px 56px; }
.st-hero-copy { transform: translateY(calc(var(--p, 0) * -50px)); opacity: calc(1 - var(--p, 0) * .85); }
.st-hero h1 { font-size: clamp(38px, 5.4vw, 62px); font-weight: 700; margin-bottom: 20px; color: #fff; }
.st-hero-sub { font-size: 18px; color: #BFE0DB; max-width: 480px; margin-bottom: 44px; }
.st-hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 20px; }
.st-textlink { display: inline-block; padding: 10px 0; color: #BFE0DB; font-size: 14px; font-weight: 600; text-decoration: none; }
.st-textlink:hover { color: #fff; }
.st-hero-note { font-size: 13px; color: #8CB8B1; margin-top: 16px; }
.st-hero-panel { animation: st-from-right 1s var(--ease) .35s both; }
.st-parallax { transform: translateY(calc(var(--p, 0) * -80px)); }
.st-tilt { transition: transform .25s ease-out; will-change: transform; }

/* magnetic buttons: the outer box is a bigger hit area, the inner box moves */
.st-mag { display: inline-block; padding: 14px; margin: -14px; }
.st-mag > span { display: inline-block; transition: transform .2s ease-out; }

/* DAW marquee (sits at the bottom of the hero) */
.st-marquee { position: relative; display: flex; align-items: center; gap: 28px; padding: 0 24px 56px; font-size: 14px; color: #9ECBC4; }
.st-marquee b { color: #fff; font-weight: 600; flex: none; }
.st-marquee-view { flex: 1; overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.st-marquee-track { display: flex; width: max-content; animation: st-scroll 40s linear infinite; }
.st-marquee-view:hover .st-marquee-track { animation-play-state: paused; }
.st-marquee-group { display: flex; flex: none; gap: 48px; padding-right: 48px; white-space: nowrap; }

/* hero preview panel */
.st-panel { background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,.2); border-radius: 16px; overflow: hidden;
  box-shadow: 0 34px 70px -24px rgba(0,0,0,.55); }
.st-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--teal-faint); }
.st-panel-title { font: 700 16px 'Bricolage Grotesque', sans-serif; }
.st-panel-meta { font-size: 12.5px; color: var(--soft); }
.st-sync { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--teal-dark);
  background: var(--teal-soft); border-radius: 999px; padding: 3px 10px; }
.st-sync i { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); }
.st-panel-body { display: grid; grid-template-columns: 200px 1fr; }
.st-commits { border-right: 1px solid var(--border); padding: 8px; }
.st-commit { width: 100%; text-align: left; background: none; border: 0; border-radius: 10px; padding: 10px 12px;
  cursor: pointer; font-family: inherit; color: var(--text); transition: background .15s; }
.st-commit:hover { background: var(--teal-faint); }
.st-commit[aria-pressed="true"] { background: var(--teal-soft); }
.st-commit b { display: block; font-size: 14px; }
.st-commit span { display: block; font-size: 12px; color: var(--soft); }
.st-tracks { padding: 16px 20px; }
.st-track { padding: 12px 0; border-bottom: 1px solid var(--border); animation: st-slide .55s var(--ease) both; animation-delay: calc(var(--i) * .09s); }
.st-track:last-child { border-bottom: 0; }
.st-track-name { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.st-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.st-plugin { background: var(--teal-soft); border-radius: 8px; padding: 5px 10px; font-size: 12.5px; color: var(--teal-dark); }
.st-plugin small { display: block; font-size: 11px; color: var(--soft); }
.st-sep { color: var(--faint); font-size: 14px; }
.st-panel-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 20px; border-top: 1px solid var(--border); font-size: 12.5px; color: var(--soft); }
.st-panel-foot .st-btn { padding: 10px 16px; font-size: 13px; }

/* problem */
.st-problem { background: var(--surface); border-bottom: 1px solid var(--border); }
.st-problem-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 56px; align-items: start; }
.st-big { font-size: clamp(20px, 2.3vw, 26px); font-weight: 500; line-height: 1.5; letter-spacing: -0.01em; }

/* steps: each one switches on as you scroll to it, and switches off again if you scroll back */
.st-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 40px; }
.st-step { position: relative; border-top: 2px solid var(--border); padding-top: 22px; opacity: .4; transform: translateY(14px);
  transition: opacity .6s ease, transform .7s var(--ease); }
.st-step::before { content: ""; position: absolute; top: -2px; left: 0; right: 0; height: 2px; background: var(--teal);
  transform: scaleX(0); transform-origin: left; transition: transform .9s var(--ease); }
.st-step.on { opacity: 1; transform: none; }
.st-step.on::before { transform: scaleX(1); }
.st-step-num { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 14px;
  background: var(--teal-soft); color: var(--teal); font: 700 14px 'Bricolage Grotesque', sans-serif; transition: background .4s, color .4s; }
.st-step.on .st-step-num { background: var(--teal); color: #fff; }
.st-step h3 { font-size: 20px; margin-bottom: 8px; }
.st-step p { color: var(--soft); font-size: 15px; }

/* ═══ FEATURES (mid teal: darker than the page, lighter than the hero) ═══ */
.st-features { position: relative; isolation: isolate; padding: 88px 0; color: #fff;
  background: linear-gradient(180deg, #0B685F 0%, #0A5A52 100%); }
.st-features::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background-image: radial-gradient(rgba(255,255,255,.10) 1.2px, transparent 1.7px); background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse at 20% 0%, #000 0%, transparent 70%);
  mask-image: radial-gradient(ellipse at 20% 0%, #000 0%, transparent 70%); }
.st-features .st-h2 { color: #fff; }
.st-features .st-lead { color: #BFE0DB; }

/* feature tiles (with a spotlight that follows your cursor) */
.st-bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 40px; }
.st-feat { position: relative; background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,.2); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; }
.st-feat::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .3s;
  background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(14,128,116,.11), transparent 70%); }
.st-feat:hover::before { opacity: 1; }
.st-feat h3 { font-size: 20px; margin-bottom: 8px; }
.st-feat > p { color: var(--soft); font-size: 15px; margin-bottom: 20px; }
.st-mini { margin-top: auto; background: var(--teal-faint); border-radius: 12px; padding: 6px 14px; }
.st-mini-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; font-size: 13px; border-bottom: 1px solid var(--border);
  opacity: 0; transform: translateX(-10px);
  transition: opacity .5s ease calc(.45s + var(--i) * .12s), transform .6s var(--ease) calc(.45s + var(--i) * .12s); }
.st-in .st-mini-row { opacity: 1; transform: none; }
.st-mini-row:last-child { border-bottom: 0; }
.st-mini-row > span:last-child { color: var(--soft); white-space: nowrap; }
.st-mini-row > span:first-child { overflow-wrap: anywhere; }
.st-mini-row > span:first-child { display: flex; align-items: center; gap: 8px; }
.st-mini-row .st-tick { width: 18px; height: 18px; }
.st-tick { flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--teal-soft); color: var(--teal);
  display: flex; align-items: center; justify-content: center; }

/* project journey: a timeline whose line fills as you scroll */
.st-journey { background: var(--surface); color: var(--text); border-radius: 16px; padding: 28px 28px 30px; margin-top: 16px; }
.st-journey h3 { font-size: 20px; margin-bottom: 4px; }
.st-journey > p { color: var(--soft); font-size: 15px; margin-bottom: 28px; }
.st-jr-track { position: relative; display: flex; justify-content: space-between; }
.st-jr-track::before, .st-jr-track::after { content: ""; position: absolute; top: 9px; left: 10%; right: 10%; height: 2px; }
.st-jr-track::before { background: var(--teal-soft); }
.st-jr-track::after { background: var(--teal); transform-origin: left; transform: scaleX(var(--fill, 0)); transition: transform .2s linear; }
.st-jr-node { position: relative; flex: 1; text-align: center; }
.st-jr-dot { position: relative; z-index: 1; display: block; width: 20px; height: 20px; border-radius: 50%; margin: 0 auto 10px;
  background: var(--surface); border: 2px solid #BFD8D4; transition: background .35s, border-color .35s, box-shadow .35s; }
.st-jr-node.on .st-jr-dot { background: var(--teal); border-color: var(--teal); box-shadow: 0 0 0 6px rgba(14,128,116,.16); }
.st-jr-node b { display: block; font-size: 14px; color: var(--soft); transition: color .35s; }
.st-jr-node.on b { color: var(--text); }
.st-jr-node span { display: block; font-size: 12.5px; color: var(--faint); }

.st-small { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; margin-top: 56px; }
.st-small h3 { font: 600 16px 'Inter', sans-serif; letter-spacing: 0; margin-bottom: 6px; color: #7FD1C6; }
.st-small p { font-size: 14.5px; color: #CFE6E2; }

/* plugin intelligence */
.st-pi { background: var(--teal-deep); color: #fff; }
.st-pi .st-lead { color: #BFE0DB; }
.st-pi-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 56px; align-items: center; }
.st-pi-facts { display: grid; gap: 1px; background: rgba(255,255,255,.14); border-radius: 14px; overflow: hidden; }
.st-pi-fact { background: #0D4A43; padding: 16px 20px; display: flex; gap: 16px; align-items: baseline; }
.st-pi-fact b { min-width: 72px; font-size: 14px; color: #7FD1C6; }
.st-pi-fact span { font-size: 15px; color: #E7F4F2; }

/* pricing */
.st-pricing { background: var(--surface); border-top: 1px solid var(--border); }
.st-tiers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 40px; }
.st-tier { border: 1px solid var(--border); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; background: var(--bg);
  transition: opacity .7s ease var(--d, 0s), transform .8s var(--ease) var(--d, 0s), border-color .2s; }
.st-tier:hover { border-color: var(--teal); }
.st-tier h3 { font-size: 18px; margin-bottom: 4px; }
.st-price { font: 700 36px 'Bricolage Grotesque', sans-serif; margin: 12px 0 2px; font-variant-numeric: tabular-nums; }
.st-price small { font: 400 14px 'Inter', sans-serif; color: var(--soft); }
.st-storage { color: var(--soft); font-size: 14px; margin-bottom: 18px; }
.st-tier ul { list-style: none; padding: 0; margin: 0 0 22px; flex: 1; }
.st-tier li { font-size: 14px; color: var(--soft); padding: 5px 0; }
.st-tier .st-btn { width: 100%; }

/* closing */
.st-closing { background: var(--teal-soft); text-align: center; padding: 72px 0; }
.st-closing h2 { font-size: clamp(28px, 4vw, 40px); margin-bottom: 24px; }
.st-footer { background: var(--surface); border-top: 1px solid var(--border); }
.st-footer-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 22px; padding-bottom: 22px; font-size: 13px; color: var(--soft); }

/* ═══ SMALL SCREENS ═══ */
@media (max-width: 960px) {
  .st-nav, .st-nav-right { display: none; }
  .st-burger { display: flex; }
  .st-hero, .st-problem-grid, .st-pi-grid { grid-template-columns: 1fr; gap: 40px; }
  .st-hero { padding-top: 56px; }
  .st-steps { grid-template-columns: 1fr; gap: 28px; }
  .st-bento { grid-template-columns: 1fr; }
  .st-small, .st-tiers { grid-template-columns: repeat(2, 1fr); }
  .st-section { padding-top: 64px; padding-bottom: 64px; }
  .st-features { padding: 64px 0; }
  .st-rv.st-k-left:not(.st-in), .st-rv.st-k-right:not(.st-in) { transform: translateY(28px); }
}
@media (max-width: 700px) {
  /* the journey turns vertical: dots on the left, labels on the right, and the line fills downwards */
  .st-jr-track { flex-direction: column; gap: 22px; }
  .st-jr-track::before, .st-jr-track::after { left: 9px; right: auto; top: 10px; bottom: 10px; width: 2px; height: auto; }
  .st-jr-track::after { transform-origin: top; transform: scaleY(var(--fill, 0)); }
  .st-jr-node { flex: none; text-align: left; padding-left: 40px; }
  .st-jr-dot { position: absolute; left: 0; top: 0; margin: 0; }
}
@media (max-width: 560px) {
  .st-wide { padding: 0 18px; }
  .st-panel-body { grid-template-columns: 1fr; }
  .st-commits { border-right: 0; border-bottom: 1px solid var(--border); display: flex; overflow-x: auto; }
  .st-commit { min-width: 150px; }
  .st-small, .st-tiers { grid-template-columns: 1fr; }
  .st-marquee { gap: 16px; }
  .st-journey { padding: 22px 20px; }
}

/* People who ask their device for less motion get a still page with everything visible */
@media (prefers-reduced-motion: reduce) {
  .st-wi, .st-rv, .st-mini-row, .st-tier, .st-load, .st-hero-panel, .st-track, .st-step, .st-hero-copy, .st-parallax, .st-orb {
    opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }
  .st-wipe { clip-path: none !important; transition: none !important; }
  .st-step::before { transform: none !important; transition: none !important; }
  .st-jr-track::after, .st-jr-dot, .st-jr-node b { transition: none !important; }
  .st-sw { color: var(--text); }
  .st-marquee-track { animation: none; flex-wrap: wrap; }
  .st-marquee-view { overflow-x: auto; }
  .st-marquee-group { flex-wrap: wrap; }
  .st-marquee-group[aria-hidden="true"] { display: none; }
}
`

// ── Motion helpers ──

const clamp = n => Math.min(1, Math.max(0, n))

// Scrolls back to the top of the page (the logo uses this).
// People who asked their device for less motion get an instant jump instead of a smooth scroll.
function scrollTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
}

// True only on devices with a real mouse AND where the user has not asked for less motion.
// The mouse-driven effects check this so touch screens and reduced-motion users skip them.
const canHover = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches

// useScrollEffect runs a function once on load, then again on scroll and resize.
// requestAnimationFrame batches the calls to once per screen refresh, and { passive: true }
// tells the browser our handler will never block scrolling. Several effects below share it.
function useScrollEffect(fn) {
  useEffect(() => {
    let frame = 0
    const run = () => { frame = 0; fn() }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(run) }
    fn()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
    // fn only touches refs and stable setters, so it is safe to capture it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// useInView flips "seen" to true the first time an element scrolls into view.
// IntersectionObserver is a browser tool that tells us when an element becomes visible.
function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setSeen(true))
      return () => cancelAnimationFrame(frame)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setSeen(true); io.disconnect() } // play once, then stop watching
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return [ref, seen]
}

// Reveal plays an effect once when its content scrolls into view.
// kind: "up" (default), "zoom", "left" or "right". delay (seconds) staggers siblings.
function Reveal({ as: Tag = "div", kind = "up", delay = 0, className = "", children, ...rest }) {
  const [ref, seen] = useInView()
  const base = kind === "up" ? "st-rv" : `st-rv st-k-${kind}`
  return (
    <Tag ref={ref} className={`${base} ${seen ? "st-in" : ""} ${className}`} style={{ "--d": `${delay}s` }} {...rest}>
      {children}
    </Tag>
  )
}

// Wipe uncovers a full-width section from left to right.
// IMPORTANT: the watched element (the outer <section>) is never clipped, only the inner box is.
// If we watched the clipped box itself, the browser could treat it as invisible, never report it
// as "seen", and the section would stay blank forever.
function Wipe({ id, className = "", children }) {
  const [ref, seen] = useInView(0.1)
  return (
    <section id={id} ref={ref}>
      <div className={`st-wipe ${seen ? "st-in" : ""} ${className}`}>{children}</div>
    </section>
  )
}

// RevealText splits a heading into words. Each word slides up from behind an invisible edge,
// one after another. aria-label keeps the full sentence readable for screen readers.
function RevealText({ as: Tag = "h2", text, className = "", delay = 0 }) {
  const [ref, seen] = useInView(0.3)
  const words = text.split(" ")
  return (
    <Tag ref={ref} className={`${className} ${seen ? "st-in" : ""}`} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="st-w">
            <span className="st-wi" style={{ transitionDelay: `${delay + i * 0.06}s` }}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  )
}

// ScrollWords is a paragraph whose words light up as you scroll through it.
// This effect follows your scroll position (it moves forwards and backwards with you),
// unlike Reveal, which plays once.
function ScrollWords({ text, className = "" }) {
  const ref = useRef(null)
  useScrollEffect(() => {
    const el = ref.current
    if (!el) return
    const words = el.querySelectorAll(".st-sw")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const vh = window.innerHeight
    const r = el.getBoundingClientRect()
    // p goes from 0 (paragraph just entering at the bottom) to 1 (paragraph near the middle of the screen)
    const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (vh * 0.45 + r.height))
    const lit = Math.round(p * words.length)
    words.forEach((w, i) => w.classList.toggle("on", i < lit))
  })
  return (
    <p ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((w, i) => <span key={i} className="st-sw" aria-hidden="true">{w} </span>)}
    </p>
  )
}

// Steps switches each step on (and back off) depending on how far you have scrolled.
function Steps() {
  const ref = useRef(null)
  useScrollEffect(() => {
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll(".st-step")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const vh = window.innerHeight
    const r = el.getBoundingClientRect()
    // fill goes from 0 to 1 as the top of the steps area travels from 80% down the screen to about 35%
    const fill = reduce ? 1 : clamp((vh * 0.8 - r.top) / (vh * 0.45))
    items.forEach((it, i) => it.classList.toggle("on", fill >= 0.04 + i * 0.42))
  })
  return (
    <div className="st-steps" ref={ref}>
      {steps.map((s, i) => (
        <div key={s.title} className="st-step">
          <p className="st-step-num">{i + 1}</p>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </div>
      ))}
    </div>
  )
}

// Journey is a timeline card. As you scroll, a teal line fills along it and each stop lights up.
function Journey() {
  const trackRef = useRef(null)
  useScrollEffect(() => {
    const el = trackRef.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const vh = window.innerHeight
    const r = el.getBoundingClientRect()
    // fill goes from 0 to 1 as the timeline travels from 85% down the screen to about 40%
    const fill = reduce ? 1 : clamp((vh * 0.85 - r.top) / (vh * 0.45))
    // The line reads this CSS variable: scaleX(var(--fill)) on wide screens, scaleY on phones.
    el.style.setProperty("--fill", fill.toFixed(3))
    const last = journey.length - 1
    el.querySelectorAll(".st-jr-node").forEach((node, i) =>
      node.classList.toggle("on", fill >= 0.02 + (i / last) * 0.96)
    )
  })
  return (
    <Reveal className="st-journey">
      <h3>Your project journey</h3>
      <p>A timeline of how your session evolved, one saved version at a time.</p>
      <div className="st-jr-track" ref={trackRef}>
        {journey.map(j => (
          <div key={j.label} className="st-jr-node">
            <i className="st-jr-dot" />
            <b>{j.label}</b>
            <span>{j.when}</span>
          </div>
        ))}
      </div>
    </Reveal>
  )
}

// CountUp counts from 0 to a number the first time it is seen.
function CountUp({ to, prefix = "", duration = 1200 }) {
  const [ref, seen] = useInView(0.5)
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setVal(to))
      return () => cancelAnimationFrame(frame)
    }
    let raf = 0, t0 = 0
    const tick = t => {
      if (!t0) t0 = t
      const k = Math.min(1, (t - t0) / duration)
      setVal(Math.round(to * (1 - Math.pow(1 - k, 3)))) // ease-out: fast at first, slows at the end
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, duration])
  return <span ref={ref}>{prefix}{val}</span>
}

// Tilt rotates its content in 3D, following the mouse.
function Tilt({ children }) {
  const ref = useRef(null)
  function move(e) {
    if (!canHover() || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5   // -0.5 (left edge) to 0.5 (right edge)
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(1000px) rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg)`
  }
  function leave() { if (ref.current) ref.current.style.transform = "" }
  return <div ref={ref} className="st-tilt" onMouseMove={move} onMouseLeave={leave}>{children}</div>
}

// Magnetic pulls its content a little toward the cursor when the mouse is near.
function Magnetic({ children }) {
  const inner = useRef(null)
  function move(e) {
    if (!canHover() || !inner.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.3
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.4
    inner.current.style.transform = `translate(${dx}px, ${dy}px)`
  }
  function leave() { if (inner.current) inner.current.style.transform = "" }
  return <span className="st-mag" onMouseMove={move} onMouseLeave={leave}><span ref={inner}>{children}</span></span>
}

// Feeds the mouse position into CSS variables, which the spotlight styles read.
function trackMouse(xName, yName) {
  return e => {
    if (!canHover()) return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty(xName, `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty(yName, `${e.clientY - r.top}px`)
  }
}
const heroGlow = trackMouse("--gx", "--gy")
const tileSpot = trackMouse("--mx", "--my")

// ── Small pieces ──

// The logo: a cloud outline with a check mark, echoing the cloud icon in your mockup.
// Pass onClick to make it a link. Without onClick it is plain, non-clickable text.
function Logo({ onClick }) {
  const Tag = onClick ? "a" : "span"
  const linkProps = onClick
    ? { href: "/", onClick: e => { e.preventDefault(); onClick() }, "aria-label": "SyncTrackr, back to top" }
    : {}
  return (
    <Tag className="st-logo" {...linkProps}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M8.5 21a5.5 5.5 0 0 1-.6-10.97A7 7 0 0 1 21.4 11.6 4.7 4.7 0 0 1 20.5 21H8.5Z"
          stroke="#0E8074" strokeWidth="2" strokeLinejoin="round" />
        <path d="m10.5 15.5 2.6 2.6 5-5.2" stroke="#0E8074" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      SyncTrackr
    </Tag>
  )
}

function Tick() {
  return (
    <span className="st-tick" aria-hidden="true">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="m2.5 6.3 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// The hero preview. Clicking a version slides in that version's plugin chains,
// and "Restore this version" shows a confirmation for the version you picked.
function VersionPreview() {
  const [activeId, setActiveId] = useState(demoVersions[0].id)
  const [restoredId, setRestoredId] = useState(null)
  const active = demoVersions.find(v => v.id === activeId)

  // Picking a different version also clears any old "restored" message.
  function pick(id) {
    setActiveId(id)
    setRestoredId(null)
  }

  return (
    <div className="st-panel">
      <div className="st-panel-head">
        <div>
          <p className="st-panel-title">Midnight Echoes</p>
          <p className="st-panel-meta">FL Studio · 104 BPM · F# minor</p>
        </div>
        <span className="st-sync"><i /> All versions synced</span>
      </div>
      <div className="st-panel-body">
        <div className="st-commits" role="group" aria-label="Saved versions">
          {demoVersions.map(v => (
            <button key={v.id} className="st-commit" aria-pressed={v.id === activeId} onClick={() => pick(v.id)}>
              <b>{v.label}</b>
              <span>{v.note}</span>
              <span>{v.when}</span>
            </button>
          ))}
        </div>
        {/* key={activeId} makes React rebuild this block when the version changes,
            which restarts the slide-in animation on every track row. */}
        <div className="st-tracks" key={activeId}>
          {active.tracks.map((t, ti) => (
            <div key={t.name} className="st-track" style={{ "--i": ti }}>
              <p className="st-track-name">{t.name}</p>
              <div className="st-chain">
                {t.chain.map(([plugin, preset], i) => (
                  <span key={plugin + i} style={{ display: "contents" }}>
                    {i > 0 && <span className="st-sep">›</span>}
                    <span className="st-plugin">{plugin}<small>{preset}</small></span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="st-panel-foot">
        <span aria-live="polite">
          {restoredId === activeId ? `${active.label} is ready to download.` : "Example project. Pick a version."}
        </span>
        <button className="st-btn st-btn-primary" onClick={() => setRestoredId(activeId)}>Restore this version</button>
      </div>
    </div>
  )
}

// ── The page ──
export default function Landing({ onGetStarted }) {
  const barRef = useRef(null)
  const heroRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // One scroll handler drives three things: the progress bar, the hero parallax and the header style.
  // The bar and the hero are updated directly (no React state), so scrolling never re-renders the page.
  useScrollEffect(() => {
    const y = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`
    if (heroRef.current) {
      // --p is 0 at the top of the page and 1 once the hero has fully scrolled away.
      // The CSS uses it to move the glows, the copy and the preview at different speeds.
      heroRef.current.style.setProperty("--p", clamp(y / heroRef.current.offsetHeight).toFixed(3))
    }
    setScrolled(y > 8) // React ignores this call when the value has not changed
  })

  return (
    <div className="st-root">
      <style>{css}</style>

      {/* Header: logo and links on the left, sign in and button on the right (burger menu on small screens) */}
      <header className={`st-header ${scrolled ? "st-scrolled" : ""}`}>
        <div className="st-progress" ref={barRef} aria-hidden="true" />
        <div className="st-wide st-header-row">
          <div className="st-nav-left">
            <Logo onClick={() => { setMenuOpen(false); scrollTop() }} />
            <nav className="st-nav" aria-label="Main">
              {navLinks.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
            </nav>
          </div>
          <div className="st-nav-right">
            <button className="st-link" onClick={onGetStarted}>Sign in</button>
            <button className="st-btn st-btn-primary st-btn-sm" onClick={onGetStarted}>Create free account</button>
          </div>
          <button className="st-burger" aria-label="Menu" aria-expanded={menuOpen} aria-controls="st-mobile"
            onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
        <div id="st-mobile" className={`st-mobile ${menuOpen ? "open" : ""}`}>
          <div className="st-mobile-inner">
            <div className="st-mobile-pad">
              {navLinks.map(l => <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
              <button className="st-btn st-btn-ghost" onClick={onGetStarted}>Sign in</button>
              <button className="st-btn st-btn-primary" onClick={onGetStarted}>Create free account</button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: dark teal. Glows drift and the copy fades as you scroll, the preview tilts toward your mouse */}
        <section className="st-hero-wrap" ref={heroRef} onMouseMove={heroGlow}>
          <div className="st-orb st-orb-a" aria-hidden="true" />
          <div className="st-orb st-orb-b" aria-hidden="true" />
          <div className="st-container st-hero">
            <div className="st-hero-copy">
              <RevealText as="h1" text="Never lose a project again." delay={0.1} />
              <p className="st-hero-sub st-load" style={{ "--d": "0.55s" }}>
                SyncTrackr is version history for your music sessions, like GitHub for music.
                It backs up your project as you work and remembers the plugins behind every track.
              </p>
              <div className="st-hero-actions st-load" style={{ "--d": "0.7s" }}>
                <Magnetic>
                  <button className="st-btn st-btn-light" onClick={onGetStarted}>Get started free</button>
                </Magnetic>
                <a className="st-textlink" href="#how">or see how it works</a>
              </div>
              <p className="st-hero-note st-load" style={{ "--d": "0.85s" }}>The free plan includes 5 GB. Sign up with Google or email.</p>
            </div>
            <div className="st-hero-panel">
              <div className="st-parallax">
                <Tilt><VersionPreview /></Tilt>
              </div>
            </div>
          </div>

          {/* DAW marquee: two identical groups side by side, slid left forever.
              The animation-duration grows with the list (3.5 seconds per name), so the speed
              stays the same however many DAWs you add. Each group is wider than the screen,
              so there is no gap when it loops. */}
          <div className="st-container st-marquee">
            <b>Works with</b>
            <div className="st-marquee-view">
              <div className="st-marquee-track" style={{ animationDuration: `${daws.length * 3.5}s` }}>
                <div className="st-marquee-group">
                  {daws.map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="st-marquee-group" aria-hidden="true">
                  {daws.map(d => <span key={d}>{d}</span>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem: the heading reveals word by word, the paragraph lights up as you scroll */}
        <section className="st-section st-problem">
          <div className="st-container st-problem-grid">
            <RevealText className="st-h2" text="A backup saves your files. It forgets how the session was built." />
            <ScrollWords
              className="st-big"
              text="Producers lose sessions to crashed drives, corrupted files and overwritten saves. Most tools copy the audio and stop there. SyncTrackr keeps the full story: what changed in each version, and which plugins, presets and chain order shaped each track."
            />
          </div>
        </section>

        {/* How it works: steps switch on as you scroll */}
        <section className="st-section st-container" id="how">
          <RevealText className="st-h2" text="Three steps, then it runs itself" />
          <Reveal as="p" className="st-lead" delay={0.15}>You stay in your DAW. SyncTrackr is where your versions live.</Reveal>
          <Steps />
        </section>

        {/* Features: mid-teal band. Tiles zoom in and glow under your cursor, the journey line fills as you scroll */}
        <section className="st-features" id="features">
          <div className="st-container">
            <RevealText className="st-h2" text="Everything a session needs" />
            <Reveal as="p" className="st-lead" delay={0.15}>Protect your work, and keep the story of how you made it.</Reveal>
            <div className="st-bento">
              {bigFeatures.map((f, i) => (
                <Reveal as="article" kind="zoom" key={f.title} className="st-feat" delay={i * 0.12} onMouseMove={tileSpot}>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <div className="st-mini" aria-hidden="true">
                    {f.rows && f.rows.map(([a, b], r) => (
                      <div key={a} className="st-mini-row" style={{ "--i": r }}><span>{a}</span><span>{b}</span></div>
                    ))}
                    {f.checks && f.checks.map((a, r) => (
                      <div key={a} className="st-mini-row" style={{ "--i": r }}><span><Tick />{a}</span></div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
            <Journey />
            <div className="st-small">
              {smallFeatures.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.08}>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Plugin Intelligence: the dark band wipes in, then the four facts slide in from the right */}
        <Wipe id="plugins" className="st-section st-pi">
          <div className="st-container st-pi-grid">
            <div>
              <RevealText className="st-h2" text="Plugin Intelligence" delay={0.5} />
              <p className="st-lead">
                Open any saved version and see exactly what was on each track and in what order.
                If you ever lose a session, you still have a map of how it was built.
              </p>
            </div>
            <div className="st-pi-facts">
              {pluginFacts.map((f, i) => (
                <Reveal key={f.label} kind="right" className="st-pi-fact" delay={0.7 + i * 0.12}>
                  <b>{f.label}</b><span>{f.text}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </Wipe>

        {/* Pricing: cards rise in and each price counts up */}
        <section className="st-section st-pricing" id="pricing">
          <div className="st-container">
            <RevealText className="st-h2" text="Start free, grow when you need to" />
            <Reveal as="p" className="st-lead" delay={0.15}>Plans are billed once a year.</Reveal>
            <div className="st-tiers">
              {tiers.map((t, i) => (
                <Reveal key={t.name} className="st-tier" delay={i * 0.1}>
                  <h3>{t.name}</h3>
                  <p className="st-price">
                    <CountUp prefix="$" to={t.amount} />
                    <small>{t.amount === 0 ? "" : " / year"}</small>
                  </p>
                  <p className="st-storage">{t.storage} of storage</p>
                  <ul>{t.points.map(p => <li key={p}>{p}</li>)}</ul>
                  <button className={t.primary ? "st-btn st-btn-primary" : "st-btn st-btn-outline"} onClick={onGetStarted}>
                    {t.cta}
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action, with a magnetic button */}
        <section className="st-closing">
          <div className="st-container">
            <RevealText className="st-h2" text="Your next version is worth keeping." />
            <Reveal delay={0.3}>
              <Magnetic>
                <button className="st-btn st-btn-primary" onClick={onGetStarted}>Create your free account</button>
              </Magnetic>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="st-footer">
        <div className="st-container st-footer-row">
          <Logo onClick={scrollTop} />
          <span>© {new Date().getFullYear()} SyncTrackr</span>
        </div>
      </footer>
    </div>
  )
}
