// Independent implementation of the live Cascade preset's observed timings.
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const items = new Set();
const active = new Set();
let scheduled = false;

function reveal(item) {
  if (item.classList.contains('is-revealed')) return;
  item.classList.add('is-revealed');
  const delay = innerWidth > 760 ? Number(item.dataset.delay || 0) : 0;
  setTimeout(() => item.classList.add('reveal-complete'), reducedMotion.matches ? 0 : 500 + delay);
  reveals.unobserve(item);
}

const reveals = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
}, { rootMargin: '0px 0px -20% 0px' });

const visibility = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? active.add(entry.target) : active.delete(entry.target));
  schedule();
}, { rootMargin: '0px 0px 20% 0px' });

function update() {
  scheduled = false;
  const writes = [];
  active.forEach(item => {
    if (!item.isConnected) { active.delete(item); items.delete(item); return; }
    const drift = item.querySelector('[data-parallax]');
    if (!drift) return;
    const rect = item.getBoundingClientRect();
    const progress = (innerHeight - rect.top) / (innerHeight + rect.height) - .5;
    const y = reducedMotion.matches ? 0 : -.555 * Number(item.dataset.speed || 1) * progress * 100;
    writes.push([drift, y]);
  });
  writes.forEach(([node, y]) => { node.style.transform = `translateY(${y.toFixed(2)}px)`; });
}

function schedule() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
}

export function registerMotion(root = document) {
  items.forEach(item => {
    if (!item.isConnected) { reveals.unobserve(item); visibility.unobserve(item); active.delete(item); items.delete(item); }
  });
  root.querySelectorAll('[data-motion]').forEach(item => {
    if (items.has(item)) return;
    items.add(item);
    item.classList.add('motion-ready');
    item.style.setProperty('--reveal-delay', `${item.dataset.delay || 0}ms`);
    if (reducedMotion.matches) reveal(item); else reveals.observe(item);
    visibility.observe(item);
  });
  schedule();
}

addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule, { passive: true });
document.addEventListener('focusin', event => {
  const item = event.target.closest('[data-motion]');
  if (item) reveal(item);
});
reducedMotion.addEventListener('change', () => {
  items.forEach(item => {
    if (reducedMotion.matches) reveal(item);
    const drift = item.querySelector('[data-parallax]');
    if (drift && reducedMotion.matches) drift.style.transform = 'none';
  });
  schedule();
});
