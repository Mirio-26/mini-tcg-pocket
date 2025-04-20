// script.js

// —— CONSTANTES & ÉTAT GLOBAL —— //
const API_BASE       = 'https://api.pokemontcg.io/v2';
let wallet           = parseFloat(localStorage.getItem('wallet') || '100');
let collection       = JSON.parse(localStorage.getItem('collection')    || '{}');
let cardData         = JSON.parse(localStorage.getItem('cardData')      || '{}');
let openedSets       = JSON.parse(localStorage.getItem('openedSets')    || '[]');
let allSets          = [];
let currentSetIdx    = -1;

// —— UTILITAIRES —— //
function saveAll() {
  localStorage.setItem('wallet',    wallet.toFixed(2));
  localStorage.setItem('collection', JSON.stringify(collection));
  localStorage.setItem('cardData',   JSON.stringify(cardData));
  localStorage.setItem('openedSets', JSON.stringify(openedSets));
}
function updateWalletDisplay() {
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

// —— SWITCH ÉCRANS —— //
const screens = ['screen1','screen2','screen3','screen4'];
function showScreen(n) {
  screens.forEach((id, idx) => {
    document.getElementById(id)
      .classList.toggle('active', idx + 1 === n);
  });
}

// —— CHARGEMENT DES SETS —— //
async function loadSets() {
  const container = document.getElementById('setsContainer');
  container.innerText = 'Chargement…';
  try {
    const res  = await fetch(`${API_BASE}/sets?pageSize=250`, { cache: 'no-store' });
    const { data } = await res.json();
    allSets = data;
    container.innerHTML = '';
    data.forEach(set => {
      const btn = document.createElement('div');
      btn.className = 'set-btn';
      btn.style.backgroundImage = `url(${set.images.logo})`;
      btn.title = set.name;
      // badge 5€
      const priceTag = document.createElement('div');
      priceTag.className = 'set-price';
      priceTag.innerText = '5 €';
      btn.appendChild(priceTag);
      btn.onclick = () => chooseSet(set);
      container.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    container.innerText = 'Erreur de chargement';
  }
  // flèches
  document.getElementById('prevBtn').onclick = () =>
    container.scrollBy({ left: -140, behavior: 'smooth' });
  document.getElementById('nextBtn').onclick = () =>
    container.scrollBy({ left:  140, behavior: 'smooth' });
}

// —— OUVERTURE DE BOOSTER —— //
async function chooseSet(set) {
  if (wallet < 5) {
    return alert('Portefeuille insuffisant (5 € requis).');
  }
  wallet -= 5;
  saveAll();
  updateWalletDisplay();

  // passe à l’écran 2
  showScreen(2);
  document.getElementById('currentSetName').innerText = set.name;

  // fetch des cartes du set
  const res   = await fetch(
    `${API_BASE}/cards?q=set.id:${set.id}&pageSize=250`,
    { cache: 'no-store' }
  );
  const { data: cards } = await res.json();

  // enregistre le set dans openedSets
  let idx = openedSets.findIndex(s => s.id === set.id);
  const ids = cards.map(c => c.id);
  if (idx === -1) {
    openedSets.push({ id: set.id, name: set.name, ids });
    idx = openedSets.length - 1;
  } else {
    openedSets[idx].ids = ids;
  }
  currentSetIdx = idx;
  saveAll();

  // anim + distribution
  const openingArea = document.getElementById('openingArea');
  openingArea.innerHTML = '';
  const pick = shuffle(cards).slice(0, 5);
  pick.forEach((c, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.animationDelay = `${i * 0.2}s`;
    openingArea.appendChild(thumb);
    setTimeout(() => {
      thumb.style.backgroundImage = `url(${c.images.small})`;
      // stock image & ajoute à la collection
      cardData[c.id] = c.images.small;
      collection[c.id] = (collection[c.id] || 0) + 1;
      saveAll();
    }, i * 400);
  });

  // après l’animation, affiche le classeur
  setTimeout(() => {
    initCollection();
    showScreen(3);
  }, 5 * 400 + 200);
}

// —— INIT & AFFICHAGE CLASSEUR —— //
function initCollection() {
  if (openedSets.length === 0) {
    currentSetIdx = -1;
  } else if (currentSetIdx < 0) {
    currentSetIdx = 0;
  }
  updateCollectionNav();
  renderCollection();
}
function updateCollectionNav() {
  const title = document.getElementById('collectionTitle');
  document.getElementById('prevSet').disabled = currentSetIdx <= 0;
  document.getElementById('nextSet').disabled = currentSetIdx >= openedSets.length - 1;
  title.innerText = currentSetIdx < 0
    ? '— Aucun set —'
    : openedSets[currentSetIdx].name;
}
function renderCollection() {
  const area = document.getElementById('collectionArea');
  area.innerHTML = '';
  if (currentSetIdx < 0) return;
  const { ids } = openedSets[currentSetIdx];
  ids.forEach((cardId, idx) => {
    const count = collection[cardId] || 0;
    const cell = document.createElement('div');
    cell.className = 'col-item';
    if (count === 0) {
      cell.innerHTML = `<div class="placeholder">${String(idx+1).padStart(3,'0')}</div>`;
    } else {
      cell.innerHTML = `
        <img src="${cardData[cardId]}" data-id="${cardId}"/>
        <span>x${count}</span>
        <button class="delete-btn" data-id="${cardId}">×</button>
      `;
    }
    area.appendChild(cell);
  });
  attachCollectionHandlers();
}
function attachCollectionHandlers() {
  document.querySelectorAll('#collectionArea img').forEach(img => {
    img.onclick = () => {
      document.getElementById('modalImg').src = img.src;
      document.getElementById('cardModal').style.display = 'flex';
    };
  });
  document.querySelectorAll('#collectionArea .delete-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (--collection[id] <= 0) delete collection[id];
      saveAll();
      renderCollection();
    };
  });
}
document.getElementById('prevSet').onclick = () => {
  if (currentSetIdx > 0) {
    currentSetIdx--;
    initCollection();
  }
};
document.getElementById('nextSet').onclick = () => {
  if (currentSetIdx < openedSets.length - 1) {
    currentSetIdx++;
    initCollection();
  }
};
document.getElementById('cardModal').onclick = () => {
  document.getElementById('cardModal').style.display = 'none';
};

// —— TRADING —— //
function getPrice(rarity='') {
  const r = rarity.toLowerCase();
  if (r.includes('shiny') || r.includes('special')) return 20;
  if (r.includes('rare'))                  return 10;
  if (r.includes('uncommon'))              return 5;
  return 2;
}
let offers = [];
function genOffers() {
  const ids = Object.keys(cardData);
  offers = [];
  for (let i = 0; i < 5; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const price = getPrice(cardData[id] && cardData[id].rarity);
    offers.push({ id, price });
  }
}
function renderOffers() {
  const container = document.getElementById('offers');
  container.innerHTML = '';
  offers.forEach(o => {
    const disabled = wallet < o.price ? 'disabled' : '';
    container.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[o.id]}"/>
        <div>${o.price} €</div>
        <button ${disabled} data-id="${o.id}" data-price="${o.price}">Acheter</button>
      </div>
    `);
  });
  container.querySelectorAll('.trade-card button').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id, p = parseFloat(btn.dataset.price);
      wallet -= p;
      collection[id] = (collection[id] || 0) + 1;
      saveAll();
      updateWalletDisplay();
      initCollection();
      genOffers();
      renderOffers();
    };
  });
}
function renderMyOffers() {
  const container = document.getElementById('myOffers');
  container.innerHTML = '';
  const mine = Object.keys(collection).filter(id => collection[id] > 0);
  if (mine.length === 0) {
    container.textContent = 'Aucune carte à vendre.';
    return;
  }
  mine.forEach(id => {
    const price = getPrice(cardData[id] && cardData[id].rarity);
    container.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[id]}"/>
        <div>${price} €</div>
        <button data-id="${id}" data-price="${price}">Vendre</button>
      </div>
    `);
  });
  container.querySelectorAll('#myOffers button').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id, p = parseFloat(btn.dataset.price);
      wallet += p;
      if (--collection[id] <= 0) delete collection[id];
      saveAll();
      updateWalletDisplay();
      initCollection();
      renderMyOffers();
    };
  });
}

// —— NAVBAR BAS —— //
document.getElementById('goHome').onclick = ()         => showScreen(1);
document.getElementById('goCollection').onclick = ()   => { initCollection(); showScreen(3); };
document.getElementById('goTrade').onclick = ()        => {
  genOffers(); renderOffers(); renderMyOffers();
  showScreen(4); updateWalletDisplay();
};

// —— DÉMARRAGE —— //
document.addEventListener('DOMContentLoaded', async () => {
  updateWalletDisplay();
  await loadSets();
  if (openedSets.length) {
    currentSetIdx = 0;
    initCollection();
  }
  // rafraîchissement auto des offres toutes les 5 min
  setInterval(() => {
    if (document.getElementById('screen4').classList.contains('active')) {
      genOffers(); renderOffers();
    }
  }, 5 * 60 * 1000);
});
