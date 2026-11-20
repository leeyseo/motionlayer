export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const standard = 'cubic-bezier(.4,0,.2,1)';
const closings = new WeakMap();
const enhanced = new WeakSet();

export function openLayer(dialog) {
  document.querySelectorAll('dialog[open]').forEach(other => {
    if (other !== dialog) {
      if (closings.has(other)) clearTimeout(closings.get(other));
      closings.delete(other); other.classList.remove('is-closing'); other.close();
    }
  });
  if (closings.has(dialog)) clearTimeout(closings.get(dialog));
  closings.delete(dialog); dialog.classList.remove('is-closing');
  if (dialog.id === 'mobile-menu') dialog.hidden = false;
  if (!dialog.open) dialog.showModal();
}

export function closeLayer(dialog) {
  if (!dialog?.open || closings.has(dialog)) return;
  dialog.classList.add('is-closing');
  const timer = setTimeout(() => {
    closings.delete(dialog); dialog.classList.remove('is-closing'); dialog.close();
  }, reducedMotion.matches ? 0 : 300);
  closings.set(dialog, timer);
}

export function enhanceImages(root = document) {
  root.querySelectorAll('.product-image > .product-front,.series-visual img:not(.saga-placeholder),.saga-collage-window img:not(.saga-placeholder),.detail-visual img:not(.saga-placeholder)').forEach(img => {
    if (enhanced.has(img)) return;
    enhanced.add(img);
    const parent = img.parentElement;
    if (reducedMotion.matches) { parent.classList.add('image-ready'); return; }
    const placeholder = img.cloneNode(false);
    placeholder.className = 'saga-placeholder'; placeholder.alt = '';
    placeholder.setAttribute('aria-hidden', 'true'); placeholder.removeAttribute('fetchpriority');
    placeholder.removeAttribute('loading');
    parent.classList.add('saga-image-loader'); parent.append(placeholder);
    const ready = () => setTimeout(() => parent.classList.add('image-ready'), 50);
    if (img.complete) ready(); else img.addEventListener('load', ready, { once: true });
    img.addEventListener('error', () => parent.classList.add('image-ready'), { once: true });
  });
}

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeLayer(dialog); });
  dialog.addEventListener('close', () => {
    if (closings.has(dialog)) clearTimeout(closings.get(dialog));
    closings.delete(dialog); dialog.classList.remove('is-closing');
    if (dialog.id === 'mobile-menu') {
      dialog.hidden = true;
      document.getElementById('mobile-menu-trigger').setAttribute('aria-expanded', 'false');
    }
  });
});

const video = document.getElementById('saga-film');
const playButton = document.getElementById('saga-film-play');
const previewButton = document.getElementById('saga-preview-toggle');
let visible = false, watching = false, previewPaused = false;
function updateVideo() {
  if (visible && !document.hidden && (watching || (!previewPaused && !reducedMotion.matches))) {
    video.play().catch(() => { previewButton.textContent = 'Play preview'; });
  } else video.pause();
}
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateVideo(); }).observe(video);
playButton.addEventListener('click', () => {
  watching = true; video.currentTime = 0; video.muted = false; video.controls = true;
  playButton.hidden = true; previewButton.hidden = true; video.play().catch(() => {});
});
previewButton.addEventListener('click', () => {
  previewPaused = !video.paused;
  if (!previewPaused && reducedMotion.matches) watching = true;
  updateVideo();
});
video.addEventListener('play', () => { previewButton.textContent = 'Pause preview'; });
video.addEventListener('pause', () => { previewButton.textContent = 'Play preview'; });
document.addEventListener('visibilitychange', updateVideo);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && !video.controls) { watching = false; video.pause(); }
  updateVideo();
  if (reducedMotion.matches) document.querySelectorAll('.saga-image-loader').forEach(e => e.classList.add('image-ready'));
});

enhanceImages();
// Public constants help the local browser audit report the chosen motion token.
document.documentElement.style.setProperty('--saga-ease', standard);
