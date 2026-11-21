import * as THREE from 'three';

const hotspotConfigs = [
  { zoneId: 'engine', number: '1', label: 'Motor & Klíma', position: [-0.72, 1.78, 0.3] },
  { zoneId: 'wheels', number: '2', label: 'Kolesá & Brzdy', position: [0, 1.05, 0.3] },
  { zoneId: 'cabin', number: '3', label: 'Kabína & Ventilácia', position: [0.72, 2.3, 0.3] },
  { zoneId: 'exhaust', number: '4', label: 'Zadná náprava & Diely', position: [1.42, 1.5, 0.3] }
];

export function setupHotspots(scene, camera, domElement, overlay, onSelectZone) {
  const hotspotMeshes = [];
  const pins = [];
  const hotspotGeometry = new THREE.SphereGeometry(0.055, 20, 20);
  const cameraPosition = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const carCenter = new THREE.Vector3(0, 1.65, 0);
  const worldPosition = new THREE.Vector3();
  const projectedPosition = new THREE.Vector3();
  const toHotspot = new THREE.Vector3();
  let activePin = null;
  let tooltipTimeout = 0;
  let pointerStart = null;

  function hidePinLabel(pin = activePin) {
    window.clearTimeout(tooltipTimeout);
    if (!pin) return;
    pin.classList.remove('is-label-visible');
    if (activePin === pin) activePin = null;
  }

  function showPinLabel(pin) {
    hidePinLabel();
    activePin = pin;
    pin.classList.add('is-label-visible');
    tooltipTimeout = window.setTimeout(() => hidePinLabel(pin), 2800);
  }

  hotspotConfigs.forEach((config) => {
    const mesh = new THREE.Mesh(
      hotspotGeometry,
      new THREE.MeshBasicMaterial({ color: 0x37e4ce })
    );
    mesh.position.set(...config.position);
    mesh.userData.zoneId = config.zoneId;

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0x22b8a5,
        transparent: true,
        opacity: 0.24
      })
    );
    mesh.add(halo);
    mesh.userData.halo = halo;
    scene.add(mesh);
    hotspotMeshes.push(mesh);

    const pin = document.createElement('button');
    const dot = document.createElement('span');
    const label = document.createElement('span');
    pin.type = 'button';
    pin.className = 'car-pin';
    pin.dataset.zone = config.zoneId;
    pin.setAttribute('aria-pressed', 'false');
    pin.setAttribute('aria-hidden', 'true');
    pin.tabIndex = -1;
    pin.setAttribute('aria-label', `Zóna ${config.number}: ${config.label}`);
    dot.className = 'pin-dot';
    dot.setAttribute('aria-hidden', 'true');
    label.className = 'pin-label';
    label.textContent = `${config.number} • ${config.label}`;
    pin.append(dot, label);
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      onSelectZone(config.zoneId);
      showPinLabel(pin);
    });
    overlay.appendChild(pin);
    pins.push(pin);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function getHitHotspot(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hotspotMeshes, true);
    if (hits.length === 0) return null;

    let object = hits[0].object;
    while (object && !object.userData.zoneId) object = object.parent;
    return object ? object.userData.zoneId : null;
  }

  domElement.addEventListener('pointermove', (event) => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
      hidePinLabel();
      pointerStart = null;
    }
    const zoneId = getHitHotspot(event);
    domElement.style.cursor = zoneId ? 'pointer' : 'grab';
  });

  domElement.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  domElement.addEventListener('pointerup', () => {
    pointerStart = null;
  });
  domElement.addEventListener('pointercancel', () => {
    pointerStart = null;
  });

  domElement.addEventListener('click', (event) => {
    const zoneId = getHitHotspot(event);
    if (!zoneId) return;
    event.stopPropagation();
    onSelectZone(zoneId);
    showPinLabel(pins.find((pin) => pin.dataset.zone === zoneId));
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('.car-pin')) return;
    if (domElement.contains(target) && getHitHotspot(event)) return;
    hidePinLabel();
  });

  function animateHotspots(time) {
    const pulse = 1 + Math.sin(time * 4) * 0.25;
    camera.updateMatrixWorld();
    camera.getWorldPosition(cameraPosition);
    cameraDirection.subVectors(cameraPosition, carCenter);
    const overlayRect = overlay.getBoundingClientRect();

    hotspotMeshes.forEach((mesh, index) => {
      mesh.userData.halo.scale.setScalar(pulse);
      mesh.getWorldPosition(worldPosition);
      toHotspot.subVectors(worldPosition, carCenter);
      const isFarSide = toHotspot.dot(cameraDirection) < 0;
      projectedPosition.copy(worldPosition).project(camera);

      const inFrontOfCamera = projectedPosition.z <= 1 && projectedPosition.z >= -1;
      const inView = Math.abs(projectedPosition.x) <= 1.08 && Math.abs(projectedPosition.y) <= 1.08;
      const isVisible = inFrontOfCamera && inView;
      const x = overlayRect.left + ((projectedPosition.x + 1) / 2) * overlayRect.width;
      const y = overlayRect.top + ((1 - projectedPosition.y) / 2) * overlayRect.height;
      const pin = pins[index];

      pin.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      pin.style.opacity = isVisible ? (isFarSide ? '0.45' : '1') : '0';
      pin.style.pointerEvents = isVisible ? 'auto' : 'none';
      pin.setAttribute('aria-hidden', String(!isVisible));
      pin.tabIndex = isVisible ? 0 : -1;
    });
  }

  return { animateHotspots, hidePinLabels: () => hidePinLabel() };
}
