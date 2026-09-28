import { ImageResponse } from "next/og";

export const alt = "Lawyers.bh — Legal Services in Bahrain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg,#071f42,#9f1d1d)", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 82, fontWeight: 800 }}>Lawyers.bh</div>
      <div style={{ marginTop: 24, fontSize: 38 }}>Legal Services in Bahrain</div>
      <div style={{ marginTop: 14, fontSize: 34 }}>Arabic &amp; English Legal Support</div>
    </div>,
    size,
  );
}
