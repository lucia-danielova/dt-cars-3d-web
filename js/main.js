import { COMPANY_INFO, SERVICES, DIAGNOSTIC_ZONES } from './data/services.js';
import { createScene } from './three/scene.js';
import { buildCarModel } from './three/carModel.js';
import { setupHotspots } from './three/hotspots.js';

const container = document.getElementById('canvas-container');
const hotspotsOverlay = document.getElementById('hotspots-overlay');
const zonePanel = document.getElementById('zone-panel');
const zoneFeedback = document.getElementById('zone-feedback');
const addToCartButton = document.getElementById('add-to-cart-btn');
const glassDrawer = document.getElementById('glass-drawer');
const cartContent = document.getElementById('cart-content');
const tireOptions = document.getElementById('tire-options');
const tireSeason = document.getElementById('tire-season');
const tireSize = document.getElementById('tire-size');
const customTireSize = document.getElementById('tire-size-custom');
const { scene, camera, renderer, focusCamera, updateCamera } = createScene(container);
buildCarModel(scene);

let activeZoneId = null;
let hideHotspotLabels = () => {};
let confirmationTimeout = 0;
let toastTimeout = 0;
let drawerCloseTimeout = 0;
let drawerOpener = null;
const toastElement = document.getElementById('toast');
const CART_STORAGE_KEY = 'dtcars_service_list';
const LEGACY_CART_STORAGE_KEY = 'dtcars-service-cart-v1';
const WEB3FORMS_ACCESS_KEY =
  document.querySelector('meta[name="web3forms-access-key"]')?.content.trim() || '';

function updateOpeningStatus() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Bratislava',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(values.weekday);
  const isOpen = isWeekday && currentMinutes >= 8 * 60 && currentMinutes < 17 * 60;
  const status = document.getElementById('open-status');

  document.getElementById('open-status-label').textContent = isOpen ? 'OTVORENÉ' : 'ZATVORENÉ';
  status.classList.toggle('is-open', isOpen);
  status.classList.toggle('is-closed', !isOpen);
}

updateOpeningStatus();
window.setInterval(updateOpeningStatus, 60_000);
document.getElementById('service-count').textContent = `(${SERVICES.length})`;

function showToast(message, tone = 'success') {
  window.clearTimeout(toastTimeout);
  toastElement.textContent = message;
  toastElement.dataset.tone = tone;
  toastElement.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => {
    toastElement.classList.remove('is-visible');
  }, 3000);
}

function createCartId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadCart() {
  try {
    const savedItems = JSON.parse(
      window.localStorage.getItem(CART_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_CART_STORAGE_KEY) ||
      '[]'
    );
    if (!Array.isArray(savedItems)) {
      showToast('Uložený servisný plán má neplatný formát.', 'error');
      return [];
    }

    return savedItems.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const zone = DIAGNOSTIC_ZONES[item.zoneId];
      if (!zone || !Array.isArray(item.serviceIds) || typeof item.note !== 'string') return [];
      const serviceIds = item.serviceIds.filter((serviceId) =>
        zone.serviceIds.includes(serviceId) && SERVICES.some((service) => service.id === serviceId)
      );
      if (serviceIds.length === 0 && !item.note.trim()) return [];
      return [{
        id: typeof item.id === 'string' ? item.id : createCartId(),
        zoneId: zone.id,
        serviceIds,
        note: item.note
      }];
    });
  } catch (error) {
    showToast('Uložený servisný plán sa nepodarilo načítať.', 'error');
    return [];
  }
}

function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serviceCart));
    return true;
  } catch (error) {
    return false;
  }
}

const serviceCart = loadCart();
try {
  if (
    window.localStorage.getItem(CART_STORAGE_KEY) === null &&
    window.localStorage.getItem(LEGACY_CART_STORAGE_KEY) !== null
  ) {
    if (saveCart()) window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    else showToast('Zoznam sa nepodarilo previesť do nového úložiska.', 'error');
  }
} catch (error) {
  showToast('Servisný zoznam sa nepodarilo uložiť v tomto prehliadači.', 'error');
}

function selectZone(zoneId) {
  const zone = DIAGNOSTIC_ZONES[zoneId];
  if (!zone) return;

  hideHotspotLabels();
  activeZoneId = zoneId;
  window.clearTimeout(confirmationTimeout);
  tireOptions.classList.toggle('hidden', zoneId !== 'wheels');
  if (zoneId !== 'wheels') {
    tireSeason.value = '';
    tireSize.value = '';
    customTireSize.value = '';
    customTireSize.classList.add('hidden');
  }
  document.querySelectorAll('.car-pin').forEach((pin) => {
    const isActive = pin.dataset.zone === zoneId;
    pin.classList.toggle('is-active', isActive);
    pin.setAttribute('aria-pressed', String(isActive));
  });
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
  openGlassDrawer();
}

function closeZonePanel() {
  zonePanel.classList.add('hidden');
  tireOptions.classList.add('hidden');
  document.querySelectorAll('.car-pin').forEach((pin) => {
    pin.classList.remove('is-active');
    pin.setAttribute('aria-pressed', 'false');
  });
  activeZoneId = null;
}

const { animateHotspots, hidePinLabels } = setupHotspots(
  scene,
  camera,
  renderer.domElement,
  hotspotsOverlay,
  selectZone
);
hideHotspotLabels = hidePinLabels;

function openGlassDrawer({ scrollToCart = false } = {}) {
  window.clearTimeout(drawerCloseTimeout);
  drawerOpener = document.activeElement;
  glassDrawer.classList.remove('hidden');
  glassDrawer.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => {
    glassDrawer.classList.add('is-open');
    if (scrollToCart) cartContent.scrollIntoView({ block: 'start' });
    document.getElementById('close-glass-drawer').focus();
  });
}

function closeGlassDrawer() {
  if (glassDrawer.classList.contains('hidden')) {
    closeZonePanel();
    return;
  }

  window.clearTimeout(drawerCloseTimeout);
  glassDrawer.classList.remove('is-open');
  glassDrawer.setAttribute('aria-hidden', 'true');
  closeZonePanel();
  drawerCloseTimeout = window.setTimeout(() => {
    glassDrawer.classList.add('hidden');
    if (drawerOpener instanceof HTMLElement) drawerOpener.focus();
  }, 280);
}

document.getElementById('close-glass-drawer').addEventListener('click', closeGlassDrawer);
container.addEventListener('click', (event) => {
  if (event.target === renderer.domElement) closeGlassDrawer();
});

tireSize.addEventListener('change', () => {
  const isCustomSize = tireSize.value === 'other';
  customTireSize.classList.toggle('hidden', !isCustomSize);
  if (isCustomSize) customTireSize.focus();
});

function updateCartUI() {
  document.getElementById('cart-count').textContent = `(${serviceCart.length})`;
  document.getElementById('drawer-count').textContent = serviceCart.length;
  const itemsContainer = document.getElementById('cart-items-container');
  const clearCartButton = document.getElementById('clear-cart-btn');
  itemsContainer.replaceChildren();
  clearCartButton.disabled = serviceCart.length === 0;

  if (serviceCart.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-cart';
    emptyMessage.textContent = 'Servisný plán je prázdny. Vyberte zónu na aute alebo pridajte službu z katalógu.';
    itemsContainer.appendChild(emptyMessage);
    return;
  }

  Object.values(DIAGNOSTIC_ZONES).forEach((zone) => {
    const zoneItems = serviceCart.filter((item) => item.zoneId === zone.id);
    if (zoneItems.length === 0) return;

    const group = document.createElement('section');
    const heading = document.createElement('h4');
    group.className = 'cart-zone-group';
    heading.className = 'cart-zone-title';
    heading.textContent = zone.label;
    group.appendChild(heading);

    zoneItems.forEach((item) => {
      const card = document.createElement('article');
      const details = document.createElement('div');
      const services = document.createElement('p');
      const removeButton = document.createElement('button');
      const serviceTitles = item.serviceIds
        .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.title)
        .filter(Boolean);

      card.className = 'cart-item';
      details.className = 'cart-item-details';
      services.className = 'cart-item-services';
      services.textContent = serviceTitles.length
        ? serviceTitles.join(', ')
        : 'Diagnostika podľa popisu';
      details.appendChild(services);

      if (item.note) {
        const note = document.createElement('p');
        note.className = 'cart-item-note';
        note.textContent = item.note;
        details.appendChild(note);
      }

      removeButton.type = 'button';
      removeButton.className = 'close-btn cart-remove-btn';
      removeButton.dataset.removeId = item.id;
      removeButton.setAttribute('aria-label', 'Odstrániť položku zo servisného plánu');
      removeButton.textContent = '✕';
      card.append(details, removeButton);
      group.appendChild(card);
    });

    itemsContainer.appendChild(group);
  });
}

function addCartEntry(zoneId, serviceIds, note = '') {
  const zone = DIAGNOSTIC_ZONES[zoneId];
  if (!zone) return;

  const validServiceIds = serviceIds.filter((serviceId) =>
    zone.serviceIds.includes(serviceId) && SERVICES.some((service) => service.id === serviceId)
  );
  const cleanNote = note.trim();
  if (validServiceIds.length === 0 && !cleanNote) return;

  serviceCart.push({
    id: createCartId(),
    zoneId: zone.id,
    serviceIds: validServiceIds,
    note: cleanNote
  });
  const saved = saveCart();
  updateCartUI();
  showToast(
    saved ? 'Služba bola pridaná do servisného plánu.' : 'Služba je pridaná, ale prehliadač ju nedokázal uložiť.',
    saved ? 'success' : 'error'
  );
}

document.getElementById('cart-items-container').addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove-id]');
  if (!removeButton) return;
  const itemIndex = serviceCart.findIndex((item) => item.id === removeButton.dataset.removeId);
  if (itemIndex < 0) return;
  serviceCart.splice(itemIndex, 1);
  const saved = saveCart();
  updateCartUI();
  if (!saved) showToast('Zmena sa prejaví len v tejto relácii; uloženie zlyhalo.', 'error');
});

document.getElementById('clear-cart-btn').addEventListener('click', () => {
  if (serviceCart.length === 0) return;
  serviceCart.length = 0;
  const saved = saveCart();
  updateCartUI();
  showToast(
    saved ? 'Servisný plán bol vyprázdnený.' : 'Plán bol vymazaný len pre túto reláciu.',
    saved ? 'success' : 'error'
  );
});

updateCartUI();

addToCartButton.addEventListener('click', () => {
  if (!activeZoneId) return;

  const checkedServiceIds = Array.from(
    document.querySelectorAll('#zone-services-list input:checked'),
    (input) => input.value
  );
  const noteLines = [document.getElementById('problem-note').value.trim()].filter(Boolean);
  if (activeZoneId === 'wheels') {
    if (tireSeason.value) noteLines.push(`Sezóna: ${tireSeason.value}`);
    const selectedTireSize = tireSize.value === 'other' ? customTireSize.value.trim() : tireSize.value;
    if (selectedTireSize) noteLines.push(`Rozmer: ${selectedTireSize}`);
  }
  const note = noteLines.join('\n');

  if (checkedServiceIds.length === 0 && !note) {
    zoneFeedback.textContent = 'Vyberte službu alebo stručne opíšte problém.';
    zoneFeedback.classList.add('is-error');
    return;
  }

  const zoneId = activeZoneId;
  serviceCart.push({
    id: createCartId(),
    zoneId,
    serviceIds: checkedServiceIds,
    note
  });
  const saved = saveCart();
  updateCartUI();
  zoneFeedback.textContent = saved
    ? 'Pridané do servisného plánu.'
    : 'Pridané, ale prehliadač tento plán neuložil.';
  zoneFeedback.classList.remove('is-error');
  addToCartButton.textContent = '✓ Pridané do servisného plánu';
  addToCartButton.classList.add('is-added');
  showToast(
    saved ? 'Zóna bola pridaná do servisného plánu.' : 'Položka je pridaná, ale uloženie zlyhalo.',
    saved ? 'success' : 'error'
  );

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
  const actions = document.createElement('div');
  const jumpButton = document.createElement('button');
  const addButton = document.createElement('button');

  card.className = 'service-card';
  actions.className = 'service-card-actions';
  category.textContent = service.category;
  title.textContent = service.title;
  description.textContent = service.description;
  jumpButton.type = 'button';
  jumpButton.className = 'btn btn-ghost';
  jumpButton.dataset.jumpZone = service.zoneId;
  jumpButton.textContent = 'Zobraziť zónu';
  addButton.type = 'button';
  addButton.className = 'btn btn-primary';
  addButton.dataset.addService = service.id;
  addButton.textContent = '+ Pridať';
  content.append(category, title, description);
  actions.append(jumpButton, addButton);
  card.append(content, actions);
  allServicesGrid.appendChild(card);
});

allServicesGrid.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add-service]');
  if (addButton) {
    const service = SERVICES.find((item) => item.id === addButton.dataset.addService);
    if (service) addCartEntry(service.zoneId, [service.id]);
    return;
  }

  const jumpButton = event.target.closest('[data-jump-zone]');
  if (!jumpButton) return;
  document.getElementById('services-modal').classList.add('hidden');
  selectZone(jumpButton.dataset.jumpZone);
});

document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.modal).classList.remove('hidden');
  });
});

function openCart() {
  closeZonePanel();
  updateCartUI();
  openGlassDrawer({ scrollToCart: true });
}

document.getElementById('open-cart-btn').addEventListener('click', openCart);
document.getElementById('quick-booking-btn').addEventListener('click', () => {
  const make = document.getElementById('quick-car-make').value.trim();
  const model = document.getElementById('quick-car-model').value.trim();
  const service = SERVICES.find((item) => item.id === document.getElementById('quick-service').value);
  const carDescription = [make, model].filter(Boolean).join(' ');

  if (carDescription) document.getElementById('cust-car').value = carDescription;
  if (service) addCartEntry(service.zoneId, [service.id]);
  openCart();
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
  closeGlassDrawer();
  document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((modal) => {
    modal.classList.add('hidden');
  });
});

function buildOrderSummary() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const car = document.getElementById('cust-car').value.trim();
  const plate = document.getElementById('cust-plate').value.trim();
  const date = document.getElementById('cust-date').value;
  const time = document.getElementById('cust-time').value;
  const orderLines = [];

  Object.values(DIAGNOSTIC_ZONES).forEach((zone) => {
    const items = serviceCart.filter((item) => item.zoneId === zone.id);
    if (items.length === 0) return;
    orderLines.push(`${zone.label}:`);
    items.forEach((item) => {
      const titles = item.serviceIds
        .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.title)
        .filter(Boolean);
      orderLines.push(`  - ${titles.join(', ') || 'Diagnostika podľa popisu'}`);
      if (item.note) orderLines.push(`    Poznámka: ${item.note}`);
    });
  });

  const preferredVisit = [date, time].filter(Boolean).join(' ') || 'Neuvedený';
  const body = [
    `Dobrý deň,`,
    ``,
    `mám záujem o servis v spoločnosti ${COMPANY_INFO.name}.`,
    ``,
    `KONTAKT`,
    `Meno: ${name || 'Neuvedené'}`,
    `Telefón: ${phone || 'Neuvedený'}`,
    `E-mail: ${email || 'Neuvedený'}`,
    `Vozidlo: ${car || 'Neuvedené'}`,
    `ŠPZ: ${plate || 'Neuvedená'}`,
    `Preferovaný termín: ${preferredVisit}`,
    ``,
    `SERVISNÝ PLÁN`,
    ...(orderLines.length ? orderLines : ['Bez vybraných služieb - všeobecný dopyt.']),
    ``,
    `${COMPANY_INFO.address}`,
    `Tel.: ${COMPANY_INFO.phones.join(' | ')}`,
    `E-mail: ${COMPANY_INFO.email}`
  ].join('\n');

  return { body, subject: `Dopyt na servis - ${name || 'D&T CARS'}` };
}

async function copyOrderToClipboard(body) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(body);
      return;
    }

    const temporaryField = document.createElement('textarea');
    temporaryField.value = body;
    temporaryField.setAttribute('readonly', '');
    temporaryField.style.position = 'fixed';
    temporaryField.style.opacity = '0';
    document.body.appendChild(temporaryField);
    temporaryField.select();
    const copied = document.execCommand('copy');
    temporaryField.remove();
    if (!copied) throw new Error('Clipboard copy was rejected.');
  } catch (error) {
    showToast('Objednávku sa nepodarilo skopírovať. Skúste to znova.', 'error');
    return false;
  }
  showToast('Kompletná objednávka bola skopírovaná.');
  return true;
}

function openMailFallback(body, subject) {
  window.location.href =
    `mailto:${COMPANY_INFO.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.getElementById('copy-order-btn').addEventListener('click', async () => {
  const { body } = buildOrderSummary();
  await copyOrderToClipboard(body);
});

document.getElementById('booking-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { body, subject } = buildOrderSummary();

  if (!WEB3FORMS_ACCESS_KEY) {
    showToast('Web3Forms nie je nakonfigurovaný. Otváram e-mail; objednávku môžete aj skopírovať.', 'error');
    openMailFallback(body, subject);
    return;
  }

  const formData = new FormData(event.currentTarget);
  formData.set('access_key', WEB3FORMS_ACCESS_KEY);
  formData.set('subject', subject);
  formData.set('from_name', COMPANY_INFO.name);
  formData.set('message', body);

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (!response.ok || (result.success !== true && result.success !== 'true')) {
      throw new Error(result.message || 'Web3Forms rejected the order.');
    }
    showToast('Objednávka bola úspešne odoslaná.');
  } catch (error) {
    showToast('Online odoslanie zlyhalo. Otváram záložný e-mail.', 'error');
    openMailFallback(body, subject);
  }
});

const animationStart = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const elapsed = (performance.now() - animationStart) / 1000;
  updateCamera();
  animateHotspots(elapsed);
  renderer.render(scene, camera);
}

animate();
