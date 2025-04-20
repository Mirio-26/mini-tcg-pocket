// — Données statiques des sets —
// Mets tes logos dans assets/sets/{id}.png
const sets = [
  { id: 'base',   name: 'Base',     logo: 'assets/sets/base.png' },
  { id: 'jungle', name: 'Jungle',   logo: 'assets/sets/jungle.png' },
  { id: 'fossil', name: 'Fossil',   logo: 'assets/sets/fossil.png' },
  // … ajoute les autres …
];

// — État & stockage local —
let balance    = parseFloat(localStorage.getItem('balance')    || '100');
let collection = JSON.parse(localStorage.getItem('collection') || '{}');

// — Helpers DOM —
const balanceEl    = document.getElementById('balance');
const pageBoosters   = document.getElementById('page-boosters');
const pageCollection = document.getElementById('page-collection');
const pageTrading    = document.getElementById('page-trading');

const setsContainer       = document.getElementById('sets-container');
const prevSetBtn          = document.getElementById('prev-set');
const nextSetBtn          = document.getElementById('next-set');
const collectionContainer = document.getElementById('collection-container');

document.getElementById('nav-boosters').onclick   = () => showPage('boosters');
document.getElementById('nav-collection').onclick = () => { loadCollection(); showPage('collection'); };
document.getElementById('nav-trading').onclick    = () => showPage('trading');

function showPage(page) {
  pageBoosters.style.display   = page==='boosters'   ? '' : 'none';
  pageCollection.style.display = page==='collection' ? '' : 'none';
  pageTrading.style.display    = page==='trading'    ? '' : 'none';
}

// — Solde —
function updateBalance() {
  balanceEl.textContent = balance.toFixed(2) + ' €';
  localStorage.setItem('balance', balance);
}

// — Affichage des sets (scrollable) —
function renderSets() {
  setsContainer.innerHTML = '';
  sets.forEach(set => {
    const img = document.createElement('img');
    img.src = set.logo;
    img.alt = set.name;
    img.title = set.name;
    img.addEventListener('click', () => openBooster(set));
    setsContainer.appendChild(img);
  });
}
prevSetBtn.onclick = () => setsContainer.scrollBy({ left: -200, behavior: 'smooth' });
nextSetBtn.onclick = () => setsContainer.scrollBy({ left:  200, behavior: 'smooth' });

// — Ouvrir un booster —
function openBooster(set) {
  const price = 5;
  if (balance < price) return alert("Solde insuffisant !");
  balance -= price;
  updateBalance();

  // Tirage aléatoire de 5 cartes (nom de fichier 001.png…060.png)
  for (let i = 0; i < 5; i++) {
    const num = String(Math.floor(Math.random()*60)+1).padStart(3,'0');
    const key = `${set.id}-${num}`;
    collection[key] = (collection[key]||0) + 1;
  }
  localStorage.setItem('collection', JSON.stringify(collection));
  alert(`Tu as ouvert 1 booster ${set.name} !`);
}

// — Affichage de la collection —
function loadCollection() {
  collectionContainer.innerHTML = '';
  // Création des 100 emplacements
  for (let i = 1; i <= 100; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = String(i).padStart(3,'0');
    collectionContainer.appendChild(slot);
  }
  // On recouvre par les vraies cartes
  Object.entries(collection).forEach(([key, qty]) => {
    const [setId, num] = key.split('-');
    const img = document.createElement('img');
    img.src = `assets/cards/${setId}/${num}.png`;
    img.alt = key;

    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    btn.onclick = () => {
      delete collection[key];
      localStorage.setItem('collection', JSON.stringify(collection));
      loadCollection();
    };

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.append(img, btn);

    // calcule index pour l’injecter au bon endroit
    const idx = parseInt(num, 10) - 1;
    const slotEl = collectionContainer.children[idx];
    slotEl.innerHTML = '';
    slotEl.appendChild(wrapper);
  });
}

// — Init —
updateBalance();
renderSets();
showPage('boosters');
