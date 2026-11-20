import { openLayer, closeLayer, enhanceImages, reducedMotion } from './motion.js';

const products = [
  { id: 'everyday-tee', number: '01', name: 'Everyday T-shirt', ko: '에브리데이 티셔츠', category: 'tops', color: 'Taupe', swatch: '#968b7e', price: 49000, moods: ['light', 'slow'], series: 'daily', sizes: ['S', 'M', 'L', 'XL'], description: '조금 느슨한 실루엣, 자연스러운 균형. 하나만 입어도 다른 레이어와 함께해도 좋은, 일상의 첫 번째 티셔츠.' },
  { id: 'layer-shell', number: '02', name: 'Light Layer Shell', ko: '라이트 레이어 셸', category: 'tops', color: 'Charcoal', swatch: '#4b4a46', price: 159000, moods: ['focus', 'outdoor'], series: 'active', sizes: ['S', 'M', 'L'], description: '걷고, 멈추고, 다시 움직이는 하루. 필요한 만큼 가볍게 걸치는 여유로운 레이어.' },
  { id: 'field-pants', number: '03', name: 'Field Cargo Pants', ko: '필드 카고 팬츠', category: 'bottoms', color: 'Stone', swatch: '#9e9e94', price: 129000, moods: ['focus', 'outdoor'], series: 'active', sizes: ['S', 'M', 'L', 'XL'], description: '가까운 골목부터 낯선 풍경까지. 여유 있는 핏과 실용적인 포켓으로 일상의 반경을 넓히는 팬츠.' },
  { id: 'light-shorts', number: '04', name: 'Easy Motion Shorts', ko: '이지 모션 쇼츠', category: 'bottoms', color: 'Sand', swatch: '#c2bbaa', price: 69000, moods: ['light', 'outdoor'], series: 'active', sizes: ['S', 'M', 'L'], description: '가벼운 발걸음에 어울리는 짧은 길이. 가만히 있는 순간에도 움직이는 순간에도 편안한 쇼츠.' },
  { id: 'soft-hoodie', number: '05', name: 'Soft Pause Hoodie', ko: '소프트 포즈 후디', category: 'tops', color: 'Grey', swatch: '#8c8984', price: 139000, moods: ['slow', 'focus'], series: 'pause', sizes: ['S', 'M', 'L'], soldout: true, description: '서두르지 않아도 되는 날을 위한 부드러운 레이어. 몸을 편안하게 감싸는 여유로운 후디.' },
  { id: 'everyday-cap', number: '06', name: 'Everywhere Cap', ko: '에브리웨어 캡', category: 'accessories', color: 'Navy', swatch: '#303f52', price: 39000, moods: ['light', 'outdoor'], series: 'daily', sizes: ['ONE SIZE'], description: '문을 나서기 전, 마지막 한 가지. 매일의 차림에 자연스럽게 더하는 가벼운 캡.' },
  { id: 'zip-layer', number: '07', name: 'Texture Zip Layer', ko: '텍스처 집 레이어', category: 'tops', color: 'Indigo', swatch: '#535074', price: 149000, moods: ['slow', 'outdoor'], series: 'pause', sizes: ['S', 'M', 'L', 'XL'], description: '지퍼를 열고 닫는 작은 변화로 달라지는 하루의 온도. 다양한 옷 사이를 이어주는 텍스처 레이어.' },
  { id: 'base-tee', number: '08', name: 'Essential Base Tee', ko: '에센셜 베이스 티', category: 'tops', color: 'Cream', swatch: '#e7e3d7', price: 59000, moods: ['light', 'focus'], series: 'daily', sizes: ['S', 'M', 'L', 'XL'], description: '가장 자주 손이 가는 단순함. 가볍게 입고, 자유롭게 조합하는 데일리 베이스.' },
  { id: 'daily-sling', number: '09', name: 'Daily Sling Bag', ko: '데일리 슬링 백', category: 'accessories', color: 'Navy', swatch: '#303f52', price: 45000, moods: ['light', 'outdoor'], series: 'daily', sizes: ['ONE SIZE'], description: '꼭 필요한 것만 담고 가볍게. 매일의 작은 소지품을 위한 간결한 슬링 백.' },
];

const labels = { light: '가볍게', focus: '집중해서', slow: '느긋하게', outdoor: '어디로든', daily: 'Daily series', active: 'Active series', pause: 'Pause series' };
const state = { category: 'all', color: '', mood: '', series: '', search: '', sort: 'featured', view: 'grid' };
const byId = id => document.getElementById(id);
const money = value => '₩' + value.toLocaleString('ko-KR');
const pad = value => String(value).padStart(2, '0');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const productFor = id => products.find(product => product.id === id);
let selectedProduct = null;
let selectedSize = '';
let toastTimer;
let cart = [];

try {
  const saved = JSON.parse(localStorage.getItem('motionlayer-bag') || '[]');
  if (Array.isArray(saved)) cart = saved.filter(item => {
    const product = productFor(item?.id);
    return product && !product.soldout && product.sizes.includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20;
  });
} catch { cart = []; }

function toast(message) {
  clearTimeout(toastTimer);
  byId('toast').textContent = message;
  byId('toast').classList.add('visible');
  toastTimer = setTimeout(() => byId('toast').classList.remove('visible'), 3800);
}

function showDialog(id) {
  openLayer(byId(id));
}

function setMobileMenu(open) {
  byId('mobile-menu-trigger').setAttribute('aria-expanded', String(open));
  if (open) { byId('mobile-menu').hidden = false; showDialog('mobile-menu'); }
  else closeLayer(byId('mobile-menu'));
}

function matchingProducts() {
  const search = state.search.trim().toLowerCase();
  const filtered = products.filter(product =>
    (state.category === 'all' || product.category === state.category) &&
    (!state.color || product.color === state.color) &&
    (!state.mood || product.moods.includes(state.mood)) &&
    (!state.series || product.series === state.series) &&
    (!search || `${product.name} ${product.ko} ${product.color}`.toLowerCase().includes(search))
  );
  if (state.sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (state.sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  return filtered;
}

function colorMarkup(product) {
  return `<span class="color-dot" style="--swatch:${product.swatch}" aria-hidden="true"></span>${product.color}`;
}

function productPhotos(product, frameClass, priority = false) {
  const frontLoading = priority ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<span class="product-photos ${frameClass}">
    <img class="product-front" src="assets/${product.id}.webp" alt="${product.ko}, ${product.color}" width="700" height="700" ${frontLoading}>
    <span class="product-back" aria-hidden="true"><img src="assets/${product.id}-back.webp" alt="" width="700" height="700" loading="lazy" decoding="async"></span>
  </span>`;
}

function gridCard(product, index) {
  return `<article class="product-card${product.soldout ? ' soldout' : ''}">
    <button class="product-image-button" type="button" data-product="${product.id}" aria-label="${product.name} 상세 보기">
      ${productPhotos(product, 'product-image', index < 3)}
      ${product.soldout ? '<span class="product-flag">SOLD OUT</span>' : ''}
    </button>
    <div class="product-meta"><span class="product-number">${product.number}</span><div><button class="product-name" type="button" data-product="${product.id}">${product.name}</button><span class="product-color">${colorMarkup(product)}</span><p class="product-price">${money(product.price)}</p></div>${product.soldout ? '' : `<button class="product-quick" type="button" data-product="${product.id}" aria-label="${product.name} 옵션 선택">+</button>`}</div>
  </article>`;
}

function indexRow(product) {
  return `<article class="index-row"><span class="product-number">${product.number}</span><button type="button" data-product="${product.id}" aria-label="${product.name} 상세 보기">${productPhotos(product, 'index-photo')}</button><button type="button" class="product-name" data-product="${product.id}">${product.name}</button><span class="product-color index-color">${colorMarkup(product)}</span><span class="product-price">${money(product.price)}</span>${product.soldout ? '<span class="index-status">SOLD OUT</span>' : `<button class="product-quick" type="button" data-product="${product.id}" aria-label="${product.name} 옵션 선택">+</button>`}</article>`;
}

function renderProducts() {
  const filtered = matchingProducts();
  const grid = byId('product-grid');
  grid.classList.toggle('is-index', state.view === 'index');
  const indexHeader = '<div class="index-header" aria-hidden="true"><span>No.</span><span>Item</span><span>Product</span><span class="index-color">Color</span><span>Price</span><span></span></div>';
  grid.innerHTML = filtered.length
    ? (state.view === 'index' ? indexHeader + filtered.map(indexRow).join('') : filtered.map((product, index) => gridCard(product, index) + (index === 4 && state.category === 'all' && !state.color && !state.mood && !state.series && !state.search ? '<figure class="saga-collage" id="saga-editorial"><div class="saga-collage-window"><img src="assets/street-editorial.webp" alt="거리에서 움직이는 스케이터의 에디토리얼 화보" width="1600" height="1310" loading="lazy"></div></figure>' : '')).join(''))
    : '<div class="empty-results"><p>선택한 조건에 맞는 레이어가 없어요.</p><button type="button" data-reset-filters>모든 상품 보기</button></div>';
  byId('total-count').textContent = pad(filtered.length);
  byId('showing-count').textContent = `SHOWING ${pad(filtered.length)} OF ${pad(products.length)}`;
  byId('filter-status').textContent = `${filtered.length}개의 상품이 표시됩니다.`;
  document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
  document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === state.mood)));
  document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === state.color)));
  byId('grid-view').setAttribute('aria-pressed', String(state.view === 'grid'));
  byId('index-view').setAttribute('aria-pressed', String(state.view === 'index'));
  byId('color-trigger').firstChild.textContent = state.color || 'Color ';
  const chips = [];
  if (state.mood) chips.push(['mood', `오늘은 ${labels[state.mood]}`]);
  if (state.color) chips.push(['color', state.color]);
  if (state.series) chips.push(['series', labels[state.series]]);
  if (state.search.trim()) chips.push(['search', `“${state.search.trim()}”`]);
  byId('active-filters').hidden = chips.length === 0;
  byId('active-filters').innerHTML = chips.map(([key, label]) => `<button type="button" class="filter-chip" data-remove-filter="${key}" aria-label="${escapeHtml(label)} 필터 해제">${escapeHtml(label)}<span aria-hidden="true">×</span></button>`).join('') + (chips.length ? '<button type="button" class="reset-filters" data-reset-filters>모두 해제</button>' : '');
  enhanceImages(grid);
}

function resetFilters() {
  Object.assign(state, { category: 'all', color: '', mood: '', series: '', search: '' });
  byId('product-search').value = '';
  renderProducts();
}

function setStatePanel(open) {
  byId('state-panel').hidden = !open;
  byId('state-trigger').setAttribute('aria-expanded', String(open));
}

function openProduct(id) {
  const product = productFor(id);
  if (!product) return;
  selectedProduct = product;
  selectedSize = product.sizes.length === 1 ? product.sizes[0] : '';
  byId('product-detail').innerHTML = `<div class="product-detail-layout"><div class="detail-visual"><img src="assets/${product.id}.webp" alt="${product.ko}, ${product.color}" width="700" height="700"></div><div class="detail-copy"><span class="eyebrow mono">${product.number} / ${product.series.toUpperCase()} SERIES</span><h2 id="product-dialog-title">${product.name}</h2><p class="detail-price">${money(product.price)}</p><p class="detail-intro">${product.description}</p><div class="variant-label"><span>Color</span></div><div class="detail-color">${colorMarkup(product)}</div><div class="variant-label"><span>Size <span id="selected-size-label"></span></span>${product.sizes.length > 1 ? '<button type="button" id="size-guide-trigger" aria-expanded="false" aria-controls="size-guide">Size guide</button>' : ''}</div><div class="size-buttons" id="size-buttons">${product.sizes.map(size => `<button type="button" data-size="${size}" aria-pressed="${selectedSize === size}" ${product.soldout ? 'disabled' : ''}>${size}</button>`).join('')}</div><div id="size-guide" hidden><table class="size-chart"><caption class="sr-only">시안용 사이즈표, 단위 센티미터</caption><thead><tr><th>Size</th><th>총장</th><th>가슴</th><th>어깨</th></tr></thead><tbody><tr><td>S</td><td>66</td><td>53</td><td>47</td></tr><tr><td>M</td><td>69</td><td>56</td><td>49</td></tr><tr><td>L</td><td>72</td><td>59</td><td>51</td></tr><tr><td>XL</td><td>75</td><td>62</td><td>53</td></tr></tbody></table><p class="size-note">시안용 예시 치수입니다. 실제 상품의 실측 정보로 변경됩니다.</p></div><button class="detail-add" id="detail-add" type="button" ${product.soldout ? 'disabled' : ''}><span>${product.soldout ? 'Sold out' : 'Add to bag'}</span><span>${product.soldout ? '품절' : '+'}</span></button><details class="detail-disclosure"><summary>소재와 세탁</summary><p>상품별 소재 혼용률과 세탁 방법이 표시되는 영역입니다.<br>제품 정보 확정 후 정확한 취급 주의사항이 안내됩니다.</p></details><details class="detail-disclosure"><summary>배송 · 교환 · 반품</summary><p>배송 일정, 배송비, 교환·반품 기준을 확인하는 영역입니다.<br>정식 운영 정책은 오픈 전 확정됩니다.</p></details></div></div>`;
  byId('product-detail').querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
    selectedSize = button.dataset.size;
    byId('selected-size-label').textContent = `— ${selectedSize}`;
    byId('size-buttons').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.size === selectedSize)));
  }));
  byId('size-guide-trigger')?.addEventListener('click', event => {
    const guide = byId('size-guide');
    guide.hidden = !guide.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!guide.hidden));
  });
  byId('detail-add').addEventListener('click', () => {
    if (!selectedSize) {
      toast('사이즈를 먼저 선택해 주세요.');
      byId('size-buttons').querySelector('button:not(:disabled)')?.focus();
      return;
    }
    addToCart(selectedProduct.id, selectedSize);
  });
  showDialog('product-dialog');
  enhanceImages(byId('product-detail'));
}

function saveCart() {
  try { localStorage.setItem('motionlayer-bag', JSON.stringify(cart)); } catch { /* Cart remains usable for this visit. */ }
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(element => element.textContent = `(${quantity})`);
  byId('cart-trigger').setAttribute('aria-label', `장바구니 ${quantity}개`);
}

function addToCart(id, size) {
  const product = productFor(id);
  if (!product || product.soldout || !product.sizes.includes(size)) return;
  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing && existing.quantity >= 20) { toast('한 옵션은 최대 20개까지 담을 수 있어요.'); return; }
  if (existing) existing.quantity += 1;
  else cart.push({ id, size, quantity: 1 });
  saveCart();
  renderCart();
  showDialog('cart-dialog');
  toast('선택한 레이어를 장바구니에 담았어요.');
}

function renderCart() {
  saveCart();
  if (!cart.length) {
    byId('cart-content').innerHTML = '<div class="empty-cart"><p>아직 담은 레이어가 없어요.</p><button type="button" data-close="cart-dialog">컬렉션 둘러보기</button></div>';
    byId('cart-summary').innerHTML = '';
    return;
  }
  byId('cart-content').innerHTML = cart.map((item, index) => {
    const product = productFor(item.id);
    return `<article class="cart-item"><img src="assets/${product.id}.webp" alt="${product.ko}" width="120" height="120"><div><h3>${product.name}</h3><p>${product.color} / ${item.size}</p><div class="cart-item-price">${money(product.price)}</div><div class="cart-item-controls"><div class="quantity-control"><button type="button" data-quantity="${index}" data-delta="-1" aria-label="${product.name} 수량 줄이기">−</button><span>${item.quantity}</span><button type="button" data-quantity="${index}" data-delta="1" aria-label="${product.name} 수량 늘리기">+</button></div><button class="remove-item" type="button" data-remove-cart="${index}" aria-label="${product.name} 삭제">Remove</button></div></div></article>`;
  }).join('');
  const total = cart.reduce((sum, item) => sum + productFor(item.id).price * item.quantity, 0);
  byId('cart-summary').innerHTML = `<div class="cart-totals"><div class="cart-total-line"><span>Subtotal</span><span>${money(total)}</span></div><p>배송비는 주문 단계에서 확인할 수 있습니다.</p><button class="checkout-button" type="button" id="checkout-button">주문 미리보기</button><p class="cart-preview-note">디자인 시안입니다. 실제 결제와 주문은 진행되지 않습니다.</p></div>`;
  byId('checkout-button').addEventListener('click', () => {
    const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    byId('info-content').innerHTML = `<span class="eyebrow mono">ORDER PREVIEW</span><h2 id="info-title">선택한 레이어</h2><p>${quantity}개 상품 · ${money(total)}</p><h3>결제 전 디자인 미리보기</h3><p>이 사이트는 모션레이어의 디자인 시안입니다.<br>결제 정보는 수집하지 않으며, 실제 주문은 생성되지 않습니다.</p><p style="margin-top:20px">회원·간편결제·쿠폰·적립금·주문 및 재고 연동은 카페24 구현 단계에서 연결됩니다.</p>`;
    showDialog('info-dialog');
  });
}

const infoPages = {
  about: `<span class="eyebrow mono">ABOUT MOTION LAYER</span><h2 id="info-title">일상과 움직임 사이.</h2><img class="about-mark" src="assets/mark.svg" alt="모션레이어 점 로고" width="70" height="70"><p>하나의 점은 작은 시작입니다.<br>점과 점이 이어지면 선이 되고, 선이 겹치면 레이어가 됩니다.</p><h3>One point. Endless motion.</h3><p>모션레이어는 각자의 속도로 움직이는 일상을 생각합니다. 바쁘게 걷는 출근길에도, 목적 없이 떠나는 산책에도, 편안히 머무는 시간에도. 서로 다른 순간을 이어주는 옷을 만듭니다.</p><h3>Wear your own rhythm.</h3><p>당신의 하루에 자연스럽게 더해지는 레이어.<br>매일의 움직임이 곧 모션레이어의 출발점입니다.</p>`,
  guide: `<span class="eyebrow mono">CUSTOMER GUIDE</span><h2 id="info-title">Shipping & Returns</h2><p>아래는 화면 구성을 위한 예시 안내입니다.<br>정식 오픈 전 실제 운영 정책으로 변경됩니다.</p><h3>배송 안내</h3><p>상품별 출고 일정과 배송비, 도서산간 추가 배송비가 안내될 예정입니다.</p><h3>교환 · 반품 안내</h3><p>신청 기간, 접수 방법, 상품 상태 기준 및 반품 배송비를 안내하는 영역입니다. 실제 운영 정책을 확정한 뒤 정확한 내용이 반영됩니다.</p>`,
  faq: `<span class="eyebrow mono">FREQUENTLY ASKED</span><h2 id="info-title">A little help.</h2><details><summary>사이즈는 어디서 확인하나요?</summary><p>상품 상세 화면의 Size guide에서 사이즈별 실측을 확인할 수 있습니다. 현재 표시된 치수는 시안용 예시입니다.</p></details><details><summary>품절된 상품을 구매할 수 있나요?</summary><p>SOLD OUT 표시가 있는 상품은 현재 구매할 수 없습니다. 재입고 알림은 정식 운영 단계에서 연결할 예정입니다.</p></details><details><summary>오늘의 상태는 어떤 기능인가요?</summary><p>가볍게, 집중해서, 느긋하게, 어디로든. 오늘의 기분을 선택하면 그 순간에 어울리는 상품을 모아 보여드립니다.</p></details><details><summary>주문과 배송은 어디서 확인하나요?</summary><p>정식 오픈 후 회원·주문 조회 화면에서 확인할 수 있습니다. 현재는 디자인 미리보기이며 실제 주문은 생성되지 않습니다.</p></details>`,
  terms: `<span class="eyebrow mono">TERMS & PRIVACY</span><h2 id="info-title">이용 안내</h2><p>현재 사이트는 모션레이어의 디자인 시안입니다. 상품명, 가격, 사진, 설명은 화면 검토를 위한 예시이며 실제 판매 정보가 아닙니다.</p><h3>개인정보</h3><p>이 시안은 서버로 개인정보나 결제 정보를 전송하지 않습니다. 장바구니는 현재 브라우저에만 저장됩니다.</p><h3>정식 운영 안내</h3><p>사업자 정보, 이용약관, 개인정보 처리방침 및 고객센터 정보는 정식 운영 단계에서 확정한 내용으로 반영됩니다.</p>`,
  social: `<span class="eyebrow mono">MOTION LAYER JOURNAL</span><h2 id="info-title">Everyday, in motion.</h2><p>브랜드의 일상과 새로운 컬렉션을 만나보는 공간입니다.</p><h3>Instagram</h3><p>모션레이어의 공식 계정과 피드는 정식 오픈 시 연결됩니다.</p>`,
};

document.addEventListener('click', event => {
  const productButton = event.target.closest('[data-product]');
  if (productButton) openProduct(productButton.dataset.product);
  const closeButton = event.target.closest('[data-close]');
  if (closeButton) closeLayer(byId(closeButton.dataset.close));
  const infoButton = event.target.closest('[data-open-info]');
  if (infoButton) {
    const page = infoPages[infoButton.dataset.openInfo];
    if (page) { byId('info-content').innerHTML = page; showDialog('info-dialog'); }
    setMobileMenu(false);
  }
  if (event.target.closest('[data-reset-filters]')) resetFilters();
  const chip = event.target.closest('[data-remove-filter]');
  if (chip) {
    state[chip.dataset.removeFilter] = '';
    if (chip.dataset.removeFilter === 'search') byId('product-search').value = '';
    renderProducts();
  }
  const quantityButton = event.target.closest('[data-quantity]');
  if (quantityButton) {
    const item = cart[Number(quantityButton.dataset.quantity)];
    if (item) {
      item.quantity = Math.min(20, item.quantity + Number(quantityButton.dataset.delta));
      if (item.quantity <= 0) cart.splice(Number(quantityButton.dataset.quantity), 1);
      renderCart();
    }
  }
  const removeButton = event.target.closest('[data-remove-cart]');
  if (removeButton) { cart.splice(Number(removeButton.dataset.removeCart), 1); renderCart(); }
  if (!event.target.closest('.color-filter')) { byId('color-options').hidden = true; byId('color-trigger').setAttribute('aria-expanded', 'false'); }
});

document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeLayer(dialog);
}));

// Keep the front visible until the second photograph has loaded, including after filtering.
byId('product-grid').addEventListener('load', ({ target }) => {
  if (target.matches('.product-back > img')) target.parentElement.classList.add('is-ready');
}, true);

byId('category-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (button) { state.category = button.dataset.category; state.series = ''; renderProducts(); }
});
byId('state-trigger').addEventListener('click', () => setStatePanel(byId('state-panel').hidden));
byId('state-close').addEventListener('click', () => setStatePanel(false));
byId('state-options').addEventListener('click', event => {
  const button = event.target.closest('[data-mood]');
  if (!button) return;
  state.mood = state.mood === button.dataset.mood ? '' : button.dataset.mood;
  state.category = 'all';
  state.series = '';
  renderProducts();
  byId('collection').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
byId('grid-view').addEventListener('click', () => { state.view = 'grid'; renderProducts(); });
byId('index-view').addEventListener('click', () => { state.view = 'index'; renderProducts(); });
byId('sort-select').addEventListener('change', event => { state.sort = event.target.value; renderProducts(); });
byId('color-trigger').addEventListener('click', () => {
  byId('color-options').hidden = !byId('color-options').hidden;
  byId('color-trigger').setAttribute('aria-expanded', String(!byId('color-options').hidden));
});
const colors = [...new Map(products.map(product => [product.color, product.swatch])).entries()];
byId('color-buttons').innerHTML = colors.map(([name, swatch]) => `<button type="button" data-color="${name}" aria-pressed="false"><span class="color-dot" style="--swatch:${swatch}" aria-hidden="true"></span>${name}</button>`).join('');
byId('color-buttons').addEventListener('click', event => {
  const button = event.target.closest('[data-color]');
  if (!button) return;
  state.color = state.color === button.dataset.color ? '' : button.dataset.color;
  renderProducts();
  byId('color-options').hidden = true;
  byId('color-trigger').setAttribute('aria-expanded', 'false');
});
byId('clear-color').addEventListener('click', () => { state.color = ''; renderProducts(); });
byId('search-trigger').addEventListener('click', () => {
  byId('search-row').hidden = false;
  byId('collection').scrollIntoView({ behavior: 'smooth' });
  byId('product-search').focus({ preventScroll: true });
});
byId('search-close').addEventListener('click', () => {
  byId('search-row').hidden = true;
  state.search = '';
  byId('product-search').value = '';
  renderProducts();
});
byId('product-search').addEventListener('input', event => { state.search = event.target.value; renderProducts(); });
byId('cart-trigger').addEventListener('click', () => { renderCart(); showDialog('cart-dialog'); });
byId('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => {
  resetFilters();
  state.series = button.dataset.series;
  renderProducts();
  byId('collection').scrollIntoView({ behavior: 'smooth' });
}));
byId('mobile-menu-trigger').addEventListener('click', () => {
  setMobileMenu(!byId('mobile-menu').open);
});
byId('mobile-menu').querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  setMobileMenu(false);
}));
byId('mobile-state-trigger').addEventListener('click', () => {
  setMobileMenu(false);
  setStatePanel(true);
  byId('state-panel').scrollIntoView({ behavior: 'smooth' });
});
byId('newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  toast('구독 화면 미리보기입니다. 이메일은 전송되거나 저장되지 않았어요.');
  event.currentTarget.reset();
});
renderProducts();
saveCart();
