import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the logo mark on the brand gradient used by the OG cards. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="#fafafa" strokeWidth="2" />
          <path d="M7 8l5 9 5-9" fill="none" stroke="#fafafa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
