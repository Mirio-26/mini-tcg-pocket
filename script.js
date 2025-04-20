// ==============================
// script.js
// ==============================

// 0) Enregistrement du Service Worker (PWA offline + installable)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker enregistré'))
    .catch(err => console.error('Erreur SW :', err));
}

// 1) Bascule entre les écrans 1–4
function show(screenNum) {
  ['screen1','screen2','screen3','screen4'].forEach((id, idx) => {
    document.getElementById(id)
      .classList.toggle('active', idx + 1 === screenNum);
  });
}

// 2) Portefeuille dans le header
let wallet = parseFloat(localStorage.getItem('wallet') || '100');
function updateWalletHeader() {
  document.getElementById('walletHeader')
    .innerText = wallet.toFixed(2) + ' €';
}

// 3) Données globales
let collection    = JSON.parse(localStorage.getItem('col')       || '{}');
let cardInfo      = JSON.parse(localStorage.getItem('cardInfo')  || '{}');
let cardData      = JSON.parse(localStorage.getItem('cardData')  || '{}');
let openedSets    = JSON.parse(localStorage.getItem('openedSets')|| '[]');
let allCards      = [];
let currentSetId  = null;
let currentSetIdx = -1;

// 4) Chargement des sets (fetch no-store)
async function loadSets() {
  const container = document.getElementById('setsContainer');
  container.innerText = 'Chargement…';
  try {
    const res = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=250', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { data } = await res.json();
    container.innerHTML = '';
    data.forEach(s => {
      const btn = document.createElement('div');
      btn.className = 'set-btn';
      const url = s.images.logo || s.images.symbol || 'assets/card_back.png';
      btn.style.backgroundImage = `url(${url})`;

      // badge 5€ sur chaque booster
      const priceTag = document.createElement('div');
      priceTag.className = 'set-price';
      priceTag.innerText = '5 €';
      btn.appendChild(priceTag);

      btn.title = s.name;
      btn.onclick = () => chooseSet(s.id, s.name);
      container.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
    container.innerText = 'Erreur de chargement';
  }
  // flèches du carrousel
  document.getElementById('prevBtn').onclick = () =>
    container.scrollBy({ left: -140, behavior: 'smooth' });
  document.getElementById('nextBtn').onclick = () =>
    container.scrollBy({ left:  140, behavior: 'smooth' });
}

// 5) Choix d’un set + déduction 5€
async function chooseSet(setId, name) {
  if (wallet < 5) {
    return alert('Portefeuille insuffisant pour ouvrir un booster (5 €).');
  }
  wallet -= 5;
  localStorage.setItem('wallet', wallet);
  updateWalletHeader();

  currentSetId = setId;
  show(2);
  document.getElementById('currentSetName').innerText = name;

  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`,
    { cache: 'no-store' }
  );
  const { data } = await res.json();
  allCards = data;

  // stocke l'objet complet pour le trading
  data.forEach(c => cardData[c.id] = c);
  localStorage.setItem('cardData', JSON.stringify(cardData));

  // memorise le set et ses IDs
  const ids = data.map(c => c.id);
  let idx = openedSets.findIndex(s => s.id === setId);
  if (idx >= 0) {
    openedSets[idx].ids = ids;
  } else {
    openedSets.push({ id: setId, name, ids });
    idx = openedSets.length - 1;
  }
  currentSetIdx = idx;
  localStorage.setItem('openedSets', JSON.stringify(openedSets));

  openPack();
}

// 6) Animation ouverture + mise à jour collection
function openPack() {
  const area = document.getElementById('openingArea');
  area.innerHTML = '';
  const draw = shuffle(allCards).slice(0, 6);

  draw.forEach((c, i) => {
    const img = document.createElement('img');
    img.className = 'card-thumb';
    img.style.animationDelay = `${i * 0.2}s`;
    area.appendChild(img);
    setTimeout(() => {
      img.src = c.images.small;
      cardInfo[c.id] = c.images.small;
    }, i * 400);
  });

  setTimeout(() => {
    draw.forEach(c => {
      collection[c.id] = (collection[c.id] || 0) + 1;
    });
    localStorage.setItem('col', JSON.stringify(collection));
    localStorage.setItem('cardInfo', JSON.stringify(cardInfo));
    initCollection();
    show(3);
  }, 6 * 400 + 200);
}

// 7) Initialisation et affichage du classeur
function initCollection() {
  if (openedSets.length && currentSetIdx < 0) currentSetIdx = 0;
  updateNavTitle();
  renderCollection();
}
function updateNavTitle() {
  const t = document.getElementById('collectionTitle');
  if (currentSetIdx < 0 || currentSetIdx >= openedSets.length) {
    t.innerText = '— Aucun set —';
  } else {
    t.innerText = openedSets[currentSetIdx].name;
  }
  document.getElementById('prevSet').disabled = currentSetIdx <= 0;
  document.getElementById('nextSet').disabled = currentSetIdx >= openedSets.length - 1;
}
function renderCollection() {
  const ids = (openedSets[currentSetIdx] || { ids: [] }).ids;
  const area = document.getElementById('collectionArea');
  area.innerHTML = '';
  ids.forEach((cardId, idx) => {
    const cnt = collection[cardId] || 0;
    if (cnt > 0) appendCard(cardId, cnt, area);
    else {
      const div = document.createElement('div');
      div.className = 'col-item';
      div.innerHTML = `<div class="placeholder">${String(idx+1).padStart(3,'0')}</div>`;
      area.appendChild(div);
    }
  });
  attachHandlers();
}
function appendCard(id, cnt, container) {
  const d = document.createElement('div');
  d.className = 'col-item';
  d.innerHTML = `
    <img src="${cardInfo[id]}" data-id="${id}">
    <span>x${cnt}</span>
    <button class="delete-btn" data-id="${id}">×</button>
  `;
  container.appendChild(d);
}
function attachHandlers() {
  document.querySelectorAll('.col-item img').forEach(img => {
    img.onclick = () => {
      document.getElementById('modalImg').src = img.src;
      document.getElementById('cardModal').style.display = 'flex';
    };
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (--collection[id] <= 0) {
        delete collection[id];
        delete cardInfo[id];
      }
      localStorage.setItem('col', JSON.stringify(collection));
      localStorage.setItem('cardInfo', JSON.stringify(cardInfo));
      renderCollection();
    };
  });
}
document.getElementById('cardModal').onclick = () =>
  document.getElementById('cardModal').style.display = 'none';
document.getElementById('prevSet').onclick = () => {
  if (currentSetIdx > 0) { currentSetIdx--; initCollection(); }
};
document.getElementById('nextSet').onclick = () => {
  if (currentSetIdx < openedSets.length - 1) { currentSetIdx++; initCollection(); }
};

// 8) Navbar bas
document.getElementById('goHome').onclick = () => show(1);
document.getElementById('goCollection').onclick = () => {
  if (!openedSets.length) return alert('Ouvre d’abord un booster !');
  initCollection(); show(3);
};

// 9) Fisher–Yates shuffle
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 10) Partie Trading
function getPrice(r) {
  if (!r) return 1;
  r = r.toLowerCase();
  if (r.includes('special') || r.includes('shiny')) return 20;
  if (r.includes('rare')) return 10;
  if (r.includes('uncommon')) return 5;
  return 2;
}
let offers = [];
function generateOffers() {
  const ids = Object.keys(cardInfo);
  offers = [];
  for (let i = 0; i < 5; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const price = getPrice((cardData[id] || {}).rarity);
    offers.push({ id, price });
  }
  renderOffers();
}
function renderOffers() {
  const c = document.getElementById('offers');
  c.innerHTML = '';
  offers.forEach(o => {
    const dis = wallet < o.price ? 'disabled' : '';
    c.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardInfo[o.id]}">
        <div>${o.price} €</div>
        <button ${dis} data-id="${o.id}" data-price="${o.price}">Acheter</button>
      </div>
    `);
  });
  c.querySelectorAll('#offers button').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id, p = parseFloat(b.dataset.price);
      wallet -= p;
      collection[id] = (collection[id] || 0) + 1;
      localStorage.setItem('wallet', wallet);
      localStorage.setItem('col', JSON.stringify(collection));
      updateWalletHeader();
      initCollection();
      generateOffers();
    };
  });
}
function renderMyOffers() {
  const c = document.getElementById('myOffers');
  c.innerHTML = '';
  const my = Object.keys(collection).filter(id => collection[id] > 0);
  if (!my.length) {
    c.textContent = 'Aucune carte à vendre.';
    return;
  }
  my.forEach(id => {
    const price = getPrice((cardData[id] || {}).rarity);
    c.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardInfo[id]}">
        <div>${price} €</div>
        <button data-id="${id}" data-price="${price}">Vendre</button>
      </div>
    `);
  });
  c.querySelectorAll('#myOffers button').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id, p = parseFloat(b.dataset.price);
      wallet += p;
      collection[id]--;
      if (collection[id] === 0) delete collection[id];
      localStorage.setItem('wallet', wallet);
      localStorage.setItem('col', JSON.stringify(collection));
      updateWalletHeader();
      initCollection();
      renderMyOffers();
    };
  });
}
document.getElementById('goTrade').onclick = () => {
  show(4);
  updateWalletHeader();
  generateOffers();
  renderMyOffers();
};
function startTradingCycle() {
  generateOffers();
  setInterval(generateOffers, 5 * 60 * 1000);
}

// 11) Initialisation au chargement DOM
document.addEventListener('DOMContentLoaded', () => {
  updateWalletHeader();
  loadSets().then(() => {
    if (openedSets.length) initCollection();
    startTradingCycle();
  });
});
