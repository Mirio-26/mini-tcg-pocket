// script.js

// —— CONSTANTES ET ÉTAT GLOBAL —— //
const API_BASE = 'https://api.pokemontcg.io/v2';
let wallet        = parseFloat(localStorage.getItem('wallet') || '100');
let collection    = JSON.parse(localStorage.getItem('collection')    || '{}');
let cardData      = JSON.parse(localStorage.getItem('cardData')      || '{}');
let openedSets    = JSON.parse(localStorage.getItem('openedSets')    || '[]');
let allSets       = [];
let currentSetIdx = -1;

// —— UTILS —— //
function saveCollection() {
  localStorage.setItem('collection', JSON.stringify(collection));
}
function saveCardData() {
  localStorage.setItem('cardData', JSON.stringify(cardData));
}
function saveOpenedSets() {
  localStorage.setItem('openedSets', JSON.stringify(openedSets));
}
function updateWallet(amount=0) {
  wallet = Math.max(0, wallet + amount);
  localStorage.setItem('wallet', wallet.toFixed(2));
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

// —— SWITCH D’ÉCRANS —— //
const screens = ['screen1','screen2','screen3','screen4'];
function showScreen(num) {
  screens.forEach((id, i) => {
    document.getElementById(id).classList.toggle('active', i + 1 === num);
  });
}

// —— CHARGEMENT DES SETS —— //
async function loadSets() {
  const container = document.getElementById('setsContainer');
  container.innerText = 'Chargement…';
  try {
    const res = await fetch(`${API_BASE}/sets?pageSize=250`, { cache: 'no-store' });
    const { data } = await res.json();
    allSets = data;
    container.innerHTML = '';
    data.forEach(set => {
      const btn = document.createElement('div');
      btn.className = 'set-btn';
      btn.style.backgroundImage = `url(${set.images.logo})`;
      btn.title = set.name;
      // badge prix
      const priceTag = document.createElement('div');
      priceTag.className = 'set-price';
      priceTag.innerText = '5 €';
      btn.appendChild(priceTag);
      btn.onclick = () => chooseSet(set);
      container.appendChild(btn);
    });
  } catch (e) {
    container.innerText = 'Erreur de chargement';
    console.error(e);
  }
  // flèches scroll
  document.getElementById('prevBtn').onclick = () =>
    container.scrollBy({ left: -140, behavior: 'smooth' });
  document.getElementById('nextBtn').onclick = () =>
    container.scrollBy({ left:  140, behavior: 'smooth' });
}

// —— CHOIX + OUVERTURE DE BOOSTER —— //
async function chooseSet(set) {
  if (wallet < 5) {
    return alert('Portefeuille insuffisant (5 € requis).');
  }
  // débit
  updateWallet(-5);

  // animation d’ouverture
  showScreen(2);
  document.getElementById('currentSetName').innerText = set.name;
  const openingArea = document.getElementById('openingArea');
  openingArea.innerHTML = '';

  // récup cartes du set
  const res = await fetch(
    `${API_BASE}/cards?q=set.id:${set.id}&pageSize=250`,
    { cache: 'no-store' }
  );
  const cards = (await res.json()).data;
  // mémorise set ouvert
  let idx = openedSets.findIndex(s => s.id === set.id);
  const ids = cards.map(c => c.id);
  if (idx === -1) {
    openedSets.push({ id: set.id, name: set.name, ids });
    idx = openedSets.length - 1;
  } else {
    openedSets[idx].ids = ids;
  }
  currentSetIdx = idx;
  saveOpenedSets();

  // tire 5 cartes
  const pick = shuffle(cards).slice(0,5);
  pick.forEach((c, i) => {
    // thumb
    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.animationDelay = `${i * 0.2}s`;
    openingArea.appendChild(thumb);
    setTimeout(() => {
      thumb.style.backgroundImage = `url(${c.images.small})`;
      // stock données
      cardData[c.id] = c.images.small;
      saveCardData();
      // ajoute à la collection
      collection[c.id] = (collection[c.id] || 0) + 1;
      saveCollection();
    }, i * 400);
  });

  // après animation, passe au classeur
  setTimeout(() => {
    initCollection();
    showScreen(3);
  }, 5 * 400 + 200);
}

// —— GÉNÉRATION + AFFICHAGE CLASSEUR —— //
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
  if (currentSetIdx < 0) {
    title.innerText = '— Aucun set —';
  } else {
    title.innerText = openedSets[currentSetIdx].name;
  }
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
        <img src="${cardData[cardId]}" data-id="${cardId}">
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
      saveCollection();
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

// —— SECTION TRADING —— //
function getPrice(rarity='') {
  const r = (rarity||'').toLowerCase();
  if (r.includes('rare'))   return 10;
  if (r.includes('uncommon')) return 5;
  return 2;
}
let offers = [];
function genOffers() {
  const ids = Object.keys(cardData);
  offers = [];
  for (let i = 0; i < 5; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const price = getPrice((cardData[id] && cardData[id].rarity) || '');
    offers.push({ id, price });
  }
}
function renderOffers() {
  const c = document.getElementById('offers');
  c.innerHTML = '';
  offers.forEach(o => {
    const disabled = wallet < o.price ? 'disabled' : '';
    c.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[o.id]}">
        <div>${o.price} €</div>
        <button ${disabled} data-id="${o.id}" data-price="${o.price}">Acheter</button>
      </div>`);
  });
  c.querySelectorAll('.trade-card button').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id, p = parseFloat(b.dataset.price);
      wallet -= p;
      updateWallet(0);
      collection[id] = (collection[id] || 0) + 1;
      saveCollection();
      initCollection();
      genOffers();
      renderOffers();
    };
  });
}
function renderMyOffers() {
  const c = document.getElementById('myOffers');
  c.innerHTML = '';
  const mine = Object.keys(collection).filter(id => collection[id] > 0);
  if (mine.length === 0) {
    c.textContent = 'Aucune carte à vendre.';
    return;
  }
  mine.forEach(id => {
    const price = getPrice((cardData[id] && cardData[id].rarity) || '');
    c.insertAdjacentHTML('beforeend', `
      <div class="trade-card">
        <img src="${cardData[id]}">
        <div>${price} €</div>
        <button data-id="${id}" data-price="${price}">Vendre</button>
      </div>`);
  });
  c.querySelectorAll('#myOffers button').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id, p = parseFloat(b.dataset.price);
      wallet += p;
      updateWallet(0);
      if (--collection[id] <= 0) delete collection[id];
      saveCollection();
      initCollection();
      renderMyOffers();
    };
  });
}

// —— NAVBAR BASSE —— //
document.getElementById('goHome').onclick = () => showScreen(1);
document.getElementById('goCollection').onclick = () => {
  if (openedSets.length === 0) return alert('Ouvre d’abord un booster !');
  initCollection();
  showScreen(3);
};
document.getElementById('goTrade').onclick = () => {
  genOffers();
  renderOffers();
  renderMyOffers();
  showScreen(4);
  updateWallet(0);
};

// —— DÉMARRAGE —— //
document.addEventListener('DOMContentLoaded', () => {
  updateWallet(0);
  loadSets().then(() => {
    if (openedSets.length) {
      currentSetIdx = 0;
      initCollection();
    }
    setInterval(() => {
      if (screens[3] && document.getElementById('screen4').classList.contains('active')) {
        genOffers(); renderOffers();
      }
    }, 5 * 60 * 1000);
  });
});
