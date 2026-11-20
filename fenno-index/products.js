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
  {id:8,img:13,name:'Still Cotton Tee',type:'상의',color:'샌드',hex:'#ad9d88',price:58000,moods:['rest','focus'],series:'grove',desc:'샌드 컬러의 얇은 반팔 티셔츠. 일상의 첫 레이어로 입습니다.',fabric:'면 100%',care:'뒤집어서 약하게 세탁해 주세요.'},
  {"id": 9, "img": 1, "name": "Harbor Smock", "type": "아우터", "color": "차콜", "hex": "#474644", "price": 149000, "moods": ["move", "focus"], "series": "grove", "desc": "바람을 막아 주는 여유로운 풀오버 셸.", "fabric": "나일론 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 10, "img": 2, "name": "Dock Cargo Pants", "type": "하의", "color": "차콜", "hex": "#4c4c48", "price": 156000, "moods": ["focus", "move"], "series": "coast", "desc": "도구를 넣기 편한 옆 주머니와 넓은 밑단.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 11, "img": 4, "name": "Trail Split Shorts", "type": "하의", "color": "올리브", "hex": "#62654c", "price": 92000, "moods": ["move"], "series": "grove", "desc": "보폭이 커질 때 옆선이 가볍게 벌어지는 쇼츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 12, "img": 5, "name": "Dune Nylon Hood", "type": "아우터", "color": "브라운", "hex": "#886744", "price": 178000, "moods": ["move"], "series": "grove", "desc": "후드와 몸판을 한 겹으로 이은 경량 재킷.", "fabric": "나일론 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 13, "img": 6, "name": "Dune Nylon Pants", "type": "하의", "color": "브라운", "hex": "#92704d", "price": 134000, "moods": ["rest", "move"], "series": "grove", "desc": "무릎에 여유를 둔 나일론 이지 팬츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 14, "img": 10, "name": "Loft Crew", "type": "상의", "color": "아이보리", "hex": "#ded5bc", "price": 98000, "moods": ["rest"], "series": "coast", "desc": "가볍게 공기를 머금는 부드러운 크루넥.", "fabric": "면 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요.", "sold": true},
  {"id": 15, "img": 11, "name": "Pebble Beanie", "type": "액세서리", "color": "아이보리", "hex": "#c7c5b6", "price": 42000, "moods": ["rest", "focus"], "series": "grove", "desc": "얕게 접어 쓰는 부드러운 니트 비니.", "fabric": "면 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 16, "img": 14, "name": "Night Base Crew", "type": "상의", "color": "네이비", "hex": "#343555", "price": 79000, "moods": ["focus"], "series": "coast", "desc": "몸에 가볍게 닿는 간결한 긴소매 레이어.", "fabric": "면 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 17, "img": 15, "name": "Sound Layer Hood", "type": "상의", "color": "네이비", "hex": "#35394c", "price": 112000, "moods": ["rest", "move"], "series": "coast", "desc": "목까지 포근하게 감싸는 베이스 후디.", "fabric": "면 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 18, "img": 16, "name": "Shore Zip Hood", "type": "아우터", "color": "샌드", "hex": "#aa9d89", "price": 148000, "moods": ["focus", "move"], "series": "coast", "desc": "짧은 지퍼로 목의 여밈을 조절하는 바람막이.", "fabric": "나일론 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 19, "img": 17, "name": "Reed Trail Tights", "type": "하의", "color": "올리브", "hex": "#565646", "price": 89000, "moods": ["move"], "series": "grove", "desc": "움직임에 따라 늘어나는 가벼운 트레일 타이츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 20, "img": 21, "name": "Offshore Shorts", "type": "하의", "color": "네이비", "hex": "#414854", "price": 94000, "moods": ["rest", "move"], "series": "coast", "desc": "젖은 뒤에도 가볍게 걸칠 수 있는 쇼츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 21, "img": 22, "name": "Range Wide Shorts", "type": "하의", "color": "네이비", "hex": "#282c34", "price": 108000, "moods": ["move"], "series": "grove", "desc": "폭이 넓은 다리와 큼직한 주머니를 더한 쇼츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 22, "img": 28, "name": "Ground Camp Cap", "type": "액세서리", "color": "브라운", "hex": "#443e36", "price": 48000, "moods": ["focus", "move"], "series": "grove", "desc": "낮은 챙이 얼굴을 감싸는 브라운 캠프 캡.", "fabric": "면 100%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요.", "sold": true},
  {"id": 23, "img": 31, "name": "Still Long Shorts", "type": "하의", "color": "차콜", "hex": "#59595e", "price": 102000, "moods": ["rest", "focus"], "series": "coast", "desc": "무릎을 덮는 길이와 느슨한 허리 밴드.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
  {"id": 24, "img": 37, "name": "Mist Wind Pants", "type": "하의", "color": "그레이", "hex": "#a3a3a4", "price": 128000, "moods": ["move", "focus"], "series": "coast", "desc": "얇은 원단을 겹쳐 바람을 막는 실버 그레이 팬츠.", "fabric": "나일론 90%, 폴리우레탄 10%", "care": "찬물로 손세탁 후 그늘에서 건조해 주세요."},
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
const ui = {filterMood:'', type:'전체', color:'전체', series:'', sort:'index', recent:false, size:'', coupon:false, points:false, method:'네이버페이'};
let memory = {bag:[],orders:[],points:1200,coupon:true};
try {
  const saved = JSON.parse(localStorage.getItem('fenno.index.demo.v2'));
  if (saved && Array.isArray(saved.bag) && Array.isArray(saved.orders)) memory = saved;
} catch {}
function save() {
  try { localStorage.setItem('fenno.index.demo.v2',JSON.stringify(memory)); } catch {}
  document.querySelectorAll('[data-bag-count]').forEach(el => { el.textContent = memory.bag.reduce((n,line) => n+line.qty,0); });
}
