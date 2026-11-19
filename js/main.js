import { COMPANY_INFO, SERVICES, DIAGNOSTIC_ZONES } from './data/services.js';
import { createScene } from './three/scene.js';
import { buildCarModel } from './three/carModel.js';
import { setupHotspots } from './three/hotspots.js';

const container = document.getElementById('canvas-container');
const { scene, camera, renderer, focusCamera, resetCamera, updateCamera } = createScene(container);
const { state: carState, setBodyColor, updateCarAnimations } = buildCarModel(scene);

// Prepínanie farby laku karosérie (ak sú v index.html pridané farebné tlačidlá)
document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (setBodyColor) setBodyColor(btn.dataset.color);
  });
});

let activeZoneId = null;
const serviceCart = [];

// Otvorenie konkrétnej diagnostickej zóny
function selectZone(zoneId) {
  const zone = DIAGNOSTIC_ZONES[zoneId];
  if (!zone) return;
  activeZoneId = zoneId;

  // Zvýraznenie aktívneho tlačidla v ľavom paneli
  document.querySelectorAll('.zone-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.zone === zoneId);
  });

  // Animácia auta podľa zvolenej zóny
  carState.hoodOpen = zone.action === 'openHood';
  carState.doorsOpen = zone.action === 'openDoors';
  carState.wheelsExpanded = zone.action === 'inspectWheels';
  focusCamera(zone.cameraPos, zone.cameraTarget);

  // Naplnenie pravého diagnostického panelu
  document.getElementById('zone-badge').textContent = zone.badge;
  document.getElementById('zone-title').textContent = zone.label;

  const servicesListEl = document.getElementById('zone-services-list');
  servicesListEl.innerHTML = '';
  zone.serviceIds.forEach((sId) => {
    const srv = SERVICES.find((s) => s.id === sId);
    if (!srv) return;
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    label.innerHTML = `<input type="checkbox" value="${srv.title}" checked /> <span>${srv.title}</span>`;
    servicesListEl.appendChild(label);
  });

  const symptomsEl = document.getElementById('zone-symptoms');
  const noteInput = document.getElementById('problem-note');
  noteInput.value = '';
  symptomsEl.innerHTML = '';
  zone.symptoms.forEach((sym) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = `+ ${sym}`;
    chip.addEventListener('click', () => {
      noteInput.value = noteInput.value ? `${noteInput.value}, ${sym}` : sym;
    });
    symptomsEl.appendChild(chip);
  });

  document.getElementById('zone-panel').classList.remove('hidden');
}

// Prepojenie hotspotov na 3D aute
const { animateHotspots } = setupHotspots(scene, camera, renderer.domElement, selectZone);

// Tlačidlá v ľavom paneli
document.querySelectorAll('.zone-btn').forEach((btn) => {
  btn.addEventListener('click', () => selectZone(btn.dataset.zone));
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
});

document.getElementById('close-zone-panel').addEventListener('click', () => {
  document.getElementById('zone-panel').classList.add('hidden');
});

// Pridanie do servisného zoznamu
document.getElementById('add-to-cart-btn').addEventListener('click', () => {
  if (!activeZoneId) return;
  const zone = DIAGNOSTIC_ZONES[activeZoneId];
  const checked = Array.from(document.querySelectorAll('#zone-services-list input:checked')).map(
    (el) => el.value
  );
  const note = document.getElementById('problem-note').value.trim();

  if (checked.length === 0 && !note) {
    alert('Vyberte aspoň jednu službu alebo popíšte problém.');
    return;
  }

  serviceCart.push({
    zoneLabel: zone.label,
    services: checked,
    note
  });

  updateCartUI();
  document.getElementById('zone-panel').classList.add('hidden');
});

function updateCartUI() {
  document.getElementById('cart-count').textContent = serviceCart.length;
  const containerEl = document.getElementById('cart-items-container');
  if (serviceCart.length === 0) {
    containerEl.innerHTML = '<p style="color: var(--text-muted);">Zatiaľ ste neoznačili žiadnu časť na 3D aute.</p>';
    return;
  }

  containerEl.innerHTML = serviceCart
    .map(
      (item, idx) => `
      <div class="cart-item">
        <div>
          <strong>${item.zoneLabel}</strong>
          <div style="font-size:0.84rem; margin-top:4px;">Služby: ${item.services.join(', ') || 'Diagnostika'}</div>
          ${item.note ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Poznámka: ${item.note}</div>` : ''}
        </div>
        <button class="close-btn" data-remove-idx="${idx}">✕</button>
      </div>
    `
    )
    .join('');

  containerEl.querySelectorAll('[data-remove-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      serviceCart.splice(Number(btn.dataset.removeIdx), 1);
      updateCartUI();
    });
  });
}

// Naplnenie prehľadu všetkých 8 služieb
const allServicesGrid = document.getElementById('all-services-grid');
allServicesGrid.innerHTML = SERVICES.map(
  (s) => `
  <div class="service-card">
    <div>
      <small>${s.category}</small>
      <h3 style="font-size:1rem; margin: 4px 0 6px;">${s.title}</h3>
      <p>${s.description}</p>
    </div>
    <button class="btn btn-ghost" data-jump-zone="${s.zoneId}">Označiť na 3D aute →</button>
  </div>
`
).join('');

allServicesGrid.querySelectorAll('[data-jump-zone]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('services-modal').classList.add('hidden');
    selectZone(btn.dataset.jumpZone);
  });
});

// Ovládanie modálnych okien
document.querySelectorAll('[data-modal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.modal).classList.remove('hidden');
  });
});
document.getElementById('open-cart-btn').addEventListener('click', () => {
  updateCartUI();
  document.getElementById('cart-modal').classList.remove('hidden');
});
document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.modal-backdrop').classList.add('hidden');
  });
});

// Odoslanie objednávky cez predvolený e-mail klienta na dtcars@dtcars.sk
document.getElementById('booking-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const email = document.getElementById('cust-email').value;
  const car = document.getElementById('cust-car').value;

  const summary = serviceCart
    .map(
      (item, i) =>
        `${i + 1}. ${item.zoneLabel}\n   Služby: ${item.services.join(', ')}\n   Popis: ${item.note || '-'}`
    )
    .join('\n\n');

  const body = encodeURIComponent(
    `Dobrý deň,\n\nmám záujem o servisné služby v ${COMPANY_INFO.name}:\n\n` +
      `Meno: ${name}\nTelefón: ${phone}\nE-mail: ${email}\nVozidlo: ${car}\n\n` +
      `Označené položky z 3D modelu:\n${summary || 'Všeobecný dopyt'}`
  );

  window.location.href = `mailto:${COMPANY_INFO.email}?subject=${encodeURIComponent(
    'Objednávka servisu z 3D webu - ' + name
  )}&body=${body}`;
});

// Hlavná animačná slučka
const clock = { start: performance.now() };
function animate() {
  requestAnimationFrame(animate);
  const elapsed = (performance.now() - clock.start) / 1000;
  updateCarAnimations();
  animateHotspots(elapsed);
  updateCamera();
  renderer.render(scene, camera);
}
animate();