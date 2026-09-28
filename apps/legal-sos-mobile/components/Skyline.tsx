// Stylized Manama skyline silhouette — gold-lit windows on dark navy.
// Ported from mobile/screens.jsx <Skyline/> (Claude Design mobile bundle).

import { View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G } from "react-native-svg";

export default function Skyline({ height = 80 }: { height?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 110,
        opacity: 0.5,
        height,
      }}
    >
      <Svg
        viewBox="0 0 340 80"
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#172541" stopOpacity="0" />
            <Stop offset="100%" stopColor="#172541" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="50" width="340" height="30" fill="url(#sky-grad)" />
        <Path
          fill="#22325a"
          d="M0 70 L0 60 L18 60 L18 52 L32 52 L32 64 L46 64 L46 48 L60 48 L60 58 L76 58 L76 42 L82 42 L82 30 L88 30 L88 42 L94 42 L94 58 L106 58 L106 50 L120 50 L120 38 L132 38 L132 30 L138 22 L144 30 L144 50 L156 50 L156 56 L172 56 L172 28 L180 14 L188 28 L188 56 L200 56 L200 44 L214 44 L214 36 L228 36 L228 58 L242 58 L242 48 L256 48 L256 40 L268 40 L268 64 L284 64 L284 52 L298 52 L298 48 L312 48 L312 60 L326 60 L326 64 L340 64 L340 80 L0 80 Z"
        />
        <G fill="#e8c281" opacity="0.7">
          <Rect x="36" y="56" width="1.5" height="2" />
          <Rect x="40" y="56" width="1.5" height="2" />
          <Rect x="50" y="52" width="1.5" height="2" />
          <Rect x="84" y="34" width="1.5" height="2" />
          <Rect x="84" y="38" width="1.5" height="2" />
          <Rect x="124" y="42" width="1.5" height="2" />
          <Rect x="140" y="34" width="1.5" height="2" />
          <Rect x="180" y="22" width="1.5" height="2" />
          <Rect x="180" y="28" width="1.5" height="2" />
          <Rect x="180" y="34" width="1.5" height="2" />
          <Rect x="220" y="40" width="1.5" height="2" />
          <Rect x="232" y="42" width="1.5" height="2" />
          <Rect x="232" y="48" width="1.5" height="2" />
          <Rect x="262" y="46" width="1.5" height="2" />
          <Rect x="302" y="54" width="1.5" height="2" />
        </G>
      </Svg>
    </View>
  );
}
