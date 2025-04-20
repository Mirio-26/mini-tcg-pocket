// --- CONFIGURATION ---
const API_KEY = ''; // vide, tu utilises l'API publique
const BASE_URL = 'https://api.pokemontcg.io/v2';
const STARTING_WALLET = 100;

// --- STATE ---
let currentSetIndex = 0;
let sets = [];
let collection = JSON.parse(localStorage.getItem('collection')||'{}');
let wallet = parseFloat(localStorage.getItem('wallet')||STARTING_WALLET);

// --- DOM ---
const el = {
  wallet: document.getElementById('wallet'),
  pageBoosters: document.getElementById('page-boosters'),
  pageCollection: document.getElementById('page-collection'),
  pageTrading: document.getElementById('page-trading'),
  setsContainer: document.getElementById('sets-container'),
  collectionContainer: document.getElementById('collection-container'),
  tradingContainer: document.getElementById('trading-container'),
  btnPrevSet: document.getElementById('prev-set'),
  btnNextSet: document.getElementById('next-set'),
  navHome: document.getElementById('nav-home'),
  navCollection: document.getElementById('nav-collection'),
  navTrading: document.getElementById('nav-trading'),
};

// --- UTIL ---
function saveState(){
  localStorage.setItem('collection', JSON.stringify(collection));
  localStorage.setItem('wallet', wallet);
}
function updateWallet(){
  el.wallet.textContent = wallet.toFixed(2)+' €';
  saveState();
}

// --- RENDER NAV ---
function showPage(page){
  el.pageBoosters.classList.add('hidden');
  el.pageCollection.classList.add('hidden');
  el.pageTrading.classList.add('hidden');
  el.navHome.classList.remove('active');
  el.navCollection.classList.remove('active');
  el.navTrading.classList.remove('active');

  if(page==='boosters'){
    el.pageBoosters.classList.remove('hidden');
    el.navHome.classList.add('active');
  }
  if(page==='collection'){
    el.pageCollection.classList.remove('hidden');
    el.navCollection.classList.add('active');
    renderCollection();
  }
  if(page==='trading'){
    el.pageTrading.classList.remove('hidden');
    el.navTrading.classList.add('active');
    renderTrading();
  }
}

// --- RENDER BOOSTERS ---
async function fetchSets(){
  const resp = await fetch(`${BASE_URL}/sets`);
  const data = await resp.json();
  sets = data.data;
  renderSets();
}
function renderSets(){
  el.setsContainer.innerHTML = '';
  sets.forEach((s,i)=>{
    const img = document.createElement('img');
    img.src = s.images.logo;
    img.style.width = '100px';
    img.style.margin = '0 .5rem';
    img.style.cursor = 'pointer';
    if(i===currentSetIndex) img.style.border = '2px solid #fff';
    img.addEventListener('click',()=>openBooster(i));
    el.setsContainer.append(img);
  });
}
function openBooster(idx){
  const set = sets[idx];
  if(wallet < 5) return alert("Pas assez d'argent");
  wallet -= 5; updateWallet();
  fetch(`${BASE_URL}/cards?q=set.id:${set.id}&pageSize=5`)
    .then(r=>r.json())
    .then(data=>{
      data.data.forEach(card=>{
        collection[card.id] = (collection[card.id]||0)+1;
      });
      saveState();
      showPage('collection');
    });
}
el.btnPrevSet.onclick = ()=>{
  currentSetIndex = (currentSetIndex-1+sets.length)%sets.length;
  renderSets();
};
el.btnNextSet.onclick = ()=>{
  currentSetIndex = (currentSetIndex+1)%sets.length;
  renderSets();
};

// --- RENDER COLLECTION ---
function renderCollection(){
  el.collectionContainer.innerHTML = '';
  // on affiche par set (filtrer collection par set si tu veux)
  Object.entries(collection).forEach(([id,count])=>{
    const cardEl = document.createElement('div');
    cardEl.style.position='relative';
    const img = document.createElement('img');
    img.src = `assets/cards/${id}.png`;
    img.style.width='120px';
    cardEl.append(img);
    const countEl = document.createElement('div');
    countEl.textContent = 'x'+count;
    countEl.style.position='absolute';
    countEl.style.bottom='4px';
    countEl.style.right='4px';
    countEl.style.background='lightgreen';
    countEl.style.borderRadius='50%';
    countEl.style.padding='2px 6px';
    cardEl.append(countEl);
    const del = document.createElement('button');
    del.textContent='✕';
    del.style.position='absolute';
    del.style.top='4px';
    del.style.right='4px';
    del.onclick=()=>{
      delete collection[id];
      renderCollection();
      saveState();
    };
    cardEl.append(del);
    el.collectionContainer.append(cardEl);
  });
}

// --- RENDER TRADING (placeholder) ---
function renderTrading(){
  el.tradingContainer.innerHTML = '<p>Trading à venir…</p>';
}

// --- BIND NAV ---
el.navHome.onclick       = ()=>showPage('boosters');
el.navCollection.onclick = ()=>showPage('collection');
el.navTrading.onclick    = ()=>showPage('trading');

// --- INIT ---
updateWallet();
showPage('boosters');
fetchSets();
