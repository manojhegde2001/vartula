import { infoOgImage, ogSize } from "@/lib/og";

export const alt = "Privacy Policy · Vartula";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return infoOgImage("/privacy");
}
