// == Mini TCG Pocket ==

// Points clés:
// - On stocke l’état courant (argent, sets, collection) dans localStorage.
// - On affiche/masque les 3 pages : boosters, collection, trading.
// - On charge les logos et données depuis le dossier assets/sets et assets/cards.

// Données de démonstration : liste des sets
const sets = [
  { id: 'base',   name: 'Base',    logo: 'sets/base.png', size: 200 },
  { id: 'jungle', name: 'Jungle',  logo: 'sets/jungle.png', size: 200 },
  { id: 'fossil', name: 'Fossil',  logo: 'sets/fossil.png', size: 200 },
  // … ajoute les autres sets ici …
];

let currentSetIndex = 0;
let balance = parseFloat(localStorage.getItem('balance') || '100');
let collection = JSON.parse(localStorage.getItem('collection') || '{}');

// Éléments du DOM
const navBoosters   = document.getElementById('nav-boosters');
const navCollection = document.getElementById('nav-collection');
const navTrading    = document.getElementById('nav-trading');

const pageBoosters   = document.getElementById('page-boosters');
const pageCollection = document.getElementById('page-collection');
const pageTrading    = document.getElementById('page-trading');

const balanceEl    = document.getElementById('balance');
const setsContainer       = document.getElementById('sets-container');
const prevSetBtn          = document.getElementById('prev-set');
const nextSetBtn          = document.getElementById('next-set');
const collectionContainer = document.getElementById('collection-container');

// Affiche le solde
function updateBalance() {
  balanceEl.textContent = balance.toFixed(2) + ' €';
  localStorage.setItem('balance', balance);
}

// Navigation entre pages
function showPage(page) {
  pageBoosters.style.display   = (page === 'boosters')   ? '' : 'none';
  pageCollection.style.display = (page === 'collection') ? '' : 'none';
  pageTrading.style.display    = (page === 'trading')    ? '' : 'none';
}

navBoosters.addEventListener('click', () => showPage('boosters'));
navCollection.addEventListener('click', () => { loadCollection(); showPage('collection'); });
navTrading.addEventListener('click', () => showPage('trading'));

// --- Page Boosters ---

function renderSets() {
  setsContainer.innerHTML = '';
  // On scroll horizontale automatique ou par click fleches
  const set = sets[currentSetIndex];
  const img = document.createElement('img');
  img.src = set.logo;
  img.alt = set.name;
  img.width = set.size;
  img.style.cursor = 'pointer';
  img.addEventListener('click', () => openBooster(set));
  setsContainer.appendChild(img);
  // On pourrait afficher aussi set.name entre les fleches…
}

// Navigation sets
prevSetBtn.addEventListener('click', () => {
  currentSetIndex = (currentSetIndex - 1 + sets.length) % sets.length;
  renderSets();
});
nextSetBtn.addEventListener('click', () => {
  currentSetIndex = (currentSetIndex + 1) % sets.length;
  renderSets();
});

// Achat et ouverture d’un booster
function openBooster(set) {
  const price = 5;
  if (balance < price) {
    return alert("Solde insuffisant !");
  }
  balance -= price;
  updateBalance();

  // Simule un tirage aléatoire de 5 cartes dans assets/cards/[set.id]/
  // Ici on affiche directement dans la collection
  for (let i = 0; i < 5; i++) {
    const rnd = String(Math.floor(Math.random() * 60) + 1).padStart(3, '0');
    const key = `${set.id}-${rnd}`;
    collection[key] = (collection[key] || 0) + 1;
  }
  localStorage.setItem('collection', JSON.stringify(collection));
  alert(`Booster ${set.name} ouvert !`);
}

// --- Page Collection ---

function loadCollection() {
  collectionContainer.innerHTML = '';
  // On parcourt tous les slots (001 à 100)…
  for (let num = 1; num <= 100; num++) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.textContent = String(num).padStart(3, '0');
    collectionContainer.appendChild(slot);
  }
  // Puis on ajoute par-dessus les cartes qu’on possède
  Object.entries(collection).forEach(([key, qty]) => {
    const [setId, num] = key.split('-');
    const img = document.createElement('img');
    img.src = `assets/cards/${setId}/${num}.png`;
    img.alt = key;
    img.width = 100;
    img.style.position = 'absolute';
    img.style.cursor = 'pointer';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.style.position = 'absolute';
    removeBtn.addEventListener('click', () => {
      delete collection[key];
      localStorage.setItem('collection', JSON.stringify(collection));
      loadCollection();
    });

    // On devrait calculer la position pixel précise du slot,
    // mais pour l’exemple on met tout en flow inline…
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.margin = '0.5rem';
    wrapper.append(img, removeBtn);
    collectionContainer.appendChild(wrapper);
  });
}

// --- Initialisation ---

updateBalance();
renderSets();
showPage('boosters');
