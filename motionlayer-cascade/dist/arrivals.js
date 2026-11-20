import { arrivalProducts } from './products.js';
import { registerMotion } from './motion.js';

const section = document.getElementById('latest-arrivals');
const canvas = document.getElementById('arrivals-canvas');
const sizes = [4/12,9/12,5/12,7/12,10/12,4/12,9/12,5/12];
const speeds = [1,-3,2,-2,-2,3,-3,2];
const alignment = [0,.5,1,.5,0,.5,1,.5];
canvas.innerHTML = arrivalProducts.map((p, i) => `<article class="arrival-card" data-motion data-speed="${speeds[i]}" data-delay="${i % 2 ? 300 : 0}" data-arrival="${p.id}"><div data-parallax><button type="button" class="arrival-photo" data-product="${p.id}" data-scale-reveal aria-label="${p.ko} 상세 보기"><img class="arrival-primary" src="assets/${p.id}.webp" alt="${p.ko} 착용 이미지" width="750" height="1125" loading="lazy"><img class="arrival-secondary" src="assets/${p.id}-back.webp" alt="" width="750" height="1125" loading="lazy" aria-hidden="true">${p.soldout ? '<span class="product-flag">SOLD OUT</span>' : ''}</button><div class="arrival-caption"><button type="button" class="arrival-name" data-product="${p.id}">${p.name}</button><p>₩${p.price.toLocaleString('ko-KR')}</p></div></div></article>`).join('');

const cards = [...canvas.children];
let scheduled = false;
function layout() {
  scheduled = false;
  const mobile = innerWidth < 768;
  const width = canvas.clientWidth;
  if (!width) return;
  const styles = getComputedStyle(section);
  const gap = parseFloat(styles.getPropertyValue('--arrival-spacing'));
  const gutter = parseFloat(styles.getPropertyValue('--arrival-gutter'));
  const column = (width - gutter) / 2;
  const widths = cards.map((_, i) => mobile ? width * 5/6 : column * sizes[i]);
  cards.forEach((card, i) => { card.style.width = `${widths[i].toFixed(2)}px`; });
  const heights = cards.map(card => card.offsetHeight);
  const tops = mobile ? [0] : [0, gap];
  cards.forEach((card, i) => {
    const side = mobile ? 0 : i % 2;
    const x = mobile ? i % 2 ? width - widths[i] : 0 : side * (column + gutter) + (column - widths[i]) * alignment[i];
    card.style.left = `${x.toFixed(2)}px`;
    card.style.top = `${tops[side].toFixed(2)}px`;
    tops[side] += heights[i] + gap;
  });
  canvas.style.height = `${Math.ceil(Math.max(...tops) - gap)}px`;
  registerMotion(canvas);
}
function schedule() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(layout); }
}
const observer = new ResizeObserver(schedule);
observer.observe(canvas);
cards.forEach(card => observer.observe(card));
addEventListener('resize', schedule, { passive: true });
document.fonts.ready.then(schedule);
layout();
