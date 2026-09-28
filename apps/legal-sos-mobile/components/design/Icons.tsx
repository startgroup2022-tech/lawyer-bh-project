// Stroke-based SVG icons — ported from the Claude Design mobile
// bundle (mobile/screens.jsx `Ic`). Uses react-native-svg so the
// design's hand-tuned strokes render identically on iOS + Android.

import Svg, { Path, Circle, Rect } from "react-native-svg";

interface P {
  color?: string;
  size?: number;
}

const D = (p: P) => ({
  color: p.color ?? "#fff",
  size: p.size ?? 18,
});

export const Ic = {
  bell: (p: P = {}) => {
    const { color, size } = D(p);
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M6 16V10a6 6 0 0112 0v6l1.5 1.5h-15L6 16zM10 20a2 2 0 004 0"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  user: (p: P = {}) => {
    const { color, size } = D(p);
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.5} fill="none" />
        <Path
          d="M5 20c.8-3.5 3.7-5.5 7-5.5s6.2 2 7 5.5"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  back: (p: P = {}) => {
    const { color, size } = D(p);
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M14 6l-6 6 6 6"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  close: (p: P = {}) => {
    const { color, size } = D(p);
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M6 6l12 12M18 6l-12 12"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  phone: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 22 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M4 5c0 8 6 14 14 14l3-3-4.5-2-1.5 1.5C12 14 10 12 8.5 9l1.5-1.5L7.5 3 4 5z"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  mic: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 22 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Rect x={9} y={3} width={6} height={12} rx={3} stroke={color} strokeWidth={1.6} fill="none" />
        <Path
          d="M6 11a6 6 0 0012 0M12 17v4"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  micOff: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 22 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Rect x={9} y={3} width={6} height={12} rx={3} stroke={color} strokeWidth={1.6} fill="none" />
        <Path
          d="M6 11a6 6 0 0012 0M12 17v4M4 4l16 16"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  endCall: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 26 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M3 14c5-5 13-5 18 0l-2.5 2.5-3-1-1 1.5c-1.5-.7-3.5-.7-5 0l-1-1.5-3 1L3 14z"
          fill={color}
        />
      </Svg>
    );
  },
  shield: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 16 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  chat: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M4 12c0-4 3.5-7 8-7s8 3 8 7-3.5 7-8 7c-1.3 0-2.5-.3-3.5-.7L4 20l1-3.5C4.5 15.3 4 13.7 4 12z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  arrest: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={9} cy={13} r={2.5} stroke={color} strokeWidth={1.6} fill="none" />
        <Circle cx={15} cy={13} r={2.5} stroke={color} strokeWidth={1.6} fill="none" />
        <Path
          d="M3 13h3M11.5 13h1M18 13h3"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  search: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={10} cy={10} r={6} stroke={color} strokeWidth={1.6} fill="none" />
        <Path d="M15 15l5 5" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </Svg>
    );
  },
  ban: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.6} fill="none" />
        <Path d="M6 6l12 12" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </Svg>
    );
  },
  doc: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M6 3h9l4 4v14H6z"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M15 3v4h4M9 12h6M9 16h6"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  },
  evidence: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Rect x={4} y={4} width={16} height={16} rx={2} stroke={color} strokeWidth={1.6} fill="none" />
        <Path
          d="M8 12l3 3 5-7"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  home: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M4 11l8-7 8 7v9h-5v-6h-6v6H4v-9z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  list: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      </Svg>
    );
  },
  clock: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 18 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.5} fill="none" />
        <Path
          d="M12 7v5l3 2"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  check: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 18 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M5 12l4 4 10-10"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  share: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 18 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M12 4v12m0-12l-4 4m4-4l4 4M5 14v5h14v-5"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  chevron: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 14 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M9 6l6 6-6 6"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  edit: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 16 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M4 20h4l11-11-4-4L4 16v4z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  signOut: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 16 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M14 5h6v14h-6M10 8l-4 4 4 4M6 12h10"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
  alert: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 20 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M12 3L2 20h20L12 3z"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          fill="none"
        />
        <Path d="M12 9v5M12 17v.3" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>
    );
  },
  globe: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 16 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.5} fill="none" />
        <Path
          d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"
          stroke={color}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    );
  },
  car: (p: P = {}) => {
    const { color, size } = D({ ...p, size: p.size ?? 18 });
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M3 14h18l-2-5H5l-2 5zM3 14v4h3v-2h12v2h3v-4M7 18a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  },
};
