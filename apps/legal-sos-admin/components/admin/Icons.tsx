// Inline SVG icon set — stroke-based, 16×16 base box.
// Ported from the legalsos design bundle (admin/components.jsx `I`).

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export const I = {
  dashboard: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  cases: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 5h12v9H2z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  lawyers: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 13.5c.6-2.4 2.6-4 5-4s4.4 1.6 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  money: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7h12M6 10h.5M9 10h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  settings: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  search: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  bell: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M4 11V7a4 4 0 018 0v4l1 1H3l1-1zM6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  filter: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 3h12l-4.5 6v4l-3 1.5V9L2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  plus: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  download: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  chevron: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrow: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  phone: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 4c0 5 4 9 9 9l1.5-2-3-1.5-1 1c-1.5-1-2.5-2-3.5-3.5l1-1L5.5 3 3 4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  pin: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M8 14s5-4.5 5-8a5 5 0 10-10 0c0 3.5 5 8 5 8z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  alert: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6v3M8 11.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  refund: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 8a5 5 0 109-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 3v2.5h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  doc: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M4 2h6l3 3v9H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  reassign: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 6l3-3 3 3M13 10l-3 3-3-3M6 3v10M10 3v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ring: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  ),
  signout: (p: P) => (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M9.5 2.5h-5a1 1 0 00-1 1v9a1 1 0 001 1h5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M7.5 8h6.5m0 0l-2-2m2 2l-2 2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export type IconKey = keyof typeof I;
