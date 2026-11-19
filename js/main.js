import { COMPANY_INFO, SERVICES, DIAGNOSTIC_ZONES } from './data/services.js';
import { createScene } from './three/scene.js';
import { buildCarModel } from './three/carModel.js';
import { setupHotspots } from './three/hotspots.js';

const container = document.getElementById('canvas-container');
const hotspotsOverlay = document.getElementById('hotspots-overlay');
const zonePanel = document.getElementById('zone-panel');
const zoneFeedback = document.getElementById('zone-feedback');
const addToCartButton = document.getElementById('add-to-cart-btn');
const { scene, camera, renderer, focusCamera, resetCamera, updateCamera } = createScene(container);
const { state: carState, setBodyColor, updateCarAnimations } = buildCarModel(scene);

let activeZoneId = null;
let confirmationTimeout = 0;
const serviceCart = [];

document.querySelectorAll('.swatch').forEach((button) => {
  button.addEventListener('click', () => {
    setBodyColor(button.dataset.color);
    document.querySelectorAll('.swatch').forEach((swatch) => {
      swatch.setAttribute('aria-pressed', String(swatch === button));
    });
  });
});

function selectZone(zoneId) {
  const zone = DIAGNOSTIC_ZONES[zoneId];
  if (!zone) return;

  activeZoneId = zoneId;
  window.clearTimeout(confirmationTimeout);
  document.querySelectorAll('.car-pin').forEach((pin) => {
    const isActive = pin.dataset.zone === zoneId;
    pin.classList.toggle('is-active', isActive);
    pin.setAttribute('aria-pressed', String(isActive));
  });

  carState.hoodOpen = zone.action === 'openHood';
  carState.doorsOpen = zone.action === 'openDoors';
  carState.wheelsExpanded = zone.action === 'inspectWheels';
  focusCamera(zone.cameraPos, zone.cameraTarget);

  document.getElementById('zone-badge').textContent = zone.badge;
  document.getElementById('zone-title').textContent = zone.label;
  document.getElementById('problem-note').value = '';
  zoneFeedback.textContent = '';
  zoneFeedback.classList.remove('is-error');
  addToCartButton.textContent = '+ Pridať do servisného zoznamu';
  addToCartButton.classList.remove('is-added');

  const servicesList = document.getElementById('zone-services-list');
  servicesList.replaceChildren();
  zone.serviceIds.forEach((serviceId) => {
    const service = SERVICES.find((item) => item.id === serviceId);
    if (!service) return;

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    const title = document.createElement('span');
    label.className = 'checkbox-item';
    checkbox.type = 'checkbox';
    checkbox.value = service.id;
    checkbox.checked = true;
    title.textContent = service.title;
    label.append(checkbox, title);
    servicesList.appendChild(label);
  });

  const symptoms = document.getElementById('zone-symptoms');
  symptoms.replaceChildren();
  zone.symptoms.forEach((symptom) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = `+ ${symptom}`;
    chip.addEventListener('click', () => {
      const note = document.getElementById('problem-note');
      note.value = note.value ? `${note.value}\n${symptom}` : symptom;
      note.focus();
    });
    symptoms.appendChild(chip);
  });

  zonePanel.classList.remove('hidden');
  document.body.classList.add('zone-open');
}

function closeZonePanel() {
  zonePanel.classList.add('hidden');
  document.body.classList.remove('zone-open');
  document.querySelectorAll('.car-pin').forEach((pin) => {
    pin.classList.remove('is-active');
    pin.setAttribute('aria-pressed', 'false');
  });
  activeZoneId = null;
}

const { animateHotspots } = setupHotspots(
  scene,
  camera,
  renderer.domElement,
  hotspotsOverlay,
  selectZone
);

document.getElementById('close-zone-panel').addEventListener('click', closeZonePanel);
container.addEventListener('click', (event) => {
  if (event.target === renderer.domElement) closeZonePanel();
});

document.getElementById('toggle-hood').addEventListener('click', () => {
  carState.hoodOpen = !carState.hoodOpen;
});
document.getElementById('toggle-doors').addEventListener('click', () => {
  carState.doorsOpen = !carState.doorsOpen;
});
document.getElementById('toggle-wheels').addEventListener('click', () => {
  carState.wheelsExpanded = !carState.wheelsExpanded;
});
document.getElementById('reset-cam').addEventListener('click', () => {
  carState.hoodOpen = false;
  carState.doorsOpen = false;
  carState.wheelsExpanded = false;
  resetCamera();
  closeZonePanel();
});

function updateCartUI() {
  document.getElementById('cart-count').textContent = serviceCart.length;
  const itemsContainer = document.getElementById('cart-items-container');
  itemsContainer.replaceChildren();

  if (serviceCart.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-cart';
    emptyMessage.textContent = 'Zatiaľ ste neoznačili žiadnu časť na 3D aute.';
    itemsContainer.appendChild(emptyMessage);
    return;
  }

  serviceCart.forEach((item, index) => {
    const card = document.createElement('div');
    const details = document.createElement('div');
    const title = document.createElement('strong');
    const services = document.createElement('p');
    const removeButton = document.createElement('button');

    card.className = 'cart-item';
    title.textContent = item.zoneLabel;
    services.className = 'cart-item-services';
    services.textContent = `Služby: ${item.services.join(', ') || 'Diagnostika'}`;
    details.append(title, services);

    if (item.note) {
      const note = document.createElement('p');
      note.className = 'cart-item-note';
      note.textContent = `Poznámka: ${item.note}`;
      details.appendChild(note);
    }

    removeButton.type = 'button';
    removeButton.className = 'close-btn';
    removeButton.dataset.removeIndex = index;
    removeButton.setAttribute('aria-label', `Odstrániť položku ${index + 1}`);
    removeButton.textContent = '✕';
    removeButton.addEventListener('click', () => {
      serviceCart.splice(index, 1);
      updateCartUI();
    });

    card.append(details, removeButton);
    itemsContainer.appendChild(card);
  });
}

addToCartButton.addEventListener('click', () => {
  if (!activeZoneId) return;

  const zone = DIAGNOSTIC_ZONES[activeZoneId];
  const checkedServiceIds = Array.from(
    document.querySelectorAll('#zone-services-list input:checked'),
    (input) => input.value
  );
  const selectedServices = checkedServiceIds
    .map((serviceId) => SERVICES.find((service) => service.id === serviceId))
    .filter(Boolean)
    .map((service) => service.title);
  const note = document.getElementById('problem-note').value.trim();

  if (selectedServices.length === 0 && !note) {
    zoneFeedback.textContent = 'Vyberte službu alebo stručne opíšte problém.';
    zoneFeedback.classList.add('is-error');
    return;
  }

  serviceCart.push({ zoneLabel: zone.label, services: selectedServices, note });
  updateCartUI();
  zoneFeedback.textContent = 'Pridané do servisného zoznamu.';
  zoneFeedback.classList.remove('is-error');
  addToCartButton.textContent = '✓ Pridané do servisného zoznamu';
  addToCartButton.classList.add('is-added');

  window.clearTimeout(confirmationTimeout);
  confirmationTimeout = window.setTimeout(() => {
    addToCartButton.textContent = '+ Pridať do servisného zoznamu';
    addToCartButton.classList.remove('is-added');
  }, 1800);
});

const allServicesGrid = document.getElementById('all-services-grid');
SERVICES.forEach((service) => {
  const card = document.createElement('article');
  const content = document.createElement('div');
  const category = document.createElement('small');
  const title = document.createElement('h3');
  const description = document.createElement('p');
  const chooseButton = document.createElement('button');

  card.className = 'service-card';
  category.textContent = service.category;
  title.textContent = service.title;
  description.textContent = service.description;
  chooseButton.type = 'button';
  chooseButton.className = 'btn btn-ghost';
  chooseButton.dataset.jumpZone = service.zoneId;
  chooseButton.textContent = 'Označiť na 3D aute →';
  content.append(category, title, description);
  card.append(content, chooseButton);
  allServicesGrid.appendChild(card);
});

allServicesGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-jump-zone]');
  if (!button) return;
  document.getElementById('services-modal').classList.add('hidden');
  selectZone(button.dataset.jumpZone);
});

document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.modal).classList.remove('hidden');
  });
});

document.getElementById('open-cart-btn').addEventListener('click', () => {
  updateCartUI();
  document.getElementById('cart-modal').classList.remove('hidden');
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('.modal-backdrop').classList.add('hidden');
  });
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.classList.add('hidden');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeZonePanel();
  document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((modal) => {
    modal.classList.add('hidden');
  });
});

document.getElementById('booking-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const car = document.getElementById('cust-car').value.trim();
  const summary = serviceCart
    .map(
      (item, index) =>
        `${index + 1}. ${item.zoneLabel}\n   Služby: ${item.services.join(', ') || 'Diagnostika'}\n   Popis: ${item.note || '-'}`
    )
    .join('\n\n');
  const body = encodeURIComponent(
    `Dobrý deň,\n\nmám záujem o servisné služby v ${COMPANY_INFO.name}:\n\n` +
      `Meno: ${name}\nTelefón: ${phone}\nE-mail: ${email}\nVozidlo: ${car}\n\n` +
      `Označené položky z 3D modelu:\n${summary || 'Všeobecný dopyt'}`
  );
  const subject = encodeURIComponent(`Objednávka servisu z 3D webu - ${name}`);

  window.location.href = `mailto:${COMPANY_INFO.email}?subject=${subject}&body=${body}`;
});

const animationStart = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = (performance.now() - animationStart) / 1000;
  updateCarAnimations();
  updateCamera();
  animateHotspots(elapsed);
  renderer.render(scene, camera);
}

animate();
