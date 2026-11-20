'use strict';

const colors = ['전체', ...new Set(goods.map(p => p.color))];
const sizePicks = new Map();
const matrix = $('.matrix');
const sheet = $('#sheet');
const filters = {type:'전체', color:'전체', filterMood:'', recent:false, series:''};
const sorts = {index:'번호순', price:'낮은 가격순', name:'이름순'};
let previousRoute = '';
let returnTo = '#catalog';
let trigger = null;
let feedbackTimer;

const seenOnScroll = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const photoRevealThreshold = 0.4;
const entranceObserver = 'IntersectionObserver' in window && 'animate' in Element.prototype
  ? new IntersectionObserver(showEnteringItems, {threshold: [0, photoRevealThreshold]})
  : null;

function entranceKey(item) {
  if (!item.dataset.id) return item.hash;
  return (item.matches('.thumb') ? 'photo/' : 'row/') + item.dataset.id;
}

function showEnteringItems(entries, observer) {
  for (const {target, isIntersecting, intersectionRatio} of entries) {
    if (!isIntersecting || !target.isConnected) continue;
    if (target.classList.contains('arrival-pending') && intersectionRatio < photoRevealThreshold) continue;
    observer.unobserve(target);
    target.classList.remove('arrival-pending');
    const key = entranceKey(target);
    if (seenOnScroll.has(key)) continue;
    seenOnScroll.add(key);
    if (reducedMotion.matches || target.matches('.thumb, :focus-within')) continue;
    target.animate([
      { opacity: 0.76, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 260, easing: 'ease-out' });
  }
}

function watchScrollEntrances() {
  if (!entranceObserver) return;
  entranceObserver.disconnect();
  const items = document.querySelectorAll('.thumb, .entry, .series-strip > a, #posts > a');
  for (const item of items) {
    const key = entranceKey(item);
    if (seenOnScroll.has(key)) continue;
    const rect = item.getBoundingClientRect();
    if (rect.height && rect.bottom > 0 && rect.top < window.innerHeight) {
      item.classList.remove('arrival-pending');
      seenOnScroll.add(key);
    } else {
      if (item.matches('.thumb, .entry')) item.classList.add('arrival-pending');
      entranceObserver.observe(item);
    }
  }
}

const readingStrip = $('.reading-strip');
const readingSection = $('.reading-section');
const readingItem = $('.reading-item');
const readingPercent = $('.reading-percent');
const seriesStrip = $('.series-strip');
const journal = $('.journal');
let readingRows = [];
let measureReadingRows = true;
let readingFrame = 0;

function updateReadingPosition() {
  readingFrame = 0;
  const viewport = document.documentElement.clientHeight;
  const distance = Math.max(0, document.documentElement.scrollHeight - viewport);
  const y = Math.max(0, window.scrollY);
  const progress = distance ? Math.min(1, y / distance) : 0;
  const seriesBounds = seriesStrip.getBoundingClientRect();
  const probe = viewport * (0.25 + 0.60 * progress);
  const section = journal.getBoundingClientRect().top <= probe ? 'Instagram'
    : $('.fieldnotes').getBoundingClientRect().top <= probe ? '시리즈' : '상품 목록';

  if (measureReadingRows) {
    const groups = matrix.querySelectorAll('.entry-group');
    // Side-by-side columns share the same reading line. On mobile they stack.
    const sideBySide = groups.length > 1 && groups[0].offsetLeft !== groups[1].offsetLeft;
    const list = sideBySide ? groups[0] : matrix;
    readingRows = [...list.querySelectorAll('.entry')].map(row => ({
      top: row.getBoundingClientRect().top + y,
      item: product(row.dataset.id)
    }));
    measureReadingRows = false;
  }
  const rowLine = y + Math.min(probe, viewport / 3);
  let current = readingRows[0]?.item;
  for (const row of readingRows) {
    if (row.top > rowLine) break;
    current = row.item;
  }

  readingStrip.toggleAttribute('inert', y < 48);
  readingStrip.style.setProperty('--page-progress', progress);
  const percent = Math.round(progress * 100) + '%';
  if (readingPercent.textContent !== percent) readingPercent.textContent = percent;
  if (readingSection.textContent !== section) readingSection.textContent = section;
  readingItem.hidden = section !== '상품 목록' || !current;
  if (!readingItem.hidden && readingItem.dataset.id !== String(current.id)) {
    readingItem.dataset.id = current.id;
    readingItem.querySelector('img').src = photo(current);
    readingItem.querySelector('span').textContent = pad(current.id) + '. ' + current.name;
  }
  if (!reducedMotion.matches && seriesBounds.top < viewport && seriesBounds.bottom > 0) {
    const travel = Math.min(1, Math.max(0, (viewport - seriesBounds.top) / (viewport * .72)));
    seriesStrip.style.setProperty('--series-shift', (travel * 80 - 40).toFixed(2) + 'px');
  }
}

function queueReadingPosition() {
  if (!readingFrame) readingFrame = requestAnimationFrame(updateReadingPosition);
}
function refreshReadingLayout() {
  measureReadingRows = true;
  queueReadingPosition();
}
window.addEventListener('scroll', queueReadingPosition, {passive:true});
window.addEventListener('resize', refreshReadingLayout);
if ('ResizeObserver' in window) new ResizeObserver(refreshReadingLayout).observe($('main'));
document.fonts.ready.then(refreshReadingLayout);

function matchingGoods() {
  const items = goods.filter(p =>
    (ui.type === '전체' || p.type === ui.type) &&
    (ui.color === '전체' || p.color === ui.color) &&
    (!ui.series || p.series === ui.series) &&
    (!ui.recent || p.id <= 4) &&
    (!ui.filterMood || p.moods.includes(ui.filterMood))
  );
  if (ui.sort === 'price') items.sort((a,b) => a.price - b.price || a.id - b.id);
  if (ui.sort === 'name') items.sort((a,b) => a.name.localeCompare(b.name,'en'));
  return items;
}

function choice(key,value,label,active) {
  return `<button type="button" class="choice-link" data-field="${key}" data-value="${value}" aria-pressed="${active}"><span>${label}</span><i aria-hidden="true"></i></button>`;
}
function menu() {
  const nav = (hash,label) => `<a class="nav-link" href="#${hash}"><span>${label}</span><i aria-hidden="true"></i></a>`;
  const isAll = Object.entries(filters).every(([key,initial]) => ui[key] === initial);
  return `<nav class="site-links" aria-label="스토어">
    <button data-reset class="nav-link" aria-pressed="${isAll}"><span>all goods</span><i></i></button>
    ${choice('recent','new','new arrivals',ui.recent)}
    ${nav('series','series') + nav('about','about motion layer') + nav('account','my page')}
    ${nav('bag',`bag (<span data-bag-count>${memory.bag.reduce((n,v)=>n+v.qty,0)}</span>)`)}
  </nav><fieldset><legend>오늘의 상태</legend>${Object.entries(moods).map(([id,[name]])=>choice('filterMood',id,name,ui.filterMood===id)).join('')}</fieldset>
  <fieldset><legend>item</legend>${types.slice(1).map(t=>choice('type',t,t,ui.type===t)).join('')}</fieldset>
  <label class="select-field">color <select data-color aria-label="컬러 필터">${colors.map(c=>`<option${ui.color===c?' selected':''}>${c}</option>`).join('')}</select></label>
  <fieldset><legend>sort by</legend>${Object.entries(sorts).map(([k,v])=>choice('sort',k,v,ui.sort===k)).join('')}</fieldset>`;
}
function sizeOf(p) { return sizePicks.get(p.id) || sizesFor(p)[0]; }
function picture(p) {
  return `<a href="#product/${p.id}" class="thumb" data-id="${p.id}" aria-label="${pad(p.id)}. ${p.name} 상품 상세">
    <span class="thumb-no">${pad(p.id)}.</span>
    <div class="image-bed"><img src="${photo(p)}" alt="" loading="${p.id<17?'eager':'lazy'}"></div>
  </a>`;
}
function entry(p) {
  const label = p.sold ? '<em class="sold">품절</em>' : '';
  const sizes = sizesFor(p).map(s=>`<button data-quick-size="${s}" aria-label="${p.name} 사이즈 ${s}" aria-pressed="${s===sizeOf(p)}" ${p.sold?'disabled':''}>${s}</button>`).join('');
  return `<article class="entry" data-id="${p.id}">
    <span class="entry-no">${pad(p.id)}.</span>
    <div class="entry-info">
      <div class="item-title"><h3><a href="#product/${p.id}">${p.name}</a></h3><span class="price">${won(p.price)}</span></div>
      <div class="item-color"><i style="--swatch:${p.hex}"></i>${p.color} ${label}</div>
      <div class="purchase"><div class="quick-sizes">${sizes}</div>${p.sold?'':`<button class="quick-add" data-quick-add aria-label="${p.name} 장바구니 담기">+ bag</button>`}</div>
    </div>
    <a href="#product/${p.id}" class="mobile-photo" aria-label="${p.name} 사진과 상세"><img src="${photo(p)}" alt="" loading="lazy"></a>
  </article>`;
}
function activeSummary() {
  const labels = {recent:'신상품', series:series.find(s=>s.id===ui.series)?.name, filterMood:moods[ui.filterMood]?.[0], type:ui.type, color:ui.color};
  return Object.keys(filters).filter(k=>ui[k]!==filters[k]).map(k=>`<button class="chip" data-remove="${k}" aria-label="${labels[k]} 필터 해제">[ ${labels[k]} × ]</button>`).join('');
}
function renderIndex() {
  const items=matchingGoods();
  const halfway=Math.ceil(items.length/2);
  const halves=[items.slice(0,halfway),items.slice(halfway)];
  $('.photos').innerHTML=halves.map(group=>`<div class="photo-group">${group.map(picture).join('')}</div>`).join('');
  $('.entries').innerHTML=halves.map(group=>`<div class="entry-group">${group.map(entry).join('')}</div>`).join('');
  $('#active-filters').innerHTML=activeSummary();
  $('#result-count').textContent=`(${pad(items.length)})`;
  $('.zero').hidden=Boolean(items.length);
  matrix.hidden=!items.length;
  watchScrollEntrances();
  refreshReadingLayout();
}
function updateFilters() {
  renderIndex();
  const desktop=$('#desktop-menu');
  desktop.innerHTML=menu();
  if(location.hash==='#menu' && sheet.open) renderMobileMenu();
}
function applyFilter(key,value) {
  if(key==='recent') ui.recent=!ui.recent;
  else if(key==='sort') ui.sort=value;
  else ui[key]=ui[key]===value?filters[key]:value;
  updateFilters();
}
function selectSeries(id) {
  Object.assign(ui,filters,{series:id});
  updateFilters();
  location.hash='catalog';
  $('#catalog').scrollIntoView();
}
function renderMobileMenu() {
  $('#sheet-content').innerHTML=heading('MOTION LAYER / INDEX','메뉴 · 필터')+`<div class="mobile-menu">${menu()}</div><button class="primary wfull" data-show-results>상품 ${matchingGoods().length}개 보기</button>`;
}
function highlight(id) {
  for(const el of matrix.querySelectorAll('[data-id].marked')) el.classList.remove('marked');
  if(id) for(const el of matrix.querySelectorAll(`[data-id="${id}"]`)) el.classList.add('marked');
}
matrix.addEventListener('pointerover', e => {
  if (e.pointerType !== 'touch') highlight(e.target.closest('[data-id]')?.dataset.id);
});
matrix.addEventListener('pointerleave', () => {
  highlight(matrix.querySelector(':focus-visible')?.closest('[data-id]')?.dataset.id);
});
matrix.addEventListener('focusin', e => {
  if (e.target.matches(':focus-visible')) highlight(e.target.closest('[data-id]')?.dataset.id);
});
matrix.addEventListener('focusout', e => {
  if (!matrix.contains(e.relatedTarget)) highlight();
});

function refreshSheet(){
  const [page,id]=location.hash.slice(1).split('/');
  const focusId=document.activeElement?.id;
  $('#sheet-content').innerHTML=content(page,id)||'';
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
function closeSheet() {location.hash=returnTo;}
function route() {
  const hash=location.hash || '#home';
  const [page,id]=hash.slice(1).split('/');
  if(page==='product' && product(id) && hash!==previousRoute) ui.size=sizeOf(product(id));
  previousRoute=hash;
  const html=page==='menu'?'menu':content(page,id);
  if(!html) {
    if(sheet.open) {
      sheet.close();
      if(hash===returnTo) trigger?.focus({preventScroll:true});
    }
    if(page==='home')window.scrollTo({top:0});
    return;
  }
  if(!sheet.open) {
    trigger=document.activeElement;
    returnTo=trigger?.closest('.fieldnotes')?'#field-title':trigger?.closest('.journal')?'#posts':'#catalog';
  }
  if(page==='menu')renderMobileMenu();else $('#sheet-content').innerHTML=html;
  if(!sheet.open)sheet.showModal();
  sheet.scrollTop=0;
  $('#close').focus({preventScroll:true});
}
function quickAdd(p) {
  ui.size=sizeOf(p);
  if(!add(p))return;
  const el=$('.feedback');
  el.innerHTML=`${p.name} / ${ui.size} 담김 · <a href="#bag">bag 보기</a>`;
  clearTimeout(feedbackTimer);
  feedbackTimer=setTimeout(()=>el.replaceChildren(),3200);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b || b.disabled)return;
  const d=b.dataset;
  if('reset' in d) {
    Object.assign(ui,filters,{sort:'index'});
    updateFilters();
    if(location.hash!=='#menu') window.scrollTo({top:0});
    return;
  }
  if(d.field) {
    const host=b.closest('.mobile-menu')?'#sheet-content':'#desktop-menu';
    applyFilter(d.field,d.value);
    if(e.detail===0)document.querySelector(`${host} [data-field="${d.field}"][data-value="${d.value}"]`)?.focus({preventScroll:true});
    if(host==='#desktop-menu')window.scrollTo({top:0});
    return;
  }
  if(d.remove){ui[d.remove]=filters[d.remove];updateFilters();return;}
  if('showResults' in d){location.hash='catalog';$('#catalog').scrollIntoView();return;}
  if(d.collection){selectSeries(d.collection);return;}
  const p=product(b.closest('[data-id]')?.dataset.id);
  if(d.quickSize&&p){
    sizePicks.set(p.id,d.quickSize);
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
    return;
  }
  if('quickAdd' in d && p){quickAdd(p);return;}
  if(d.size||d.method) {
    const field=d.size?'size':'method';
    ui[field]=d[field];
    if(d.size)sizePicks.set(Number(location.hash.split('/')[1]),d.size);
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
    if(d.size)renderIndex();
  }
  if(d.add && add(product(location.hash.split('/')[1])))location.hash=d.add==='buy'?'checkout':'bag';
  if(d.qty) {
    const line=memory.bag[Number(d.row)];
    if(line){line.qty+=Number(d.qty);if(!line.qty)memory.bag.splice(Number(d.row),1);save();refreshSheet();}
  }
  if('order' in d)placeOrder();
});
document.addEventListener('change',e=>{
  if(e.target.matches('[data-color]')){ui.color=e.target.value;updateFilters();return;}
  if(e.target.id==='coupon'||e.target.id==='points'){ui[e.target.id]=e.target.checked;refreshSheet();}
});
$('#close').onclick=closeSheet;
sheet.addEventListener('cancel',e=>{e.preventDefault();closeSheet();});
sheet.addEventListener('click',e=>{if(e.target===sheet && e.clientX<sheet.getBoundingClientRect().left)closeSheet();});
$('#posts').innerHTML=posts.map((p,i)=>`<a href="#post/${i}"><img src="assets/${p.photo}.webp" alt="" loading="lazy">${p.title}</a>`).join('');
window.addEventListener('hashchange',route);
updateFilters();save();route();
