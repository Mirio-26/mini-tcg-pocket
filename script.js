// script.js

// —— CONSTANTES & ÉTAT GLOBAL —— //
const API_BASE       = 'https://api.pokemontcg.io/v2';
let wallet           = parseFloat(localStorage.getItem('wallet')    || '100');
let collection       = JSON.parse(localStorage.getItem('col')       || '{}');
let cardInfo         = JSON.parse(localStorage.getItem('cardInfo')  || '{}');
let cardData         = JSON.parse(localStorage.getItem('cardData')  || '{}');
let openedSets       = JSON.parse(localStorage.getItem('openedSets')|| '[]');
let allCards         = [];
let currentSetIdx    = -1;

// —— UTILITAIRES —— //
function saveAll() {
  localStorage.setItem('wallet',     wallet.toFixed(2));
  localStorage.setItem('col',        JSON.stringify(collection));
  localStorage.setItem('cardInfo',   JSON.stringify(cardInfo));
  localStorage.setItem('cardData',   JSON.stringify(cardData));
  localStorage.setItem('openedSets', JSON.stringify(openedSets));
}
function updateWalletHeader() {
  document.getElementById('walletHeader').innerText = wallet.toFixed(2) + ' €';
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// —— SWITCH ENTRE ÉCRANS —— //
const SCREENS = ['screen1','screen2','screen3','screen4'];
function show(screenNum) {
  SCREENS.forEach((id, idx) => {
    document.getElementById(id)
      .classList.toggle('active', idx+1 === screenNum);
  });
}

// —— CHARGEMENT DES SETS AU LANCEMENT —— //
async function loadSets() {
  const container = document.getElementById('setsContainer');
  container.innerText = 'Chargement…';
  try {
    const res = await fetch(`${API_BASE}/sets?pageSize=250`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const { data } = await res.json();

    container.innerHTML = '';
    data.forEach(set => {
      const btn = document.createElement('div');
      btn.className = 'set-btn';
      btn.style.backgroundImage = `url(${set.images.logo})`;
      btn.title = set.name;

      // badge prix fixe
      const priceTag = document.createElement('div');
      priceTag.className = 'set-price';
      priceTag.innerText = '5 €';
      btn.appendChild(priceTag);

      btn.onclick = () => chooseSet(set);
      container.appendChild(btn);
    });

  } catch (e) {
    console.error(e);
    container.innerText = 'Erreur de chargement';
  }

  // flèches de scroll
  document.getElementById('prevBtn').onclick = () =>
    container.scrollBy({ left: -140, behavior: 'smooth' });
  document.getElementById('nextBtn').onclick = () =>
    container.scrollBy({ left:  140, behavior: 'smooth' });
}

// —— OUVERTURE DE BOOSTER —— //
async function chooseSet(set) {
  if (wallet < 5) {
    return alert("Portefeuille insuffisant pour ouvrir un booster (5 €).");
  }
  wallet -= 5;
  saveAll();
  updateWalletHeader();

  allCards = [];
  show(2);
  document.getElementById('currentSetName').innerText = set.name;

  // récupère toutes les cartes du set
  const res = await fetch(
    `${API_BASE}/cards?q=set.id:${set.id}&pageSize=250`,
    { cache: 'no-store' }
  );
  const { data } = await res.json();
  allCards = data;

  // stocke dans cardData
  data.forEach(c => cardData[c.id] = c.images.small);

  // mémorise le set ouvert
  let idx = openedSets.findIndex(s => s.id === set.id);
  const ids = data.map(c => c.id);
  if (idx >= 0) {
    openedSets[idx].ids = ids;
  } else {
    openedSets.push({ id: set.id, name: set.name, ids });
    idx = openedSets.length - 1;
  }
  currentSetIdx = idx;
  saveAll();

  // animation et ajout dans la collection
  const area = document.getElementById('openingArea');
  area.innerHTML = '';
  const pick = shuffle(allCards).slice(0, 5);
  pick.forEach((c, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.animationDelay = `${i*0.2}s`;
    area.appendChild(thumb);
    setTimeout(() => {
      thumb.style.backgroundImage = `url(${c.images.small})`;
      // incrémente le count dans la collection
      collection[c.id] = (collection[c.id]||0) + 1;
      saveAll();
    }, i * 400);
  });

  // après l'animation, passe au classeur
  setTimeout(() => {
    initCollection();
    show(3);
  }, 5 * 400 + 200);
}

// —— INITIALISATION & AFFICHAGE CLASSEUR —— //
function initCollection() {
  if (openedSets.length === 0) {
    currentSetIdx = -1;
  } else if (currentSetIdx < 0) {
    currentSetIdx = 0;
  }
  updateNavTitle();
  renderCollection();
}

function updateNavTitle() {
  const title = document.getElementById('collectionTitle');
  if (currentSetIdx < 0 || currentSetIdx >= openedSets.length) {
    title.innerText = '— Aucun set —';
  } else {
    title.innerText = openedSets[currentSetIdx].name;
  }
  document.getElementById('prevSet').disabled =
    currentSetIdx <= 0;
  document.getElementById('nextSet').disabled =
    currentSetIdx >= openedSets.length - 1;
}

function renderCollection() {
  const area = document.getElementById('collectionArea');
  area.innerHTML = '';
  if (currentSetIdx < 0) return;

  const ids = openedSets[currentSetIdx].ids;
  ids.forEach((cardId, idx) => {
    const cnt = collection[cardId] || 0;
    const cell = document.createElement('div');
    cell.className = 'col-item';

    if (cnt === 0) {
      cell.innerHTML = `<div class="placeholder">${String(idx+1).padStart(3,'0')}</div>`;
    } else {
      cell.innerHTML = `
        <img src="${cardData[cardId]}" data-id="${cardId}"/>
        <span>x${cnt}</span>
        <button class="delete-btn" data-id="${cardId}">×</button>
      `;
    }
    area.appendChild(cell);
  });

  attachCollectionHandlers();
}

function attachCollectionHandlers() {
  // zoom modal
  document.querySelectorAll('.col-item img').forEach(img=>{
    img.onclick = ()=>{
      document.getElementById('modalImg').src = img.src;
      document.getElementById('cardModal').style.display = 'flex';
    };
  });
  // suppression de carte
  document.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id;
      if (--collection[id] <= 0) delete collection[id];
      saveAll();
      renderCollection();
    };
  });
}

document.getElementById('cardModal').onclick = () => {
  document.getElementById('cardModal').style.display = 'none';
};

// navigation set
document.getElementById('prevSet').onclick = ()=>{
  if (currentSetIdx > 0) {
    currentSetIdx--;
    initCollection();
  }
};
document.getElementById('nextSet').onclick = ()=>{
  if (currentSetIdx < openedSets.length-1) {
    currentSetIdx++;
    initCollection();
  }
};

// —— TRADING —— //
function getPrice(rarity='') {
  const r = rarity.toLowerCase();
  if (r.includes('special') || r.includes('shiny')) return 20;
  if (r.includes('rare'))   return 10;
  if (r.includes('uncommon')) return 5;
  return 2;
}

let offers = [];
function generateOffers() {
  const ids = Object.keys(cardData);
  offers = [];
  for (let i = 0; i < 5; i++) {
    const id    = ids[Math.floor(Math.random()*ids.length)];
    const price = getPrice(cardData[id]&&cardData[id].rarity);
    offers.push({ id, price });
  }
}

function renderOffers() {
  const box = document.getElementById('offers');
  box.innerHTML = '';
  offers.forEach(o=>{
    const disabled = wallet < o.price ? 'disabled' : '';
    box.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[o.id]}"/>
        <div>${o.price} €</div>
        <button ${disabled} data-id="${o.id}" data-price="${o.price}">
          Acheter
        </button>
      </div>
    `);
  });
  box.querySelectorAll('button').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id;
      const p  = parseFloat(btn.dataset.price);
      wallet -= p;
      collection[id] = (collection[id]||0) + 1;
      saveAll();
      updateWalletHeader();
      initCollection();
      generateOffers();
      renderOffers();
    };
  });
}

function renderMyOffers() {
  const box = document.getElementById('myOffers');
  box.innerHTML = '';
  const mine = Object.keys(collection).filter(id=>collection[id]>0);
  if (mine.length === 0) {
    box.textContent = 'Aucune carte à vendre.';
    return;
  }
  mine.forEach(id=>{
    const price = getPrice(cardData[id]&&cardData[id].rarity);
    box.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[id]}"/>
        <div>${price} €</div>
        <button data-id="${id}" data-price="${price}">
          Vendre
        </button>
      </div>
    `);
  });
  box.querySelectorAll('#myOffers button').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id;
      const p  = parseFloat(btn.dataset.price);
      wallet += p;
      if (--collection[id] <= 0) delete collection[id];
      saveAll();
      updateWalletHeader();
      initCollection();
      renderMyOffers();
    };
  });
}

// —— NAVIGATION BASSE —— //
document.getElementById('goHome').onclick       = ()=> show(1);
document.getElementById('goCollection').onclick = ()=> { initCollection(); show(3); };
document.getElementById('goTrade').onclick      = ()=>{
  generateOffers(); renderOffers(); renderMyOffers();
  updateWalletHeader();
  show(4);
};

// —— DEMARRAGE —— //
document.addEventListener('DOMContentLoaded', async ()=>{
  updateWalletHeader();
  await loadSets();
  if (openedSets.length) {
    currentSetIdx = 0;
    initCollection();
  }
  // regen offres toutes les 5 min si on est sur trading
  setInterval(()=>{
    if (document.getElementById('screen4').classList.contains('active')) {
      generateOffers(); renderOffers();
    }
  }, 5 * 60 * 1000);
});
