import {productById,series,money,pad} from './catalog.js';

const dialog=document.getElementById('shop-dialog');
const body=document.getElementById('shop-body');
const context=document.getElementById('dialog-context');
const bagKey='motionlayer-index-bag';
let bag=[], route='', current=null, size='', slide=0, touchStart=null, reviewing=false;

function readBag(){
  try{
    const saved=JSON.parse(localStorage.getItem(bagKey)||'[]');
    if(!Array.isArray(saved))return [];
    return saved.filter(line=>{
      const item=productById.get(line?.id);
      return item&&!item.sold&&item.sizes.includes(line.size)&&Number.isInteger(line.qty)&&line.qty>=1&&line.qty<=20;
    });
  }catch{return []}
}
function updateCount(){
  const total=bag.reduce((n,l)=>n+l.qty,0);
  document.querySelectorAll('[data-bag-count]').forEach(el=>{el.textContent='('+pad(total)+')'});
}
function saveBag(){
  try{localStorage.setItem(bagKey,JSON.stringify(bag))}catch{}
  updateCount();
}
function loadRoute(hash,replace=false){
  const url=new URL(location.href);
  url.hash=hash;
  if(url.href!==location.href)history[replace?'replaceState':'pushState'](replace?history.state:{mlIndexOverlay:true},'',url);
  syncShop();
}
function dismiss(){
  if(history.state?.mlIndexOverlay){history.back();return}
  const url=new URL(location.href);
  url.hash='catalog';history.replaceState(null,'',url);
  syncShop();
}
function localGallery(item){
  const frames=[{id:item.id,label:'앞면'},{id:item.id+'-back',label:'뒷면'}];
  if(item.look)frames.push({id:item.look,label:'착용'});
  return frames;
}
function changeSlide(next){
  const frames=localGallery(current);
  slide=(next+frames.length)%frames.length;
  const img=body.querySelector('.detail-photo img'),frame=frames[slide];
  img.src='assets/'+frame.id+'.webp';
  img.alt=current.ko+' '+frame.label;
  img.classList.toggle('on-body',slide>1);
  body.querySelectorAll('[data-frame]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===slide)));
}
function sizeGuide(item){
  if(item.type==='accessory'){
    return item.id==='daily-sling'?'가로 28 · 세로 16 cm':'뒤 조절끈으로 둘레 조절 가능';
  }
  const bottom=item.type==='bottom';
  const head=bottom?['허리 단면','총장']:['가슴 단면','총장'];
  const length=item.id==='light-shorts'?38:bottom?96:65;
  return '<table><caption class="sr-only">시안용 예시 치수, 단위 센티미터</caption><thead><tr><th>Size</th><th>'+head[0]+'</th><th>'+head[1]+'</th></tr></thead><tbody>'+item.sizes.map((s,i)=>'<tr><td>'+s+'</td><td>'+((bottom?33:51)+i*2)+'</td><td>'+(length+i*2)+'</td></tr>').join('')+'</tbody></table>';
}
function renderProduct(item){
  current=item;size=item.sizes.length===1?item.sizes[0]:'';slide=0;
  const family=series.find(s=>s.id===item.series);
  context.textContent='NO. '+item.no+' / '+family.name.toUpperCase()+' SERIES';
  const frames=localGallery(item);
  body.innerHTML=`<article class="product-detail">
    <div class="detail-media"><div class="detail-photo"><img src="assets/${item.id}.webp" alt="${item.ko} 앞면" width="800" height="800"></div>
    <div class="gallery-controls" role="group" aria-label="상품 사진">${frames.map((f,i)=>`<button type="button" data-frame="${i}" aria-pressed="${i===0}">${f.label}</button>`).join('')}</div></div>
    <div class="detail-copy"><p class="detail-ko">${item.ko}</p><h2 id="dialog-title">${item.name}</h2>
    <p class="detail-price">${money(item.price)}</p><p class="detail-desc">${item.description}</p>
    <p class="detail-swatch"><i class="swatch" style="--swatch:${item.hex}" aria-hidden="true"></i><span class="mono">${item.color}</span></p>
    <div class="sizes" aria-label="사이즈">${item.sizes.map(s=>`<button type="button" data-size="${s}" aria-pressed="${size===s}" ${item.sold?'disabled':''}>${s}</button>`).join('')}</div>
    <p class="field-error" role="status" id="size-error"></p>
    <button class="action" type="button" data-add ${item.sold?'disabled':''}>${item.sold?'품절':'장바구니 담기'}</button>
    <details class="fold"><summary>사이즈 안내</summary>${sizeGuide(item)}<p>시안용 예시 치수입니다.</p></details>
    <details class="fold"><summary>소재와 세탁</summary><p>${item.care}</p><p>소재와 세탁 안내는 시안용 예시입니다.</p></details>
    <details class="fold"><summary>배송·교환·반품</summary><p>배송 일정과 교환 접수 방법은 정식 오픈 시 상품별로 안내합니다.</p></details></div></article>`;
}
function renderBag(){
  current=null;context.textContent='MOTION LAYER / BAG';
  const total=bag.reduce((sum,line)=>sum+productById.get(line.id).price*line.qty,0);
  const lines=bag.map((line,i)=>{
    const p=productById.get(line.id);
    return `<div class="bag-line"><img src="assets/${p.id}.webp" alt="${p.ko}" width="75" height="75">
      <div><strong>${p.name}</strong><span class="mono">${p.color} / ${line.size}</span>
      ${reviewing?`<div>수량 ${line.qty}</div>`:`<div class="qty"><button type="button" data-line="${i}" data-delta="-1" aria-label="${p.name} 수량 줄이기">−</button><span>${line.qty}</span><button type="button" data-line="${i}" data-delta="1" aria-label="${p.name} 수량 늘리기" ${line.qty>=20?'disabled':''}>+</button></div>`}</div>
      <div>${money(p.price*line.qty)}${reviewing?'':`<div><button type="button" class="bag-remove" data-remove="${i}">삭제</button></div>`}</div></div>`;
  }).join('');
  body.innerHTML=`<div class="panel-copy"><h2 id="dialog-title">${reviewing?'주문 미리보기':'Bag'}</h2>
    ${bag.length?lines+`<div class="bag-total"><span>상품 합계</span><strong>${money(total)}</strong></div>
    ${reviewing?'<fieldset class="pay-preview"><legend>결제 수단 미리보기</legend><label><input type="radio" name="payment" checked> 간편결제</label><label><input type="radio" name="payment"> 카드</label></fieldset><p class="quiet">디자인 시안에서 선택한 상품 내역입니다. 결제 전에 확인하는 화면입니다.</p>':''}
    <button type="button" class="action" data-review>${reviewing?'장바구니로':'주문 미리보기'}</button>`:
    '<p class="quiet">장바구니가 비어 있습니다.</p><button class="text-link" type="button" data-shop-close>상품 둘러보기</button>'}</div>`;
}
const sampleOrderItem=productById.get('everyday-tee');
const info={
  shipping:{name:'배송·교환·반품',html:'<details class="fold" open><summary>배송 안내</summary><p>배송비와 출고 예정일을 표시하는 공간입니다. 정식 오픈 시 확정된 기준을 안내합니다.</p></details><details class="fold"><summary>교환과 반품</summary><p>주문 내역에서 접수하는 절차와 회수 방법을 안내할 예정입니다.</p></details>'},
  faq:{name:'FAQ',html:'<details class="fold" open><summary>사이즈는 어디서 확인하나요?</summary><p>각 상품 상세의 사이즈 안내에서 예시 실측표를 볼 수 있습니다.</p></details><details class="fold"><summary>선택한 상태를 바꾸려면?</summary><p>상품 목록의 오늘의 상태를 다시 열거나 선택된 상태 옆 ×를 누르세요.</p></details>'},
  terms:{name:'이용약관',html:'<p class="quiet">정식 스토어 이용약관을 표시할 공간입니다. 현재는 디자인 시안입니다.</p>'},
  account:{name:'회원·주문',html:`
    <p class="quiet">회원 혜택과 주문 내역을 담은 디자인 예시입니다.</p>
    <dl class="account-overview">
      <div><dt>적립금</dt><dd>3,000 <small>P</small></dd></div>
      <div><dt>보유 쿠폰</dt><dd>1 <small>장</small></dd></div>
    </dl>
    <details class="fold"><summary>쿠폰 보기</summary><p>첫 구매 10% 할인 쿠폰</p></details>
    <section class="recent-order" aria-labelledby="order-heading">
      <div class="order-heading"><h3 id="order-heading">최근 주문</h3><span class="order-state">배송 준비 중</span></div>
      <div class="order-item">
        <img src="assets/${sampleOrderItem.id}.webp" alt="" width="72" height="72">
        <div><strong>${sampleOrderItem.ko}</strong><p>${sampleOrderItem.color} / M · 1개</p></div>
        <span>${money(sampleOrderItem.price)}</span>
      </div>
    </section>`}
};
export function syncShop(){
  const hash=location.hash.slice(1);
  const [kind,id]=hash.split('/');
  const item=kind==='item'?productById.get(id):null;
  if(!item&&kind!=='bag'&&!(kind==='info'&&Object.hasOwn(info,id))){
    if(dialog.open)dialog.close();
    route='';current=null;return;
  }
  if(hash===route&&dialog.open)return;
  route=hash;reviewing=false;
  document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close()});
  dialog.dataset.kind=item?'item':kind;
  if(item)renderProduct(item);
  else if(kind==='bag')renderBag();
  else{context.textContent='MOTION LAYER';body.innerHTML=`<div class="panel-copy"><h2 id="dialog-title">${info[id].name}</h2>${info[id].html}</div>`}
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#item/"],a[href="#bag"],a[href^="#info/"]');
  if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();loadRoute(link.hash);
});
dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
dialog.addEventListener('click',e=>{
  if(e.target===dialog){
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();
    return;
  }
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-dismiss')||b.hasAttribute('data-shop-close')){dismiss();return}
  if(b.hasAttribute('data-frame')){changeSlide(Number(b.dataset.frame));return}
  if(b.hasAttribute('data-size')){
    size=b.dataset.size;body.querySelectorAll('[data-size]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
    body.querySelector('#size-error').textContent='';return;
  }
  if(b.hasAttribute('data-add')){
    if(!current||current.sold)return;
    if(!size){body.querySelector('#size-error').textContent='사이즈를 선택해 주세요.';body.querySelector('[data-size]').focus();return}
    const line=bag.find(l=>l.id===current.id&&l.size===size);
    if(line?.qty>=20){body.querySelector('#size-error').textContent='한 옵션은 20개까지 담을 수 있습니다.';return}
    if(line)line.qty++;else bag.push({id:current.id,size,qty:1});
    saveBag();loadRoute('#bag',true);return;
  }
  if(b.hasAttribute('data-review')){reviewing=!reviewing;renderBag();dialog.scrollTop=0;return}
  if(b.hasAttribute('data-remove'))bag.splice(Number(b.dataset.remove),1);
  else if(b.hasAttribute('data-delta')){
    const i=Number(b.dataset.line),line=bag[i];if(!line)return;
    line.qty=Math.min(20,line.qty+Number(b.dataset.delta));if(line.qty<=0)bag.splice(i,1);
  }else return;
  saveBag();renderBag();
});
dialog.addEventListener('touchstart',e=>{touchStart=e.target.closest('.detail-photo')?[e.touches[0].clientX,e.touches[0].clientY]:null},{passive:true});
dialog.addEventListener('touchend',e=>{
  if(!touchStart||!current)return;
  const t=e.changedTouches[0],dx=t.clientX-touchStart[0],dy=t.clientY-touchStart[1];
  if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.3)changeSlide(slide+(dx<0?1:-1));
  touchStart=null;
},{passive:true});
dialog.addEventListener('touchcancel',()=>{touchStart=null});
window.addEventListener('storage',e=>{if(e.key===bagKey||e.key===null){bag=readBag();updateCount();if(dialog.open&&route==='bag')renderBag()}});
window.addEventListener('popstate',syncShop);window.addEventListener('hashchange',syncShop);
bag=readBag();updateCount();
