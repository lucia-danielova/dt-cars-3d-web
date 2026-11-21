import * as THREE from 'three';

const hotspotConfigs = [
  { zoneId: 'engine', number: '1', label: 'Motor & Klíma', position: [0, 0.85, 1.45], labelOffset: [-110, -55] },
  { zoneId: 'wheels', number: '2', label: 'Kolesá, Pneu & Brzdy', position: [1.05, 0.42, 1.32], labelOffset: [115, 45] },
  { zoneId: 'cabin', number: '3', label: 'Kabína & Ozón', position: [0, 1.25, -0.1], labelOffset: [110, -55] },
  { zoneId: 'exhaust', number: '4', label: 'Podvozok & Diely', position: [0, 0.48, -2.05], labelOffset: [-115, 45] }
];

export function setupHotspots(scene, camera, domElement, overlay, onSelectZone) {
  const hotspotMeshes = [];
  const pins = [];
  const leaders = [];
  const hotspotLines = document.getElementById('hotspot-lines');
  const hotspotGeometry = new THREE.SphereGeometry(0.055, 20, 20);
  const worldPosition = new THREE.Vector3();
  const projectedPosition = new THREE.Vector3();
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

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    line.classList.add('hotspot-leader-line');
    anchor.classList.add('hotspot-anchor');
    line.setAttribute('opacity', '0');
    anchor.setAttribute('r', '3');
    hotspotLines.append(line, anchor);
    leaders.push({ line, anchor });

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
    label.style.left = `${config.labelOffset[0]}px`;
    label.style.top = `${config.labelOffset[1]}px`;
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
    const overlayRect = overlay.getBoundingClientRect();
    const linesRect = hotspotLines.getBoundingClientRect();
    const positions = [];
    hotspotLines.setAttribute('viewBox', `0 0 ${linesRect.width} ${linesRect.height}`);

    hotspotMeshes.forEach((mesh, index) => {
      mesh.userData.halo.scale.setScalar(pulse);
      mesh.getWorldPosition(worldPosition);
      projectedPosition.copy(worldPosition).project(camera);

      const inFrontOfCamera = projectedPosition.z <= 1 && projectedPosition.z >= -1;
      const inView = Math.abs(projectedPosition.x) <= 1.08 && Math.abs(projectedPosition.y) <= 1.08;
      const isVisible = inFrontOfCamera && inView;
      const x = overlayRect.left + ((projectedPosition.x + 1) / 2) * overlayRect.width;
      const y = overlayRect.top + ((1 - projectedPosition.y) / 2) * overlayRect.height;
      const pin = pins[index];
      const config = hotspotConfigs[index];
      const labelX = x + config.labelOffset[0];
      const labelY = y + config.labelOffset[1];

      pin.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      pin.style.opacity = isVisible ? '1' : '0';
      pin.style.pointerEvents = isVisible ? 'auto' : 'none';
      pin.setAttribute('aria-hidden', String(!isVisible));
      pin.tabIndex = isVisible ? 0 : -1;

      positions.push({ index, x, y, labelX, labelY, isVisible });
    });

    const visibleLabels = positions.filter((item) => item.isVisible).sort((a, b) => a.labelY - b.labelY);
    for (let index = 1; index < visibleLabels.length; index += 1) {
      if (visibleLabels[index].labelY - visibleLabels[index - 1].labelY < 42) {
        visibleLabels[index].labelY = visibleLabels[index - 1].labelY + 42;
      }
    }

    positions.forEach((item) => {
      const pin = pins[item.index];
      const label = pin.querySelector('.pin-label');
      const leader = leaders[item.index];
      label.style.left = `${item.labelX - item.x}px`;
      label.style.top = `${item.labelY - item.y}px`;

      const labelRect = label.getBoundingClientRect();
      const endX = Math.max(labelRect.left, Math.min(item.x, labelRect.right));
      const endY = Math.max(labelRect.top, Math.min(item.y, labelRect.bottom));
      leader.line.setAttribute('x1', String(item.x - linesRect.left));
      leader.line.setAttribute('y1', String(item.y - linesRect.top));
      leader.line.setAttribute('x2', String(endX - linesRect.left));
      leader.line.setAttribute('y2', String(endY - linesRect.top));
      leader.line.setAttribute('opacity', item.isVisible && pin.classList.contains('is-label-visible') ? '1' : '0');
      leader.anchor.setAttribute('cx', String(item.x - linesRect.left));
      leader.anchor.setAttribute('cy', String(item.y - linesRect.top));
      leader.anchor.setAttribute('opacity', item.isVisible ? '1' : '0');
    });
  }

  return { animateHotspots, hidePinLabels: () => hidePinLabel() };
}
