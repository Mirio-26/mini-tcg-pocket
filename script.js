// script.js

// —— CONSTANTES & ÉTAT GLOBAL —— //
const API_BASE    = 'https://api.pokemontcg.io/v2';
let wallet        = parseFloat(localStorage.getItem('wallet')    || '100');
let collection    = JSON.parse(localStorage.getItem('col')       || '{}');
let cardInfo      = JSON.parse(localStorage.getItem('cardInfo')  || '{}');
let openedSets    = JSON.parse(localStorage.getItem('openedSets')|| '[]');
let allCards      = [];
let currentSetIdx = -1;

// —— UTILITAIRES —— //
function saveAll() {
  localStorage.setItem('wallet',    wallet.toFixed(2));
  localStorage.setItem('col',       JSON.stringify(collection));
  localStorage.setItem('cardInfo',  JSON.stringify(cardInfo));
  localStorage.setItem('openedSets',JSON.stringify(openedSets));
}
function updateWalletDisplays() {
  document.getElementById('walletHeader').innerText = wallet.toFixed(2) + ' €';
  document.getElementById('walletAmount').innerText = wallet.toFixed(2) + ' €';
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
      .classList.toggle('active', idx + 1 === screenNum);
  });
}

// —— CHARGEMENT DES SETS —— //
async function loadSets() {
  const container = document.getElementById('setsContainer');
  container.innerText = 'Chargement…';
  try {
    const res = await fetch(`${API_BASE}/sets?pageSize=250`, { cache: 'no-store' });
    const { data } = await res.json();
    container.innerHTML = '';
    data.forEach(set => {
      const btn = document.createElement('div');
      btn.className = 'set-btn';
      btn.style.backgroundImage = `url(${set.images.logo})`;
      btn.title = set.name;
      const priceTag = document.createElement('div');
      priceTag.className = 'set-price';
      priceTag.innerText = '5 €';
      btn.appendChild(priceTag);
      btn.onclick = () => chooseSet(set);
      container.appendChild(btn);
    });
  } catch (e) {
    container.innerText = 'Erreur de chargement';
  }
  document.getElementById('prevBtn').onclick = () =>
    container.scrollBy({ left: -140, behavior: 'smooth' });
  document.getElementById('nextBtn').onclick = () =>
    container.scrollBy({ left:  140, behavior: 'smooth' });
}

// —— OUVERTURE DE BOOSTER —— //
async function chooseSet(set) {
  if (wallet < 5) { alert('Portefeuille insuffisant (5 €).'); return; }
  wallet -= 5; saveAll(); updateWalletDisplays();

  show(2);
  document.getElementById('currentSetName').innerText = set.name;

  const res = await fetch(
    `${API_BASE}/cards?q=set.id:${set.id}&pageSize=250`,
    { cache: 'no-store' }
  );
  const { data } = await res.json();
  allCards = data;

  // stocke les images pour le classeur et le trading
  data.forEach(c => {
    cardInfo[c.id] = c.images.small;
  });
  saveAll();

  let idx = openedSets.findIndex(s => s.id === set.id);
  const ids = data.map(c => c.id);
  if (idx === -1) {
    openedSets.push({ id: set.id, name: set.name, ids });
    idx = openedSets.length - 1;
  } else {
    openedSets[idx].ids = ids;
  }
  currentSetIdx = idx;
  saveAll();

  openPack();
}

function openPack() {
  const area = document.getElementById('openingArea');
  area.innerHTML = '';
  const pick = shuffle(allCards).slice(0,5);
  pick.forEach((c, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.animationDelay = `${i * 0.2}s`;
    area.appendChild(thumb);
    setTimeout(() => {
      thumb.style.backgroundImage = `url(${c.images.small})`;
      collection[c.id] = (collection[c.id] || 0) + 1;
      saveAll();
    }, i * 400);
  });
  setTimeout(() => {
    initCollection();
    show(3);
  }, 5 * 400 + 200);
}

// —— CLASSEUR —— //
function initCollection() {
  if (!openedSets.length) {
    renderEmptyCollection();
    return;
  }
  if (currentSetIdx < 0) currentSetIdx = 0;
  updateNavTitle();
  renderCollection();
}
function renderEmptyCollection() {
  const area = document.getElementById('collectionArea');
  area.innerHTML = '<div class="placeholder">Ouvre un booster !</div>';
}
function updateNavTitle() {
  const title = document.getElementById('collectionTitle');
  title.innerText = openedSets.length
    ? openedSets[currentSetIdx].name
    : '— Aucun set —';
  document.getElementById('prevSet').disabled = currentSetIdx <= 0;
  document.getElementById('nextSet').disabled = currentSetIdx >= openedSets.length - 1;
}
function renderCollection() {
  const area = document.getElementById('collectionArea');
  area.innerHTML = '';
  const ids = openedSets[currentSetIdx].ids;
  ids.forEach((id, idx) => {
    const cnt = collection[id] || 0;
    const cell = document.createElement('div');
    cell.className = 'col-item';
    if (!cnt) {
      cell.innerHTML = `<div class="placeholder">${String(idx+1).padStart(3,'0')}</div>`;
    } else {
      cell.innerHTML = `
        <img src="${cardInfo[id]}" data-id="${id}"/>
        <span>x${cnt}</span>
        <button class="delete-btn" data-id="${id}">×</button>
      `;
    }
    area.appendChild(cell);
  });
  document.querySelectorAll('.col-item img').forEach(img => {
    img.onclick = () => {
      document.getElementById('modalImg').src = img.src;
      document.getElementById('cardModal').style.display = 'flex';
    };
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
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
document.getElementById('prevSet').onclick = () => {
  if (currentSetIdx > 0) { currentSetIdx--; initCollection(); }
};
document.getElementById('nextSet').onclick = () => {
  if (currentSetIdx < openedSets.length - 1) { currentSetIdx++; initCollection(); }
};

// —— TRADING —— //
function getPrice(rarity = '') {
  const r = rarity.toLowerCase();
  if (r.includes('special') || r.includes('shiny')) return 20;
  if (r.includes('rare'))   return 10;
  if (r.includes('uncommon')) return 5;
  return 2;
}
let offers = [];
function generateOffers() {
  const ids = Object.keys(cardInfo);
  offers = [];
  for (let i = 0; i < 5; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    offers.push({ id, price: getPrice(cardInfo[id] && cardInfo[id].rarity || '') });
  }
}
function renderOffers() {
  const box = document.getElementById('offers');
  box.innerHTML = '';
  offers.forEach(o => {
    const disabled = wallet < o.price ? 'disabled' : '';
    box.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardInfo[o.id]}"/>
        <div class="price">${o.price} €</div>
        <button ${disabled} data-id="${o.id}" data-price="${o.price}">Acheter</button>
      </div>
    `);
  });
  box.querySelectorAll('.trade-card button').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id, p = parseFloat(btn.dataset.price);
      wallet -= p; collection[id] = (collection[id] || 0) + 1;
      saveAll(); updateWalletDisplays(); initCollection();
      generateOffers(); renderOffers();
    };
  });
}
function renderMyOffers() {
  const box = document.getElementById('myOffers');
  box.innerHTML = '';
  const mine = Object.keys(collection).filter(id => collection[id] > 0);
  if (!mine.length) {
    box.textContent = 'Aucune carte à vendre.';
    return;
  }
  mine.forEach(id => {
    const price = getPrice(cardInfo[id] && cardInfo[id].rarity || '');
    box.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardInfo[id]}"/>
        <div class="price">${price} €</div>
        <button data-id="${id}" data-price="${price}">Vendre</button>
      </div>
    `);
  });
  box.querySelectorAll('#myOffers button').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id, p = parseFloat(btn.dataset.price);
      wallet += p; if (--collection[id] <= 0) delete collection[id];
      saveAll(); updateWalletDisplays(); initCollection(); renderMyOffers();
    };
  });
}

// —— NAVIGATION BASSE —— //
document.getElementById('goHome').onclick       = () => show(1);
document.getElementById('goCollection').onclick = () => { initCollection(); show(3); };
document.getElementById('goTrade').onclick      = () => {
  generateOffers(); renderOffers(); renderMyOffers();
  updateWalletDisplays(); show(4);
};

// —— DÉMARRAGE —— //
document.addEventListener('DOMContentLoaded', async () => {
  updateWalletDisplays();
  await loadSets();
  if (openedSets.length) {
    currentSetIdx = 0;
    initCollection();
  }
  setInterval(() => {
    if (document.getElementById('screen4').classList.contains('active')) {
      generateOffers(); renderOffers();
    }
  }, 5 * 60 * 1000);
});
