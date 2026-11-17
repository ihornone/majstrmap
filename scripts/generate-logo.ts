import fs from 'node:fs';

const content = fs.readFileSync('src/client/components/shadcnmaps/map-data/ukraine.ts', 'utf8');
const start = content.indexOf('regions: [');
const end = content.lastIndexOf('],');
const jsonStr = content.slice(start + 'regions: '.length, end + 1);
const regions = JSON.parse(jsonStr);

// Heatmap colors directly from site palette
const regionFills: Record<string, string> = {
  'kyiv-city': '#0ea5e9',      // Top activity (#0ea5e9)
  'kyiv': '#0ea5e9',
  'lviv': '#38bdf8',           // High activity (#38bdf8)
  'dnipropetrovsk': '#38bdf8',
  'odessa': '#38bdf8',
  'kharkiv': '#7dd3fc',        // Medium-high (#7dd3fc)
  'cherkasy': '#0ea5e9',       // Active
  'zaporizhia': '#7dd3fc',
  'poltava': '#bae6fd',        // Medium (#bae6fd)
  'vinnytsia': '#7dd3fc',
  'ivano-frankivsk': '#bae6fd',
  'khmelnytskyi': '#bae6fd',
  'zhytomyr': '#e0f2fe',       // Light (#e0f2fe)
  'volyn': '#e0f2fe',
  'rivne': '#bae6fd',
  'ternopil': '#bae6fd',
  'chernivtsi': '#e0f2fe',
  'zakarpattia': '#bae6fd',
  'mykolaiv': '#7dd3fc',
  'kherson': '#e0f2fe',
  'chernihiv': '#e0f2fe',
  'sumy': '#e0f2fe',
  'kirovohrad': '#bae6fd',
  'donetsk': '#e0f2fe',
  'luhansk': '#e2e8f0',        // Base (#e2e8f0)
  'crimea': '#e2e8f0',
  'sevastopol': '#e0f2fe',
};

let mapPaths = '';
regions.forEach((r: any) => {
  const fill = regionFills[r.id] || '#bae6fd';
  // Stroke matching site map: #64748b/50 stroke-width 1.2
  mapPaths += `    <path id="${r.id}" d="${r.path}" fill="${fill}" stroke="#64748b" stroke-opacity="0.45" stroke-width="1.2" stroke-linejoin="round"/>\n`;
});

// Real Ukraine vector bounding box:
// width: 631.61, height: 416.78, cx: 296.035, cy: 198.89
//
// Avatar circular safe zone optimization:
// Scale: 1.22 (width = 770px, fits comfortably in circle)
// Map center: (512, 455)
// tx = 512 - 296.035 * 1.22 = 150.8
// ty = 455 - 198.89 * 1.22 = 212.3
// Map bottom (Crimea): 455 + (416.78 * 1.22) / 2 = 709px.
//
// Text: lifted up so it completely fits inside circular crops (Telegram, Threads, Instagram)
// Baseline at y = 745. Font size = 148px.
// Text cap height ~ 105px (from 640 to 745, descender down to 780).
// Text overlaps map from 640 to 709 (~69px ON map, ~71px below map -> perfectly halved!).
// At y = 780, the circular safe width is 870px, which leaves plenty of safety room on sides!

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Crisp shadow & halo so text is 100% readable where it overlaps the map paths -->
    <filter id="cleanHalo" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#f8fafc" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#f8fafc" flood-opacity="0.85"/>
    </filter>
  </defs>

  <!-- 1. Pure site background (#f8fafc) -->
  <rect width="1024" height="1024" fill="#f8fafc"/>

  <!-- 2. Ukraine Map: Balanced to guarantee 100% circle-safe avatar cropping -->
  <g transform="translate(150.8, 212.3) scale(1.22)">
${mapPaths}
  </g>

  <!-- 3. Big site-branded text with friendly rounded font (Nunito): Lifted into circle safe zone -->
  <g filter="url(#cleanHalo)">
    <text x="512" y="745" text-anchor="middle" font-family="'Nunito', 'Comfortaa', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="148" font-weight="800" letter-spacing="-0.025em">
      <tspan fill="#0f172a">Master</tspan><tspan fill="#0ea5e9">Map</tspan>
    </text>
  </g>
</svg>
`;

fs.writeFileSync('public/mastermap-logo.svg', svgContent, 'utf8');
console.log('Regenerated public/mastermap-logo.svg with circle-safe text placement');
