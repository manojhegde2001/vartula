import { infoOgImage, ogSize } from "@/lib/og";

export const alt = "Contact · Vartula";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return infoOgImage("/contact");
}
