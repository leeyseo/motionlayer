import { products } from './products.js';
import { reducedMotion } from './motion.js';

function initCarousel(root) {
  const viewport = root.querySelector('.carousel-viewport');
  const track = root.querySelector('[data-carousel-track]');
  const pagination = root.querySelector('[data-carousel-pagination]');
  const order = root.dataset.order?.split(',').map(Number);
  const pieces = order ? order.map(i => products[i]) : products;
  let index = 0, start = null, dragged = false;
  const perMove = () => innerWidth >= 990 ? 2 : 1;
  track.innerHTML = pieces.map(p => `<article class="carousel-piece"><button class="carousel-photo" type="button" data-product="${p.id}" aria-label="${p.ko} 보기"><img src="assets/${p.id}.webp" alt="${p.ko}" width="750" height="1125" loading="lazy"><img class="carousel-secondary" src="assets/${p.id}-back.webp" alt="" width="750" height="1125" loading="lazy" aria-hidden="true">${p.soldout ? '<span class="product-flag">SOLD OUT</span>' : ''}</button><button class="carousel-name" type="button" data-product="${p.id}">${p.name}</button><span class="carousel-price">₩${p.price.toLocaleString('ko-KR')}</span></article>`).join('');

  function offset() {
    return Math.min(track.children[index].offsetLeft, track.scrollWidth - viewport.clientWidth);
  }
  function go(next, { wrap = true } = {}) {
    const last = Math.floor((pieces.length - 1) / perMove()) * perMove();
    index = wrap ? next > last ? 0 : next < 0 ? last : next : Math.max(0, Math.min(last, next));
    track.style.transform = `translateX(${-offset()}px)`;
    root.querySelector('[data-carousel-status]').textContent = `${index + 1}–${Math.min(index + perMove(), pieces.length)} / ${pieces.length}`;
    pagination.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === Math.floor(index / perMove()))));
    // Slides outside the viewport remain readable as a set; their controls enter
    // the tab order only when they are visible.
    const left = offset(), right = left + viewport.clientWidth;
    [...track.children].forEach(card => card.querySelectorAll('button').forEach(button => {
      button.tabIndex = card.offsetLeft >= left - 1 && card.offsetLeft + card.offsetWidth <= right + 1 ? 0 : -1;
    }));
  }
  function layout() {
    index = Math.floor(index / perMove()) * perMove();
    pagination.innerHTML = Array.from({ length: Math.ceil(pieces.length / perMove()) }, (_, i) => `<button type="button" aria-label="추천 상품 ${i + 1} 페이지" aria-pressed="false" data-page="${i}"></button>`).join('');
    go(index);
  }
  root.querySelector('[data-carousel-next]').addEventListener('click', () => go(index + perMove()));
  root.querySelector('[data-carousel-prev]').addEventListener('click', () => go(index - perMove()));
  pagination.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) go(Number(b.dataset.page) * perMove()); });
  viewport.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); go(index + (e.key === 'ArrowRight' ? 1 : -1) * perMove()); } });
  viewport.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; dragged = false; });
  viewport.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      dragged = true; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging');
      const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
      let position = -offset() + dx;
      if (position > 0) position *= .5;
      if (position < -max) position = -max + (position + max) * .5;
      track.style.transform = `translateX(${position}px)`;
    }
  });
  viewport.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x; viewport.classList.remove('is-dragging');
    if (dragged) go(index + (Math.abs(dx) > 45 ? dx < 0 ? perMove() : -perMove() : 0), { wrap: false });
    start = null;
  });
  viewport.addEventListener('pointercancel', () => { start = null; viewport.classList.remove('is-dragging'); go(index); });
  viewport.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopImmediatePropagation(); dragged = false; } }, true);
  new ResizeObserver(layout).observe(viewport);
  document.fonts.ready.then(layout);
}
document.querySelectorAll('[data-carousel]').forEach(initCarousel);

const marquee = document.getElementById('marquee-track');
function sizeMarquee() {
  if (reducedMotion.matches) return;
  const text = 'Made to move. Made for your everyday.';
  const groups = [...marquee.children];
  groups.forEach(g => { g.innerHTML = `<span>${text}</span>`; });
  const width = groups[0].scrollWidth;
  const count = Math.max(1, Math.ceil(innerWidth / Math.max(width, 1)));
  groups.forEach(g => { g.innerHTML = Array.from({ length: count }, () => `<span>${text}</span>`).join(''); });
  marquee.style.setProperty('--marquee-duration', `${19 * marquee.scrollWidth / 1024}s`);
}

const video = document.getElementById('lookbook-film');
const toggle = document.getElementById('film-toggle');
video.muted = true;
let inView = false, manualPause = false, manualPlay = false;
function videoState() {
  const play = inView && !document.hidden && !manualPause && (!reducedMotion.matches || manualPlay);
  if (play) video.play().catch(() => { toggle.textContent = 'Play film'; }); else video.pause();
}
video.addEventListener('play', () => { toggle.textContent = 'Pause film'; toggle.setAttribute('aria-label', '영상 일시정지'); });
video.addEventListener('pause', () => { toggle.textContent = 'Play film'; toggle.setAttribute('aria-label', '영상 재생'); });
toggle.addEventListener('click', () => { manualPause = !video.paused; manualPlay = !manualPause; videoState(); });
new IntersectionObserver(entries => { inView = entries[0].isIntersecting; videoState(); }).observe(video);
document.addEventListener('visibilitychange', videoState);
reducedMotion.addEventListener('change', () => { manualPlay = false; videoState(); sizeMarquee(); });
new ResizeObserver(sizeMarquee).observe(marquee.parentElement);
document.fonts.ready.then(sizeMarquee);
