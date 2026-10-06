import { infoOgImage, ogSize } from "@/lib/og";

export const alt = "Terms of Use · Vartula";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return infoOgImage("/terms");
}
