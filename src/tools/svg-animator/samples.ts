/** Built-in sample SVGs. The first one is loaded when the editor opens. */
export interface SvgSample {
  id: string;
  name: string;
  markup: string;
}

export const samples: SvgSample[] = [
  {
    id: "rocket",
    name: "Rocket",
    markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M100 20c28 22 40 58 32 104H68c-8-46 4-82 32-104z" fill="#ede9fe"/>
  <circle cx="100" cy="78" r="16" fill="#c4b5fd"/>
  <path d="M68 124l-24 30 30-6M132 124l24 30-30-6" fill="#ddd6fe"/>
  <path d="M86 136c0 20 6 34 14 44 8-10 14-24 14-44" fill="#fde68a" stroke="#f59e0b"/>
  <line x1="40" y1="60" x2="52" y2="60" stroke="#94a3b8"/>
  <line x1="148" y1="40" x2="162" y2="40" stroke="#94a3b8"/>
  <line x1="150" y1="96" x2="166" y2="96" stroke="#94a3b8"/>
</svg>`,
  },
  {
    id: "signature",
    name: "Signature",
    markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 80c10-40 30-60 40-50s-10 50-20 60 30-40 50-40-10 40 0 40 20-30 30-30-5 30 5 30 25-40 35-40"/>
  <path d="M190 40c-10 30-12 50-6 50s20-40 30-40-8 40 2 40 14-20 24-20 0 20 10 20 20-30 34-30"/>
  <path d="M30 100c80-8 180-10 270-4"/>
</svg>`,
  },
  {
    id: "icons",
    name: "Icon set",
    markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="none" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="15" width="50" height="50" rx="10" fill="#e0f2fe"/>
  <polyline points="22,42 32,52 50,30"/>
  <circle cx="120" cy="40" r="26" fill="#e0f2fe"/>
  <polyline points="120,24 120,40 132,48"/>
  <polygon points="200,12 208,32 230,33 213,47 219,68 200,56 181,68 187,47 170,33 192,32" fill="#fef9c3" stroke="#eab308"/>
</svg>`,
  },
  {
    id: "heart",
    name: "Heart",
    markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" fill="none" stroke="#e11d48" stroke-width="4" stroke-linejoin="round">
  <path d="M60 100S10 68 10 36A24 24 0 0 1 60 26a24 24 0 0 1 50 10c0 32-50 64-50 64z" fill="#ffe4e6"/>
  <ellipse cx="40" cy="38" rx="8" ry="5" stroke="#fda4af" stroke-width="3" transform="rotate(-30 40 38)"/>
</svg>`,
  },
];

export const defaultSample = samples[0];
