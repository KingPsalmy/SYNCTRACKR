import { c } from "./theme"

// ── The logo: a cloud outline with a check mark ──
// "currentColor" means the cloud takes whatever text colour we give the logo,
// so the same component works on a white page (teal) and on a dark panel (white).
// Pass onClick to make it a link (it goes "home"). Without onClick it is plain, non-clickable text.
export function Logo({ color = c.teal, size = 28, onClick }) {
  const Tag = onClick ? "a" : "span"
  const linkProps = onClick
    ? { href: "/", onClick: e => { e.preventDefault(); onClick() }, "aria-label": "SyncTrackr home" }
    : {}
  return (
    <Tag className={onClick ? "sy-logo sy-logo-link" : "sy-logo"} style={{ color }} {...linkProps}>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M8.5 21a5.5 5.5 0 0 1-.6-10.97A7 7 0 0 1 21.4 11.6 4.7 4.7 0 0 1 20.5 21H8.5Z"
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="m10.5 15.5 2.6 2.6 5-5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      SyncTrackr
    </Tag>
  )
}
