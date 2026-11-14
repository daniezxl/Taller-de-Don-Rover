// Genera los íconos PNG de la PWA a partir de un SVG (luna de Ixchel + Marte con anillo de 4 roles).
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

function iconSvg({ rounded = true, scale = 1 } = {}) {
  const s = scale;
  const t = (x) => 256 + (x - 256) * s; // escala alrededor del centro
  const r = (v) => v * s;
  const stars = [
    [92, 108, 5], [404, 92, 4], [430, 300, 3.5], [120, 420, 4], [372, 430, 3], [70, 260, 3], [300, 70, 3],
  ]
    .map(([x, y, rr]) => `<circle cx="${t(x)}" cy="${t(y)}" r="${r(rr)}" fill="#FFF4DC" opacity="0.9"/>`)
    .join('');
  const arc = (start, end, color) => {
    const cx = t(344), cy = t(318), rx = r(74), ry = r(26);
    const a0 = (start * Math.PI) / 180, a1 = (end * Math.PI) / 180;
    const x0 = cx + rx * Math.cos(a0), y0 = cy + ry * Math.sin(a0);
    const x1 = cx + rx * Math.cos(a1), y1 = cy + ry * Math.sin(a1);
    return `<path d="M${x0} ${y0} A${rx} ${ry} 0 0 1 ${x1} ${y1}" stroke="${color}" stroke-width="${r(13)}" stroke-linecap="round" fill="none"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="30%" cy="22%" r="95%">
      <stop offset="0" stop-color="#3A3FB0"/><stop offset="0.5" stop-color="#171C66"/><stop offset="1" stop-color="#090C30"/>
    </radialGradient>
    <linearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFBEF"/><stop offset="1" stop-color="#FFD596"/>
    </linearGradient>
    <radialGradient id="mars" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#FFB27A"/><stop offset="0.6" stop-color="#E86A3A"/><stop offset="1" stop-color="#A83A1C"/>
    </radialGradient>
    <mask id="cres">
      <rect width="512" height="512" fill="#fff"/>
      <circle cx="${t(318)}" cy="${t(196)}" r="${r(150)}" fill="#000"/>
    </mask>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="116"' : ''} fill="url(#bg)"/>
  ${stars}
  <circle cx="${t(232)}" cy="${t(262)}" r="${r(176)}" fill="url(#moon)" mask="url(#cres)"/>
  <circle cx="${t(150)}" cy="${t(330)}" r="${r(16)}" fill="#F2C98A" opacity="0.7"/>
  <circle cx="${t(112)}" cy="${t(250)}" r="${r(10)}" fill="#F2C98A" opacity="0.6"/>
  ${arc(180, 360, '#3CC8FF')}${arc(0, 180, '#FFC93C')}
  <circle cx="${t(344)}" cy="${t(318)}" r="${r(52)}" fill="url(#mars)"/>
  <circle cx="${t(326)}" cy="${t(300)}" r="${r(9)}" fill="#C4502A" opacity="0.6"/>
  <circle cx="${t(362)}" cy="${t(336)}" r="${r(6)}" fill="#C4502A" opacity="0.5"/>
  ${arc(10, 85, '#55DB7A')}${arc(95, 170, '#FF6B5B')}
</svg>`;
}

function render(svg, size, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(new URL(file, OUT), png);
  console.log('✓', file, size + 'px');
}

render(iconSvg(), 192, 'icon-192.png');
render(iconSvg(), 512, 'icon-512.png');
render(iconSvg({ rounded: false, scale: 0.78 }), 512, 'icon-maskable-512.png');
render(iconSvg({ rounded: false }), 180, 'apple-touch-icon.png');
writeFileSync(new URL('favicon.svg', OUT), iconSvg());
console.log('✓ favicon.svg');
