'use strict';

const drawer = $('#drawer');
const sheet = $('#sheet-content');
const pageSize = 6;
const filterDefaults = {type:'전체', color:'전체', sort:'index', filterMood:'', series:'', recent:false};
let shown = pageSize;
let lastRoute = '';
let baseHash = '#home';
let opener = null;
let baseScroll = 0;
let searchText = '';

function setOptions(select, values, first) {
  values.forEach((value,i) => select.add(new Option(i === 0 ? first : value,value)));
}
setOptions($('#type'), types, '모든 아이템');
setOptions($('#color'), ['전체', ...new Set(goods.map(p=>p.color))], '모든 컬러');

function matchesFilters(p) {
  return (ui.type === '전체' || p.type === ui.type)
    && (ui.color === '전체' || p.color === ui.color)
    && (!ui.series || p.series === ui.series)
    && (!ui.recent || p.id <= 4)
    && (!ui.filterMood || (!p.sold && p.moods.includes(ui.filterMood)));
}
function card(p) {
  const tag = p.sold ? '품절' : p.id <= 4 ? 'NEW' : '';
  return `<article class="card" data-id="${p.id}">
    <a class="card-link" href="#product/${p.id}">
      <div class="card-stage"><span class="card-no">Nº ${pad(p.id)}</span><span class="card-tag ${p.sold?'sold':''}">${tag}</span><img src="${photo(p)}" alt="${p.color} ${p.name}" loading="lazy"></div>
      <div class="card-line"><h3>${p.name}</h3><span class="price">${won(p.price)}</span></div>
    </a>
    <div class="card-foot"><span><i class="swatch" style="--color:${p.hex}"></i>${p.color}</span>${p.sold?'':`<button data-quick="${p.id}">${sizesFor(p).length===1?'+ 바로 담기':'사이즈 선택'}</button>`}</div>
  </article>`;
}
function renderCatalog() {
  const items = goods.filter(matchesFilters);
  if (ui.sort === 'price') items.sort((a,b)=>a.price-b.price || a.id-b.id);
  if (ui.sort === 'name') items.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  $('#cards').innerHTML = items.slice(0,shown).map(card).join('');
  $('#count').textContent = `상품 ${items.length}개`;
  $('#empty').hidden = items.length > 0;
  $('#more').hidden = shown >= items.length;
  $('#more').textContent = `더 보기   ${Math.min(shown,items.length)} / ${items.length}`;
  const current = series.find(s=>s.id===ui.series);
  $('#series-filter').innerHTML = current ? `<button data-remove-series aria-label="${current.name} 필터 해제">${current.name} ×</button>` : '';
  for (const key of ['type','color','sort']) $('#'+key).value=ui[key];
  document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.state===ui.filterMood));
  document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.scope==='new')===ui.recent));
  watchPictures();
}
function filter(changes) {
  Object.assign(ui, changes); shown=pageSize; renderCatalog();
}
function openSeriesGoods(id) {
  filter({...filterDefaults,series:id});
  location.hash='catalog';
  $('#catalog').scrollIntoView();
}
function searchResults() {
  const query=searchText.trim().toLocaleLowerCase();
  const items=goods.filter(p=>[p.name,p.color,p.type,pad(p.id)].some(v=>v.toLocaleLowerCase().includes(query)));
  $('#search-status').textContent=query ? `검색 결과 ${items.length}개` : '신상품';
  $('#search-results').innerHTML=(query?items:items.slice(0,4)).map(p=>`<a href="#product/${p.id}" class="search-result"><img src="${photo(p)}" alt=""><span>${pad(p.id)}. ${p.name}</span><span class="price">${won(p.price)}</span></a>`).join('') || '<p>다른 상품명이나 컬러로 검색해 보세요.</p>';
}
function menuPage() {
  return heading('MOTION LAYER / SS27','Menu') + '<nav class="menu-links"><a href="#catalog">Shop · 상품</a><a href="#series">Series · 룩북</a><a href="#about">About · 브랜드 소개</a><a href="#journal">Studio notes</a><a href="#account">My page</a><a href="#guide">고객 안내</a></nav>';
}
function drawerContent(page,id) {
  if(page==='menu')return menuPage();
  if(page==='search')return heading('MOTION LAYER / SHOP','Search')+'<label class="search-field"><span class="info-label">상품명 · 아이템 · 컬러</span><input id="search-box" type="search" autocomplete="off" placeholder="예: Shell, 차콜"></label><p id="search-status" class="fine" role="status"></p><div id="search-results"></div>';
  return content(page,id);
}
function renderRoute() {
  const hash=location.hash || '#home';
  const [page,id]=hash.slice(1).split('/');
  if(page==='product' && hash!==lastRoute && product(id)) ui.size=sizesFor(product(id))[0];
  const html=drawerContent(page,id);
  lastRoute=hash;
  if(!html) {
    if(drawer.open)drawer.close();
    baseHash=hash;
    const destination=document.getElementById(page);
    if(destination && location.hash)destination.scrollIntoView();
    return;
  }
  if(!drawer.open) { opener=document.activeElement; baseScroll=scrollY; }
  sheet.innerHTML=html;
  if(!drawer.open)drawer.showModal();
  drawer.scrollTop=0;
  if(page==='search') {
    $('#search-box').value=searchText;searchResults();$('#search-box').focus({preventScroll:true});
  } else $('#close').focus({preventScroll:true});
}
function closeDrawer() {
  if(!drawer.open)return;
  drawer.close();
  history.replaceState(null,'',baseHash);
  lastRoute=baseHash;
  window.scrollTo(0,baseScroll);
  if(opener?.isConnected)opener.focus({preventScroll:true});
}
function refreshOrder(focusKey) {
  const [page,id]=location.hash.slice(1).split('/');
  sheet.innerHTML=drawerContent(page,id);
  if(focusKey)sheet.querySelector(focusKey)?.focus({preventScroll:true});
}
$('#close').onclick=closeDrawer;
drawer.addEventListener('cancel',event=>{event.preventDefault();closeDrawer();});
drawer.addEventListener('click',event=>{if(event.target===drawer && event.clientX<drawer.getBoundingClientRect().left)closeDrawer();});
document.addEventListener('input',e=>{
  if(e.target.id==='search-box'){searchText=e.target.value;searchResults();}
});
document.addEventListener('change',e=>{
  const id=e.target.id;
  if(['type','color','sort'].includes(id))filter({[id]:e.target.value});
  if(id==='coupon'||id==='points'){ui[id]=e.target.checked;refreshOrder('#'+id);}
});
document.addEventListener('click',e=>{
  const seriesLink=e.target.closest('[data-series]');
  if(seriesLink){e.preventDefault();openSeriesGoods(seriesLink.dataset.series);return;}
  const b=e.target.closest('button');
  if(!b || b.disabled)return;
  const d=b.dataset;
  if('state' in d){filter({filterMood:d.state});return;}
  if(d.scope){filter({recent:d.scope==='new'});return;}
  if('clear' in d){filter(filterDefaults);return;}
  if('removeSeries' in d){filter({series:''});return;}
  if(d.collection){openSeriesGoods(d.collection);return;}
  if(b.id==='more'){
    const first=shown;shown+=pageSize;renderCatalog();
    if(e.detail===0)$('#cards').children[first]?.querySelector('a')?.focus();
    return;
  }
  if(d.quick){
    const p=product(d.quick);
    if(p.sold)return;
    if(sizesFor(p).length>1){location.hash='product/'+p.id;return;}
    ui.size=sizesFor(p)[0];if(add(p))location.hash='bag';
    return;
  }
  if(d.size||d.method){
    const key=d.size?'size':'method';ui[key]=d[key];
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
    return;
  }
  if(d.add && add(product(location.hash.split('/')[1])))location.hash=d.add==='buy'?'checkout':'bag';
  if(d.qty){
    const index=Number(d.row), line=memory.bag[index];
    if(line){line.qty+=Number(d.qty);if(!line.qty)memory.bag.splice(index,1);save();refreshOrder(`[data-row="${index}"][data-qty="${d.qty}"]`);}
  }
  if('order' in d)placeOrder();
});
$('#posts').innerHTML=posts.map((p,i)=>`<a href="#post/${i}"><img src="assets/${p.photo}.webp" alt="" loading="lazy"><span>${p.title}</span></a>`).join('');

const chapters=[...document.querySelectorAll('.chapter')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const seenPictures=new Set();
const reveals='IntersectionObserver' in window && 'animate' in Element.prototype
  ? new IntersectionObserver(entries=>{
    for(const {target,intersectionRatio} of entries){
      if(intersectionRatio<.22 || !target.isConnected)continue;
      reveals.unobserve(target);
      const owner=target.closest('article');
      const key=owner.dataset.id || owner.id;
      if(seenPictures.has(key))continue;
      seenPictures.add(key);
      if(!reduced.matches && !target.closest('a:focus-visible')) {
        target.animate([{clipPath:'inset(0 10% 12% 0)',opacity:.72},{clipPath:'inset(0)',opacity:1}],{duration:340,easing:'ease-out'});
      }
    }
  },{threshold:.22}) : null;
function watchPictures() {
  if(!reveals)return;
  reveals.disconnect();
  document.querySelectorAll('.photo-mask,.card-stage').forEach(stage=>{
    const owner=stage.closest('article');
    const key=owner.dataset.id || owner.id;
    if(seenPictures.has(key))return;
    const rect=stage.getBoundingClientRect();
    if(rect.bottom>0 && rect.top<innerHeight)seenPictures.add(key);
    else reveals.observe(stage);
  });
}
let frame=0;
function scrollEffects() {
  frame=0;
  $('.to-top').toggleAttribute('inert',scrollY<innerHeight*.65);
  if(reduced.matches)return;
  for(const chapter of chapters) {
    const rect=chapter.getBoundingClientRect();
    if(rect.bottom<0 || rect.top>innerHeight)continue;
    const phase=Math.max(-1,Math.min(1,(innerHeight/2-rect.top-rect.height/2)/((innerHeight+rect.height)/2)));
    chapter.style.setProperty('--drift',(phase*26).toFixed(2)+'px');
    chapter.style.setProperty('--inset-drift',(-phase*22).toFixed(2)+'px');
  }
}
function queueEffects(){if(!frame)frame=requestAnimationFrame(scrollEffects);}
window.addEventListener('scroll',queueEffects,{passive:true});
window.addEventListener('resize',queueEffects);
window.addEventListener('hashchange',renderRoute);
renderCatalog();save();renderRoute();queueEffects();
