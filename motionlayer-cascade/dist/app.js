import { products, catalog } from './products.js';
import { registerMotion, reducedMotion } from './motion.js';

const $ = id => document.getElementById(id);
const price = value => '₩' + value.toLocaleString('ko-KR');
const state = { category: 'all', color: '', mood: '', view: 'gallery', sort: 'featured' };
const moodLabels = { light: '가볍게', calm: '차분하게', free: '자유롭게' };
const categories = { all: 'All pieces', dresses: 'Dresses', tops: 'Tops', layers: 'Layers' };
const colors = { blue: 'Blue', green: 'Green', navy: 'Navy', brown: 'Brown' };
const bag = [];
let selectedProduct, galleryIndex = 0, selectedSize = '', toastTimer, searchTimer;
const closing = new WeakMap();
const image = (p, back = false) => `assets/${p.id}${back ? '-back' : ''}.webp`;
const mobileViewport = matchMedia('(max-width:767px)');
function syncMobileCatalog() {
  document.body.classList.toggle('catalog-open', mobileViewport.matches && location.hash === '#collection');
  $('bag-link').textContent = `${mobileViewport.matches ? 'Cart' : 'Bag'} (${bag.reduce((n, p) => n + p.qty, 0)})`;
}
const scrollTo = node => {
  if (mobileViewport.matches) {
    document.body.classList.toggle('catalog-open', node.id === 'collection');
    history.replaceState(null, '', node.id ? `#${node.id}` : location.pathname);
  }
  node.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
};
addEventListener('hashchange', syncMobileCatalog);
mobileViewport.addEventListener('change', syncMobileCatalog);
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor || !mobileViewport.matches || anchor.hasAttribute('data-drawer-anchor') || anchor.hasAttribute('data-nav-category')) return;
  document.body.classList.toggle('catalog-open', anchor.getAttribute('href') === '#collection');
}, true);
syncMobileCatalog();

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
}

function openLayer(dialog) {
  dialog.classList.remove('is-closing');
  if (!dialog.open) dialog.showModal();
}

function closeLayer(dialog) {
  if (!dialog.open) return Promise.resolve();
  if (closing.has(dialog)) return closing.get(dialog);
  dialog.classList.add('is-closing');
  if (dialog.id === 'drawer') clearTimeout(searchTimer);
  const duration = reducedMotion.matches ? 0 : dialog.classList.contains('lightbox') ? 600 : 500;
  const promise = new Promise(resolve => setTimeout(() => {
    dialog.close(); dialog.classList.remove('is-closing'); closing.delete(dialog);
    if (dialog.id === 'drawer') {
      $('menu-toggle').setAttribute('aria-expanded', 'false');
      $('shop-link').setAttribute('aria-expanded', 'false');
    }
    resolve();
  }, duration));
  closing.set(dialog, promise);
  return promise;
}

function render() {
  const list = products.filter(p => (state.category === 'all' || p.category === state.category) && (!state.color || p.color === state.color) && (!state.mood || p.mood.includes(state.mood)));
  if (state.sort === 'price-low') list.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-high') list.sort((a, b) => b.price - a.price);
  $('product-grid').classList.toggle('index-view', state.view === 'index');
  $('product-grid').innerHTML = list.map((p, index) => state.view === 'gallery' ? `
    <article class="product-card" data-motion data-speed="${[1, 2, -2, 1, -1, 2][index % 6]}" data-delay="${index % 2 ? 300 : 0}">
      <div data-parallax>
        <button class="product-photo" type="button" data-product="${p.id}" data-scale-reveal aria-label="${p.ko} 상세 보기">
          <img class="product-primary" src="${image(p)}" alt="${p.ko} 착용 이미지" width="750" height="1125" loading="lazy">
          <img class="product-secondary" src="${image(p, true)}" alt="" width="750" height="1125" loading="lazy" aria-hidden="true">
          ${p.soldout ? '<span class="product-flag">SOLD OUT</span>' : ''}
        </button>
        <div class="product-details"><span class="product-no">${p.number}</span><div><button type="button" class="product-name" data-product="${p.id}">${p.name}</button><span class="product-color">${p.colorName}</span><p class="product-price">${price(p.price)}</p></div><button type="button" class="product-more" data-product="${p.id}" aria-label="${p.name} 보기">+</button></div>
      </div>
    </article>` : `<article class="index-row"><span class="product-no">${p.number}</span><button type="button" data-product="${p.id}" aria-label="${p.ko} 보기"><img src="${image(p)}" alt="${p.ko}" width="60" height="80"></button><button class="product-name" type="button" data-product="${p.id}">${p.name}</button><span class="product-color">${p.colorName}</span><span class="product-price">${price(p.price)}</span><button class="product-more" type="button" data-product="${p.id}" aria-label="${p.name} 보기">+</button></article>`).join('') || '<p class="empty-state">선택한 조건에 맞는 상품이 없어요.</p>';
  $('product-count').textContent = String(list.length).padStart(2, '0');
  $('filter-status').textContent = `${list.length}개의 상품이 표시됩니다.`;
  $('showing-count').textContent = state.category === 'all' && !state.color && !state.mood ? 'SIX PIECES, ENDLESS POSSIBILITIES.' : `SHOWING ${String(list.length).padStart(2, '0')} OF 06`;
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === state.category)));
  document.querySelectorAll('[data-mood]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mood === state.mood)));
  $('grid-view').setAttribute('aria-pressed', String(state.view === 'gallery'));
  $('index-view').setAttribute('aria-pressed', String(state.view === 'index'));
  $('active-mood').hidden = !state.mood;
  $('active-mood').innerHTML = state.mood ? `오늘은 ${moodLabels[state.mood]}<button type="button" id="clear-mood">선택 해제</button>` : '';
  registerMotion($('product-grid'));
}

async function drawer(type) {
  if (closing.has($('drawer'))) await closing.get($('drawer'));
  $('drawer').dataset.side = type === 'shop' || type === 'filter' ? 'left' : 'right';
  $('drawer').dataset.panel = type;
  let content = '';
  if (type === 'shop') {
    content = `<p class="eyebrow" id="drawer-title">MOTION LAYER / SHOP</p><nav class="drawer-nav" aria-label="컬렉션 메뉴"><a class="desktop-shop-all" href="#collection" data-nav-category="all">Shop all</a><button type="button" class="menu-accordion" aria-expanded="false" aria-controls="drawer-categories">${mobileViewport.matches ? 'Shop' : 'The collection'}<span class="chevron" aria-hidden="true"></span></button><div class="menu-collapse" id="drawer-categories" hidden><div><a href="#latest-arrivals" data-drawer-anchor>Latest Arrivals</a><a href="#collection" data-nav-category="all">Shop all</a>${Object.entries(categories).filter(([key]) => key !== 'all').map(([key, label]) => `<a href="#collection" data-nav-category="${key}">${label}</a>`).join('')}</div></div><a href="#campaign-film" data-drawer-anchor>Lookbook</a><a href="#story" data-drawer-anchor>About</a></nav><div class="drawer-bottom"><button type="button" data-open-search>Search</button><a href="#mood-section" data-drawer-anchor>오늘의 기분</a><span>In your own rhythm.</span></div>`;
  } else if (type === 'search') {
    content = `<h2 id="drawer-title">Search</h2><form class="search-form" id="search-form" role="search"><label class="sr-only" for="search-input">상품 검색</label><input id="search-input" type="search" placeholder="Search the collection" autocomplete="off" aria-controls="search-results"><button type="submit" aria-label="검색">⌕</button></form><p class="drawer-hint" id="search-status" aria-live="polite">이름이나 컬러로 나의 레이어를 찾아보세요.</p><div id="search-results" class="search-results"></div>`;
  } else if (type === 'filter') {
    content = `<h2 id="drawer-title">Filter & sort</h2><form id="drawer-filters"><fieldset><legend>Item</legend>${Object.entries(categories).map(([key, label]) => `<label class="filter-radio"><input type="radio" name="category" value="${key}" ${state.category === key ? 'checked' : ''}><span>${label}</span></label>`).join('')}</fieldset><fieldset><legend>Color</legend>${Object.entries({ '': 'All colors', ...colors }).map(([key, label]) => `<label class="filter-radio"><input type="radio" name="color" value="${key}" ${state.color === key ? 'checked' : ''}><span>${label}</span></label>`).join('')}</fieldset><label class="sort-label">Sort by<select name="sort"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label><button class="panel-button" type="submit">Show pieces</button></form>`;
  } else {
    content = `<h2 id="drawer-title">Your bag <small>(${bag.reduce((n, p) => n + p.qty, 0)})</small></h2>${bag.length ? `<div class="bag-items">${bag.map((item, i) => `<article class="bag-item"><img src="${image(item)}" alt="${item.ko}" width="90" height="135"><div><h3>${item.name}</h3><p>${item.colorName} / ${item.size}</p><p>${price(item.price)}</p><div class="quantity"><button type="button" data-quantity="${i}" data-change="-1" aria-label="수량 줄이기">−</button><span>${item.qty}</span><button type="button" data-quantity="${i}" data-change="1" aria-label="수량 늘리기">+</button></div><button class="remove-item" type="button" data-remove="${i}">Remove</button></div></article>`).join('')}</div><div class="bag-total"><span>Subtotal</span><span>${price(bag.reduce((n, p) => n + p.price * p.qty, 0))}</span></div><button class="panel-button" type="button" id="checkout-preview">Checkout</button>` : '<div class="bag-empty"><p>Your bag is empty.</p><a href="#collection" class="text-link" data-drawer-anchor>Continue exploring</a></div>'}<p class="preview-note">화면 미리보기용 장바구니입니다. 실제 주문·결제는 진행되지 않습니다.</p>`;
  }
  $('drawer-content').innerHTML = content;
  openLayer($('drawer'));
  if (type === 'shop') {
    $('menu-toggle').setAttribute('aria-expanded', 'true');
    $('shop-link').setAttribute('aria-expanded', 'true');
  }
  if (type === 'filter') $('drawer-filters').elements.sort.value = state.sort;
  if (type === 'search') $('search-input').focus({ preventScroll: true });
}

function info(title, body) {
  $('info-content').innerHTML = `<p class="eyebrow">MOTION LAYER</p><h2 id="info-title">${title}</h2><p>${body}</p>`;
  openLayer($('info-dialog'));
}

async function productDetail(id) {
  const p = catalog.find(p => p.id === id);
  if (!p) return;
  if ($('drawer').open) await closeLayer($('drawer'));
  selectedProduct = p; selectedSize = ''; galleryIndex = 0;
  $('product-detail').innerHTML = `<div class="detail-layout"><div class="detail-gallery"><div class="detail-image" id="gallery-viewport" aria-label="${p.ko} 촬영 사진"><div class="gallery-track" id="gallery-track">${[false, true].map((back, i) => `<button class="gallery-slide" type="button" data-lightbox="${i}" aria-label="사진 ${i + 1} 크게 보기" ${i ? 'tabindex="-1"' : ''}><img src="${image(p, back)}" alt="${p.ko} ${i ? '다른 각도' : '정면'}" width="750" height="1125"></button>`).join('')}</div></div><div class="gallery-controls"><div class="gallery-thumbnails">${[false, true].map((back, i) => `<button type="button" data-slide="${i}" aria-label="사진 ${i + 1}" aria-pressed="${!i}"><img src="${image(p, back)}" alt="" width="45" height="68"></button>`).join('')}</div><span class="gallery-counter" id="gallery-counter" aria-live="polite">01 / 02</span><div class="mobile-gallery-nav"><button type="button" data-gallery-step="-1" aria-label="Previous photo">Prev</button><button type="button" data-gallery-step="1" aria-label="Next photo">Next</button></div></div></div><div class="detail-copy"><p class="eyebrow">${p.number} / THE EVERYDAY COLLECTION</p><h2 id="product-title">${p.name}</h2><p class="price">${price(p.price)}</p><p class="description">${p.description}</p><div class="detail-color"><span>Color</span><span>${p.colorName}</span></div><p class="size-label">Size <span id="selected-size"></span></p><div class="size-options">${['S', 'M', 'L'].map(s => `<button type="button" data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div><button class="preview-button" type="button" id="preview-button" ${p.soldout ? 'disabled' : ''}>${p.soldout ? 'Sold out' : 'Add to bag'}</button><div class="detail-accordions"><details><summary>Measurements <span class="chevron" aria-hidden="true"></span></summary><div><p>시안용 사이즈 가이드 (cm)</p><table><thead><tr><th>Size</th><th>가슴</th><th>총장</th></tr></thead><tbody><tr><td>S</td><td>46</td><td>112</td></tr><tr><td>M</td><td>48</td><td>114</td></tr><tr><td>L</td><td>50</td><td>116</td></tr></tbody></table></div></details><details><summary>Materials & care <span class="chevron" aria-hidden="true"></span></summary><div>소재와 세탁 정보가 들어가는 영역입니다.<br>제품별 정확한 정보는 정식 오픈 시 제공됩니다.</div></details><details><summary>Shipping & returns <span class="chevron" aria-hidden="true"></span></summary><div>배송·교환·반품 정책을 안내하는 영역입니다.<br>운영 정책은 정식 오픈 전 확정됩니다.</div></details></div><p class="preview-note">상품 사진·정보는 시안용입니다. 실제 주문은 생성되지 않습니다.</p></div></div>`;
  openLayer($('product-dialog')); $('product-dialog').scrollTop = 0;
  setupGalleryDrag();
}

function slide(index) {
  galleryIndex = Math.max(0, Math.min(1, index));
  $('gallery-track').style.transform = `translateX(${-document.querySelector('.gallery-slide').offsetWidth * galleryIndex}px)`;
  $('gallery-counter').textContent = `0${galleryIndex + 1} / 02`;
  document.querySelectorAll('[data-slide]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.slide) === galleryIndex)));
  document.querySelectorAll('[data-lightbox]').forEach((b, i) => { b.tabIndex = i === galleryIndex ? 0 : -1; b.setAttribute('aria-hidden', String(i !== galleryIndex)); });
}

function setupGalleryDrag() {
  const viewport = $('gallery-viewport'); let start, moved = false;
  viewport.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; moved = false; });
  viewport.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      moved = true; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging');
      $('gallery-track').style.transform = `translateX(${-document.querySelector('.gallery-slide').offsetWidth * galleryIndex + dx}px)`;
    }
  });
  viewport.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x; viewport.classList.remove('is-dragging');
    if (moved) { e.preventDefault(); slide(galleryIndex + (Math.abs(dx) > 45 ? dx < 0 ? 1 : -1 : 0)); }
    start = null;
  });
  viewport.addEventListener('pointercancel', () => { start = null; viewport.classList.remove('is-dragging'); slide(galleryIndex); });
  viewport.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true);
  viewport.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); slide(galleryIndex + (e.key === 'ArrowRight' ? 1 : -1)); } });
}

function lightbox(index) {
  $('lightbox-images').innerHTML = [false, true].map((back, i) => `<div class="lightbox-frame" id="zoom-photo-${i}"><button class="zoom-image" type="button" aria-label="사진 확대" aria-pressed="false"><img src="${image(selectedProduct, back)}" alt="${selectedProduct.ko} 촬영 사진 ${i + 1}" width="1000" height="1500" draggable="false"></button></div>`).join('');
  openLayer($('lightbox'));
  $('lightbox-images').scrollTop = index * $('lightbox-images').clientHeight;
}

function search() {
  const query = $('search-input').value.trim().toLocaleLowerCase();
  const results = query ? catalog.filter(p => [p.name, p.ko, p.colorName, p.color].join(' ').toLocaleLowerCase().includes(query)) : [];
  $('search-status').textContent = query ? `${results.length} pieces found` : '이름이나 컬러로 나의 레이어를 찾아보세요.';
  $('search-results').innerHTML = results.map(p => `<button class="search-result" type="button" data-product="${p.id}"><img src="${image(p)}" alt="" width="70" height="105"><span>${p.name}<small>${p.colorName}</small><span>${price(p.price)}</span></span></button>`).join('');
}

document.addEventListener('click', async e => {
  const target = e.target;
  const product = target.closest('[data-product]'); if (product) productDetail(product.dataset.product);
  const close = target.closest('[data-close]'); if (close) closeLayer($(close.dataset.close));
  const size = target.closest('[data-size]');
  if (size) { selectedSize = size.dataset.size; document.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b === size))); $('selected-size').textContent = selectedSize; }
  if (target.closest('#preview-button') && selectedProduct && !selectedProduct.soldout) {
    if (!selectedSize) { toast('사이즈를 선택해 주세요.'); document.querySelector('[data-size]').focus(); return; }
    const existing = bag.find(p => p.id === selectedProduct.id && p.size === selectedSize);
    if (existing) existing.qty++; else bag.push({ ...selectedProduct, size: selectedSize, qty: 1 });
    $('bag-link').textContent = `${mobileViewport.matches ? 'Cart' : 'Bag'} (${bag.reduce((n, p) => n + p.qty, 0)})`;
    await closeLayer($('product-dialog')); drawer('bag');
  }
  const category = target.closest('[data-category]'); if (category) { state.category = category.dataset.category; render(); }
  const navCategory = target.closest('[data-nav-category]');
  if (navCategory) { e.preventDefault(); state.category = navCategory.dataset.navCategory; state.color = ''; state.mood = ''; $('color-select').value = ''; render(); await closeLayer($('drawer')); scrollTo($('collection')); }
  const anchor = target.closest('[data-drawer-anchor]');
  if (anchor) { e.preventDefault(); await closeLayer($('drawer')); scrollTo(document.querySelector(anchor.getAttribute('href'))); }
  const mood = target.closest('[data-mood]');
  if (mood) { state.mood = state.mood === mood.dataset.mood ? '' : mood.dataset.mood; state.category = 'all'; state.color = ''; $('color-select').value = ''; render(); scrollTo($('collection')); }
  if (target.closest('#clear-mood')) { state.mood = ''; render(); }
  const thumbnail = target.closest('[data-slide]'); if (thumbnail) slide(Number(thumbnail.dataset.slide));
  const galleryStep = target.closest('[data-gallery-step]'); if (galleryStep) slide((galleryIndex + Number(galleryStep.dataset.galleryStep) + 2) % 2);
  const photo = target.closest('[data-lightbox]'); if (photo) lightbox(Number(photo.dataset.lightbox));
  const zoom = target.closest('.zoom-image');
  if (zoom) { const isZoomed = zoom.classList.toggle('zoomed'); zoom.setAttribute('aria-pressed', String(isZoomed)); zoom.setAttribute('aria-label', isZoomed ? '사진 축소' : '사진 확대'); }
  const accordion = target.closest('.menu-accordion');
  if (accordion) {
    const panel = $(accordion.getAttribute('aria-controls')), expanded = accordion.getAttribute('aria-expanded') === 'true';
    const start = panel.hidden ? 0 : panel.getBoundingClientRect().height;
    accordion.setAttribute('aria-expanded', String(!expanded)); panel.getAnimations().forEach(a => a.cancel()); panel.hidden = false;
    const animation = panel.animate([{ height: `${start}px` }, { height: `${expanded ? 0 : panel.scrollHeight}px` }], { duration: reducedMotion.matches ? 0 : 250, easing: 'cubic-bezier(.4,0,.2,1)' });
    animation.finished.then(() => { panel.hidden = accordion.getAttribute('aria-expanded') === 'false'; }).catch(() => {});
  }
  if (target.closest('[data-open-search]')) { await closeLayer($('drawer')); drawer('search'); }
  const quantity = target.closest('[data-quantity]');
  if (quantity) { const item = bag[Number(quantity.dataset.quantity)]; item.qty = Math.max(1, item.qty + Number(quantity.dataset.change)); drawer('bag'); }
  const remove = target.closest('[data-remove]'); if (remove) { bag.splice(Number(remove.dataset.remove), 1); drawer('bag'); }
  if (quantity || remove) $('bag-link').textContent = `${mobileViewport.matches ? 'Cart' : 'Bag'} (${bag.reduce((n, p) => n + p.qty, 0)})`;
  if (target.closest('#checkout-preview')) toast('결제 화면의 디자인 미리보기입니다. 실제 주문은 생성되지 않아요.');
  const information = target.closest('[data-info]');
  if (information) {
    const pages = { guide: ['Shipping & Returns', '배송·교환·반품 안내가 표시되는 화면입니다.<br>운영 정책은 정식 오픈 전 확정하여 반영됩니다.'], faq: ['A little help.', '사이즈, 배송, 교환·반품에 관한 안내가 정식 오픈 시 제공됩니다.'], privacy: ['Terms & Privacy', '이 사이트는 모션레이어의 디자인 시안입니다.<br>상품명·가격·사진은 임시 콘텐츠이며 개인정보와 결제 정보를 수집하지 않습니다.'], instagram: ['In your own rhythm.', '컬렉션과 일상의 이야기를 담는 공간입니다.<br>공식 인스타그램 계정과 피드는 정식 오픈 시 연결됩니다.'] };
    info(...pages[information.dataset.info]);
  }
});

document.addEventListener('input', e => { if (e.target.id === 'search-input') { clearTimeout(searchTimer); searchTimer = setTimeout(search, 300); } });
document.addEventListener('submit', async e => {
  if (e.target.id === 'search-form') { e.preventDefault(); clearTimeout(searchTimer); search(); }
  if (e.target.id === 'drawer-filters') {
    e.preventDefault(); const form = new FormData(e.target);
    state.category = form.get('category'); state.color = form.get('color'); state.sort = form.get('sort');
    $('color-select').value = state.color; render(); await closeLayer($('drawer')); scrollTo($('collection'));
  }
});
$('color-select').addEventListener('change', e => { state.color = e.target.value; render(); });
$('grid-view').addEventListener('click', () => { state.view = 'gallery'; render(); });
$('index-view').addEventListener('click', () => { state.view = 'index'; render(); });
$('reset-filters').addEventListener('click', () => { Object.assign(state, { category: 'all', color: '', mood: '', sort: 'featured' }); $('color-select').value = ''; render(); });
$('mood-link').addEventListener('click', () => scrollTo($('mood-section')));
$('shop-link').addEventListener('click', () => drawer('shop'));
$('menu-toggle').addEventListener('click', () => drawer('shop'));
$('search-link').addEventListener('click', () => drawer('search'));
$('filter-link').addEventListener('click', () => drawer('filter'));
$('bag-link').addEventListener('click', () => drawer('bag'));
$('newsletter-form').addEventListener('submit', e => { e.preventDefault(); toast('구독 폼 미리보기입니다. 이메일은 전송되거나 저장되지 않았어요.'); e.currentTarget.reset(); });
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeLayer(dialog); });
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeLayer(dialog);
  });
});
render();
registerMotion();
