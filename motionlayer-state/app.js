'use strict';

const $ = selector => document.querySelector(selector);
const won = value => '₩' + value.toLocaleString('ko-KR');
const pad = value => String(value).padStart(2, '0');
const moods = {
  rest: ['느긋한 날', 'REST'],
  move: ['움직이는 날', 'MOVE'],
  focus: ['집중하는 날', 'FOCUS']
};
const series = [
  {id:'coast', name:'Coastline', title:'Between<br><i>tides.</i>', photo:'coast', alt:'바다를 바라보는 네이비 후디 차림의 모델', intro:'바다와 도시 사이, 가볍게 겹쳐 입는 옷.'},
  {id:'grove', name:'Grove', title:'Under<br><i>canopy.</i>', photo:'forest', alt:'숲속에서 후드를 쓴 모델의 옆모습', intro:'숲길의 서늘한 공기에 어울리는 부드러운 층.'}
];
const goods = [
  {id:1,img:18,name:'Drift Wind Shell',type:'아우터',color:'차콜',hex:'#4d4b45',price:168000,moods:['move','focus'],series:'coast',desc:'바닷바람이 드는 저녁에 꺼내 입는 후드 셸. 밑단 조임으로 품을 조절합니다.',fabric:'나일론 100%',care:'중성 세제로 단독 손세탁 후 그늘에서 말려 주세요.'},
  {id:2,img:7,name:'Current Tee',type:'상의',color:'네이비',hex:'#303047',price:58000,moods:['rest','focus'],series:'coast',desc:'조금 넓은 소매와 곧게 떨어지는 몸판을 가진 반팔 티셔츠.',fabric:'면 100%',care:'뒤집어서 찬물로 세탁해 주세요.'},
  {id:3,img:32,name:'Tide Easy Pants',type:'하의',color:'차콜',hex:'#585960',price:138000,moods:['rest','move'],series:'coast',desc:'넉넉한 바짓단과 편안한 허리로 움직임에 여유를 둔 팬츠.',fabric:'면 64%, 나일론 36%',care:'비슷한 색끼리 찬물로 세탁해 주세요.'},
  {id:4,img:20,name:'Arc Shoulder Bag',type:'액세서리',color:'아이보리',hex:'#dadccd',price:72000,moods:['move','focus'],series:'coast',desc:'몸에 붙는 짧은 스트랩과 부드러운 곡선이 특징인 숄더백.',fabric:'나일론 100%',care:'오염된 부분을 물에 적신 부드러운 천으로 닦아 주세요.'},
  {id:5,img:9,name:'Cove Layer Hood',type:'상의',color:'아이보리',hex:'#e2d9c7',price:118000,moods:['rest','focus'],series:'grove',desc:'목을 포근하게 감싸는 얇은 후드. 한 겹으로도 셸 안에도 편안합니다.',fabric:'면 92%, 폴리우레탄 8%',care:'세탁망에 넣어 약하게 세탁해 주세요.'},
  {id:6,img:3,name:'Track Draw Shorts',type:'하의',color:'올리브',hex:'#6e7358',price:88000,moods:['move'],series:'grove',desc:'간결한 실루엣에 기다란 조임끈을 더한 숲길용 쇼츠.',fabric:'나일론 94%, 폴리우레탄 6%',care:'단독 손세탁을 권장합니다.'},
  {id:7,img:24,name:'Signal Camp Cap',type:'액세서리',color:'오렌지',hex:'#c65426',price:48000,moods:['move'],series:'grove',sold:true,desc:'낮은 크라운과 선명한 색을 조합한 캠프 캡.',fabric:'면 100%',care:'챙의 모양을 살려 그늘에서 말려 주세요.'},
  {id:8,img:13,name:'Still Cotton Tee',type:'상의',color:'샌드',hex:'#ad9d88',price:58000,moods:['rest','focus'],series:'grove',desc:'샌드 컬러의 얇은 반팔 티셔츠. 일상의 첫 레이어로 입습니다.',fabric:'면 100%',care:'뒤집어서 약하게 세탁해 주세요.'}
];
const posts = [
  {photo:'coast',title:'바닷가에서 보낸 오후',text:'바람이 잠시 잦아든 사이, 옷의 등판에 잡힌 주름을 담았습니다.'},
  {photo:'knit',title:'원단 관찰 일지',text:'가까이서 보면 한 방향으로만 보이던 짜임에도 작은 높낮이가 있습니다.'},
  {photo:'studio',title:'스튜디오의 옷걸이',text:'다음 계절의 색을 고르며 옷걸이 사이에 약간의 간격을 두었습니다.'}
];
const types = ['전체','아우터','상의','하의','액세서리'];
const product = id => goods.find(p => p.id === Number(id));
const sizesFor = p => p.type === '액세서리' ? ['ONE'] : ['S','M','L'];
const photo = p => `assets/garment-${p.img}.webp`;
const heading = (eyebrow,title) => `<p class="kicker mono">${eyebrow}</p><h2 id="sheet-title" class="sheet-title">${title}</h2>`;
const pill = (value,label,active,attr) => `<button type="button" data-${attr}="${value}" aria-pressed="${active}">${label}</button>`;
const detail = (title,body) => `<details><summary>${title}</summary>${body}</details>`;
const ui = {frame:0,mood:'rest',filterMood:'',type:'전체',color:'전체',series:'',layout:'gallery',size:'',coupon:false,points:false,method:'네이버페이'};
let memory = {bag:[],orders:[],points:1200,coupon:true};
try {
  const saved = JSON.parse(localStorage.getItem('fenno.mock.v1'));
  if (saved && Array.isArray(saved.bag) && Array.isArray(saved.orders)) memory = saved;
} catch {}
function save() {
  try { localStorage.setItem('fenno.mock.v1',JSON.stringify(memory)); } catch {}
  $('#bag-count').textContent=memory.bag.reduce((n,line)=>n+line.qty,0);
}
function setMood(key) {
  ui.mood=key;
  $('.state-panel').dataset.mood=key;
  $('#state-index').textContent='S—'+pad(Object.keys(moods).indexOf(key)+1);
  $('#moods').innerHTML=Object.entries(moods).map(([id,[ko,en]])=>pill(id,`${ko}<span>${en}</span>`,id===key,'mood')).join('');
}
function frame(i) {
  ui.frame=(i+series.length)%series.length;
  const s=series[ui.frame];
  $('#cover').src=`assets/${s.photo}.webp`;
  $('#cover').alt=s.alt;
  $('#campaign-tag').textContent=`SERIES ${pad(ui.frame+1)} — ${s.name.toUpperCase()}`;
  $('#campaign-title').innerHTML=s.title;
  $('#campaign-intro').textContent=s.intro;
  $('#series-link').href='#series/'+s.id;
  $('#frame-count').textContent=pad(ui.frame+1)+' / '+pad(series.length);
}
function tile(p) {
  const status=p.sold?'품절':p.id<=4?'NEW':'';
  return `<a class="tile" href="#product/${p.id}"><div class="photo"><span class="number">Nº ${pad(p.id)}</span><span class="photo-state ${p.sold?'sold':''}">${status}</span><img src="${photo(p)}" alt="${p.color} ${p.name} 상품 사진" loading="lazy"></div><div class="product-line"><strong class="product-name">${p.name}</strong><span class="price">${won(p.price)}</span></div><div class="metadata"><i class="swatch" style="--color:${p.hex}"></i>${p.color}<span class="stock-inline">${status}</span></div></a>`;
}
function catalog() {
  const items=goods.filter(p=>(ui.type==='전체'||p.type===ui.type)&&(ui.color==='전체'||p.color===ui.color)&&(!ui.filterMood||p.moods.includes(ui.filterMood))&&(!ui.series||p.series===ui.series));
  $('#types').innerHTML=types.map(t=>pill(t,t,ui.type===t,'type')).join('');
  $('#color').value=ui.color;
  $('#total-count').textContent='('+pad(items.length)+')';
  $('#results-status').textContent=`상품 ${items.length}개`;
  $('#filter-note').innerHTML=[ui.filterMood&&['filterMood',moods[ui.filterMood][0]],ui.series&&['series',series.find(s=>s.id===ui.series).name]].filter(Boolean).map(([key,label])=>`<button class="filter-chip" data-clear="${key}" aria-label="${label} 필터 해제">${label} ×</button>`).join('');
  $('#products').classList.toggle('list',ui.layout==='list');
  $('#products').innerHTML=items.length?items.map(tile).join(''):'<div class="empty">선택한 조건의 상품이 없습니다. <button data-reset>필터 초기화</button></div>';
  document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layout===ui.layout));
}
function resetFilters(){Object.assign(ui,{type:'전체',color:'전체',filterMood:'',series:''});}
function showCatalog() {
  catalog();
  if(location.hash!=='#catalog') location.hash='catalog';
  else $('#catalog').scrollIntoView();
}
function selectSeries(id){resetFilters();ui.series=id;showCatalog();}
const sizeSpecs = {
  '아우터':[['총장','가슴 단면','소매'],[[66,58,60],[69,61,62],[72,64,64]]],
  '상의':[['총장','가슴 단면','어깨'],[[64,51,45],[67,54,47],[70,57,49]]],
  '하의':[['총장','허리 단면','밑단 단면'],[[97,32,22],[100,35,23],[103,38,24]]]
};
function measurement(p) {
  if(p.type==='액세서리') return p.id===4?'가로 31 · 세로 21 · 끈 길이 63 cm':'머리둘레 54–60 cm';
  const [labels,rows]=p.id===6?[['총장','허리 단면','밑단 단면'],[[38,32,29],[40,35,30],[42,38,31]]]:sizeSpecs[p.type];
  return `<table><caption>단면 실측 (cm)</caption><thead><tr><th>사이즈</th>${labels.map(v=>`<th>${v}</th>`).join('')}</tr></thead><tbody>${rows.map((row,i)=>`<tr><th>${sizesFor(p)[i]}</th>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function productPage(p) {
  const sizes=sizesFor(p);
  return heading(`PRODUCT Nº ${pad(p.id)} / ${p.type}`,p.name)+`<div class="detail-photo"><img src="${photo(p)}" alt="${p.color} ${p.name}"></div><div class="summary-line"><span><i class="swatch" style="--color:${p.hex}"></i> ${p.color}</span><strong class="detail-price">${won(p.price)}</strong></div><p class="sheet-intro">${p.desc}</p><span class="info-label">사이즈</span><div class="sizes">${sizes.map(s=>pill(s,s,s===ui.size,'size')).join('')}</div><div class="actions"><button class="secondary" data-add="bag" ${p.sold?'disabled':''}>${p.sold?'품절':'장바구니 담기'}</button><button class="primary" data-add="buy" ${p.sold?'disabled':''}>바로 구매</button></div>${detail('사이즈표',measurement(p))}${detail('소재 · 세탁 정보',`<p>${p.fabric}<br>${p.care}</p>`)}`;
}
function add(p) {
  if(!p || p.sold || !sizesFor(p).includes(ui.size)) return false;
  const row=memory.bag.find(line=>line.id===p.id&&line.size===ui.size);
  if(row) row.qty+=1; else memory.bag.push({id:p.id,size:ui.size,qty:1});
  save();return true;
}
function bagRows() {
  return memory.bag.map((line,i)=>{
    const p=product(line.id);
    return `<div class="bag-row"><img src="${photo(p)}" alt=""><div><strong>${p.name}</strong><small>${p.color} / ${line.size} · ${won(p.price)}</small></div><div class="stepper"><button data-qty="-1" data-row="${i}" aria-label="${p.name} 수량 줄이기">−</button>${line.qty}<button data-qty="1" data-row="${i}" aria-label="${p.name} 수량 늘리기">+</button></div></div>`;
  }).join('');
}
function totals() {
  const subtotal=memory.bag.reduce((n,l)=>n+product(l.id).price*l.qty,0);
  const discount=ui.coupon&&memory.coupon?Math.floor(subtotal*.05):0;
  const points=ui.points?Math.min(memory.points,subtotal-discount):0;
  return {subtotal,discount,points,total:subtotal-discount-points};
}
function bag() {
  return heading('SHOPPING BAG','장바구니')+(memory.bag.length?bagRows()+`<div class="summary-line"><span>상품 합계</span><strong>${won(totals().subtotal)}</strong></div><a href="#checkout" class="primary wfull">주문하기</a>`:'<p>아직 담은 상품이 없습니다.</p><a href="#catalog" class="secondary">상품 둘러보기</a>');
}
function checkout() {
  if(!memory.bag.length)return bag();
  const t=totals();
  return heading('CHECKOUT / DEMO','주문 · 결제')+`<p class="fine">시안용 모의 주문입니다. 실제 결제와 배송은 발생하지 않습니다.</p>${memory.bag.map(l=>`<div class="summary-line"><span>${product(l.id).name} / ${l.size} × ${l.qty}</span><span>${won(product(l.id).price*l.qty)}</span></div>`).join('')}<label class="choice"><input type="checkbox" id="coupon" ${ui.coupon&&memory.coupon?'checked':''} ${!memory.coupon?'disabled':''}> 첫 구매 쿠폰 5% ${memory.coupon?'':'(사용 완료)'}</label><label class="choice"><input id="points" type="checkbox" ${ui.points?'checked':''} ${memory.points?'':'disabled'}> 보유 적립금 ${won(memory.points)} 사용</label><span class="info-label">간편결제 수단</span><div class="sizes">${['네이버페이','카카오페이'].map(m=>pill(m,m,ui.method===m,'method')).join('')}</div><div class="summary-line"><span>총 결제 금액</span><strong>${won(t.total)}</strong></div><button class="primary wfull" data-order>모의 주문 완료</button>`;
}
function placeOrder() {
  if(!memory.bag.length)return;
  const t=totals(), earn=Math.floor(t.total*.01);
  const id='FN-'+String(Date.now()).slice(-10);
  memory.orders.unshift({id,items:memory.bag.map(l=>({...l})),total:t.total,method:ui.method,earn});
  memory.bag=[];memory.points+=earn-t.points;
  if(t.discount)memory.coupon=false;
  ui.coupon=false;ui.points=false;save();location.hash='order/'+id;
}
function account() {
  return heading('MY PAGE / DEMO','마이페이지')+`<p class="fine">이 브라우저에 저장된 시안용 회원 내역입니다.</p><div class="account-stat">적립금 <strong>${won(memory.points)}</strong></div><div class="account-stat">첫 구매 쿠폰 <strong>${memory.coupon?'5% · 1장':'사용 완료'}</strong></div><h3>주문 조회</h3>${memory.orders.length?memory.orders.map(o=>`<a class="summary-line" href="#order/${o.id}"><span>${o.id} · 주문 접수</span><strong>${won(o.total)} ›</strong></a>`).join(''):'<p>아직 주문 내역이 없습니다.</p>'}`;
}
function receipt(id) {
  const o=memory.orders.find(o=>o.id===id);
  if(!o)return account();
  return heading('ORDER / DEMO','주문이 접수됐습니다.')+`<p class="mono">${o.id}</p>${o.items.map(l=>`<div class="summary-line">${product(l.id).name}<span>${l.size} × ${l.qty}</span></div>`).join('')}<div class="summary-line">${o.method} · 모의 결제<strong>${won(o.total)}</strong></div><p class="fine">이번 주문의 적립금 ${won(o.earn)}</p><a class="secondary" href="#account">주문 내역 보기</a>`;
}
function seriesPage(id) {
  const s=series.find(s=>s.id===id);
  if(!s)return heading('COLLECTIONS','Series')+series.map((s,i)=>`<a class="series-card" href="#series/${s.id}"><img class="cover-small" src="assets/${s.photo}.webp" alt="${s.alt}"><strong>${pad(i+1)} / ${s.name}</strong>${s.intro}</a>`).join('');
  return heading('SERIES '+pad(series.indexOf(s)+1),s.name)+`<img class="cover-small" src="assets/${s.photo}.webp" alt="${s.alt}"><p>${s.intro}</p><button class="primary wfull" data-collection="${s.id}">시리즈 상품 ${goods.filter(p=>p.series===s.id).length}개 보기</button>`;
}
function guide() {
  return heading('CUSTOMER CARE','고객 안내')+detail('배송 안내','<p>주문 후 마이페이지에서 접수 상태를 확인할 수 있습니다. 배송비와 출고 일정은 정식 오픈 시 안내합니다.</p>')+detail('교환 · 반품','<p>주문 내역에서 상품과 사이즈를 확인해 주세요. 정식 오픈 시 접수 창구, 회수 방법과 처리 일정을 안내합니다.</p>')+detail('FAQ · 사이즈를 어떻게 고르나요?','<p>상품 상세의 사이즈표를 펼쳐 평소 입는 옷의 단면 실측과 비교해 보세요.</p>')+detail('FAQ · 쿠폰과 적립금을 함께 쓸 수 있나요?','<p>시안에서는 주문 단계에서 첫 구매 쿠폰과 보유 적립금을 함께 적용할 수 있습니다.</p>')+'<a class="secondary" href="#terms">이용약관 보기</a>';
}
function content(route,id) {
  switch(route) {
    case 'product': return product(id)?productPage(product(id)):null;
    case 'series': return seriesPage(id);
    case 'bag': return bag();
    case 'checkout': return checkout();
    case 'order': return receipt(id);
    case 'account': return account();
    case 'about': return heading('ABOUT MOTION LAYER','오늘을 찍는 점.')+'<div class="story-dot" aria-hidden="true"></div><p class="sheet-intro">모션레이어는 그날의 몸과 기분에서 옷을 고르는 브랜드입니다. 걷고 싶은 날에는 가벼운 셸을, 오래 머무는 날에는 부드러운 면 한 겹을 제안합니다.</p><h3>이름 끝의 점</h3><p class="sheet-intro">작은 파란 점은 지금 내가 있는 자리입니다. 상태를 고르면 첫 화면의 점도 자리를 옮깁니다. 계절과 하루 사이에서 바뀌는 감각을 점 하나에 기록합니다.</p>';
    case 'guide': return guide();
    case 'terms': return heading('SHOP POLICY / PREVIEW','이용약관')+'<p class="sheet-intro">현재는 스토어 시안입니다. 상품과 가격은 예시이며, 주문 내역은 사용 중인 브라우저에 저장됩니다. 실제 판매에 적용할 구매·결제, 취소·환불 및 회원 이용 조건은 정식 오픈 전에 게시합니다.</p><a href="#guide" class="secondary">고객 안내</a>';
    case 'post': {
      const post=posts[Number(id)];
      return post?heading('STUDIO NOTES / FEED PREVIEW',post.title)+`<img class="cover-small" src="assets/${post.photo}.webp" alt="${post.title}"><p>${post.text}</p>`:null;
    }
    default:return null;
  }
}
const dialog=$('#sheet');
let opener=null, returnHash='#home', currentRoute='';
function route() {
  const hash=location.hash||'#home';
  const [page,id]=hash.slice(1).split('/');
  if(page==='product'&&product(id)&&currentRoute!==hash)ui.size=sizesFor(product(id))[0];
  currentRoute=hash;
  const html=content(page,id);
  if(!html){
    const wasOpen=dialog.open;
    if(wasOpen)dialog.close();
    if(wasOpen&&hash===returnHash)opener?.focus({preventScroll:true});
    else if(page==='catalog')$('#catalog').scrollIntoView();
    else if(page==='home')window.scrollTo({top:0});
    return;
  }
  if(!dialog.open) {
    opener=document.activeElement;
    returnHash=opener?.closest('#catalog')||window.scrollY>$('.hero').offsetHeight?'#catalog':'#home';
  }
  $('#sheet-content').innerHTML=html;
  dialog.scrollTop=0;
  if(!dialog.open)dialog.showModal();
  $('#close').focus({preventScroll:true});
}
function refreshSheet() {
  const active=document.activeElement, id=active?.id;
  const [page,param]=location.hash.slice(1).split('/');
  $('#sheet-content').innerHTML=content(page,param);
  if(id)document.getElementById(id)?.focus({preventScroll:true});
}
function closeSheet(){location.hash=returnHash;}
$('#color').innerHTML=['전체',...new Set(goods.map(p=>p.color))].map(c=>`<option>${c}</option>`).join('');
$('#posts').innerHTML=posts.map((p,i)=>`<a href="#post/${i}"><img src="assets/${p.photo}.webp" alt="${p.title}" loading="lazy"><span>${p.title}</span></a>`).join('');
$('#prev').onclick=()=>frame(ui.frame-1);
$('#next').onclick=()=>frame(ui.frame+1);
$('#recommend').onclick=()=>{resetFilters();ui.filterMood=ui.mood;showCatalog();};
$('#close').onclick=closeSheet;
dialog.addEventListener('cancel',e=>{e.preventDefault();closeSheet();});
dialog.addEventListener('click',e=>{if(e.target===dialog&&e.clientX<dialog.getBoundingClientRect().left)closeSheet();});
$('#color').onchange=e=>{ui.color=e.target.value;catalog();};
document.addEventListener('change',e=>{
  if(e.target.id==='coupon'||e.target.id==='points'){ui[e.target.id]=e.target.checked;refreshSheet();}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b || b.disabled)return;
  const d=b.dataset;
  if(d.mood){setMood(d.mood);$('#moods [aria-pressed="true"]').focus({preventScroll:true});}
  if(d.type){ui.type=d.type;catalog();$('#types [aria-pressed="true"]').focus({preventScroll:true});}
  if(d.layout){ui.layout=d.layout;catalog();}
  if(d.clear){ui[d.clear]='';catalog();}
  if('reset' in d){resetFilters();catalog();}
  if(d.collection)selectSeries(d.collection);
  if(d.size||d.method){
    const field=d.size?'size':'method';
    ui[field]=d[field];
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  }
  if(d.add){
    const p=product(location.hash.split('/')[1]);
    if(add(p))location.hash=d.add==='buy'?'checkout':'bag';
  }
  if(d.qty){
    const line=memory.bag[Number(d.row)];
    if(line){line.qty+=Number(d.qty);if(!line.qty)memory.bag.splice(Number(d.row),1);save();refreshSheet();}
  }
  if('order' in d)placeOrder();
});
// Shop in the header always reopens the complete catalogue.
$('.site-head nav a[href="#catalog"]').addEventListener('click',()=>{resetFilters();catalog();$('#catalog').scrollIntoView();});
window.addEventListener('hashchange',route);
setMood('rest');frame(0);catalog();save();route();
