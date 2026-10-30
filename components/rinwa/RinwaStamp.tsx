"use client";

import { useId } from "react";

// ─── RÌNWÁ "Came Home" seal ────────────────────────────────────────────────────
// The circular ÌLÉ WA BY RÌNWÁ / CAME HOME seal, drawn in SVG around the leaf
// mark so it stays crisp at any size and can be inked in any colour: an SVG
// filter recolours everything (the leaf PNG included) to the ink. With `worn`
// it also knocks small specks out and wobbles the edges — the texture of a
// real rubber stamp.

export function RinwaStamp({
  size = 240, color = "#0f6e6a", worn = false, className, style,
}: {
  size?: number; color?: string; worn?: boolean;
  className?: string; style?: React.CSSProperties;
}) {
  // useId can contain characters that break url(#…) references.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const top = `stamp-top-${uid}`;
  const bottom = `stamp-bottom-${uid}`;
  const ink = `stamp-ink-${uid}`;

  return (
    <svg
      width={size} height={size} viewBox="0 0 400 400"
      className={className} style={style}
      role="img" aria-label="ÌLÉ WA by RÌNWÁ, Came Home"
    >
      <defs>
        {/* Top text runs clockwise over the top; bottom text runs left to right under the bottom so it reads upright. */}
        <path id={top} d="M 50 200 A 150 150 0 0 1 350 200" fill="none" />
        <path id={bottom} d="M 26 200 A 174 174 0 0 0 374 200" fill="none" />
        <filter id={ink} x="-5%" y="-5%" width="110%" height="110%">
          <feFlood floodColor={color} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="tinted" />
          {worn && (
            <>
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.25" result="speckle" />
              <feComposite in="tinted" in2="speckle" operator="in" result="worn" />
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="warp" />
              <feDisplacementMap in="worn" in2="warp" scale="4" xChannelSelector="R" yChannelSelector="G" />
            </>
          )}
        </filter>
      </defs>

      <g filter={`url(#${ink})`} fill={color} stroke={color}>
        <circle cx="200" cy="200" r="190" fill="none" strokeWidth="14" />
        <circle cx="200" cy="200" r="138" fill="none" strokeWidth="6" />

        <text
          fontSize="30" fontWeight="500" letterSpacing="5" stroke="none"
          style={{ fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}
        >
          <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">ÌLÉ WA BY RÌNWÁ</textPath>
        </text>
        <text
          fontSize="30" fontWeight="500" letterSpacing="20" stroke="none"
          style={{ fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}
        >
          <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">CAME HOME</textPath>
        </text>

        <circle cx="38" cy="200" r="7" stroke="none" />
        <circle cx="362" cy="200" r="7" stroke="none" />

        {/* The leaf mark — the filter re-inks it to match the ring. */}
        <image href="/images/logo-home.png" x="110" y="117" width="180" height="166" preserveAspectRatio="xMidYMid meet" />
      </g>
    </svg>
  );
}
