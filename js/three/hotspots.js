import * as THREE from 'three';

export function setupHotspots(scene, camera, domElement, onSelectZone) {
  const hotspotConfigs = [
    { zoneId: 'engine', position: [0, 0.92, 1.45] },
    { zoneId: 'wheels', position: [1.18, 0.45, 1.32] },
    { zoneId: 'cabin', position: [0, 1.32, -0.1] },
    { zoneId: 'exhaust', position: [0, 0.52, -2.18] }
  ];

  const hotspotMeshes = [];
  const geo = new THREE.SphereGeometry(0.11, 20, 20);

  hotspotConfigs.forEach((cfg) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...cfg.position);
    mesh.userData = { zoneId: cfg.zoneId };

    // Vonkajší pulzujúci prstenec
    const haloGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff4757,
      transparent: true,
      opacity: 0.35
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    mesh.add(halo);
    mesh.userData.halo = halo;

    scene.add(mesh);
    hotspotMeshes.push(mesh);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function getHitHotspot(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hotspotMeshes, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData.zoneId) obj = obj.parent;
      return obj ? obj.userData.zoneId : null;
    }
    return null;
  }

  domElement.addEventListener('pointermove', (e) => {
    const hit = getHitHotspot(e);
    domElement.style.cursor = hit ? 'pointer' : 'grab';
  });

  domElement.addEventListener('click', (e) => {
    const zoneId = getHitHotspot(e);
    if (zoneId) onSelectZone(zoneId);
  });

  function animateHotspots(time) {
    const scale = 1 + Math.sin(time * 4) * 0.25;
    hotspotMeshes.forEach((m) => {
      if (m.userData.halo) {
        m.userData.halo.scale.set(scale, scale, scale);
      }
    });
  }

  return { animateHotspots };
}