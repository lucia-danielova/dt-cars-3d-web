import * as THREE from 'three';

export function buildCarModel(scene) {
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  // Materiály s vysokým leskom (Clearcoat lak)
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: 0xd90429,
    metalness: 0.65,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x151821,
    metalness: 0.35,
    roughness: 0.45
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x090d16,
    metalness: 0.1,
    roughness: 0.06,
    transmission: 0.55,
    transparent: true,
    opacity: 0.86
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.16
  });

  const darkAlloyMat = new THREE.MeshStandardMaterial({
    color: 0x272e3f,
    metalness: 0.85,
    roughness: 0.25
  });

  const ledFrontMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 3.2
  });

  const ledRearMat = new THREE.MeshStandardMaterial({
    color: 0xff1e38,
    emissive: 0xff1e38,
    emissiveIntensity: 3.0
  });

  // Kontaktný tieň pod podvozkom
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 4.75),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.008;
  carGroup.add(shadowPlane);

  // Aerodynamický bočný profil karosérie (ExtrudeGeometry)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-2.15, 0.28);
  bodyShape.lineTo(2.15, 0.28);
  bodyShape.quadraticCurveTo(2.26, 0.44, 2.12, 0.64); // Predný nárazník
  bodyShape.lineTo(0.85, 0.78);  // Línia kapoty
  bodyShape.lineTo(0.22, 1.24);  // Čelné sklo
  bodyShape.quadraticCurveTo(-0.35, 1.29, -0.95, 1.20); // Strecha
  bodyShape.lineTo(-1.82, 0.84); // Zadné okno fastback
  bodyShape.lineTo(-2.16, 0.74); // Zadná odtrhová hrana
  bodyShape.quadraticCurveTo(-2.24, 0.48, -2.15, 0.28);

  const extrudeSettings = {
    steps: 2,
    depth: 1.66,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.07,
    bevelSegments: 5
  };

  const mainBodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  mainBodyGeo.center();
  // Otočenie profilu do osi Z (+Z = predok auta)
  mainBodyGeo.rotateY(Math.PI / 2);

  const mainBody = new THREE.Mesh(mainBodyGeo, paintMat);
  mainBody.position.set(0, 0.74, 0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  carGroup.add(mainBody);

  // Presklená kabína
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.55, 0.80);
  cabinShape.lineTo(0.75, 0.80);
  cabinShape.lineTo(0.18, 1.21);
  cabinShape.quadraticCurveTo(-0.35, 1.25, -0.90, 1.16);
  cabinShape.closePath();

  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    steps: 1,
    depth: 1.42,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 4
  });
  cabinGeo.center();
  cabinGeo.rotateY(Math.PI / 2);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, 1.01, -0.32);
  carGroup.add(cabinMesh);

  // Karbónový predný splitter, bočné prahy a zadný difúzor
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.05, 0.45), carbonMat);
  splitter.position.set(0, 0.23, 2.08);
  const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 2.2), carbonMat);
  skirtL.position.set(-0.96, 0.24, 0);
  const skirtR = skirtL.clone();
  skirtR.position.x = 0.96;

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.16, 0.35), carbonMat);
  diffuser.position.set(0, 0.28, -2.08);

  // Športový zadný spojler
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.24), carbonMat);
  wingBlade.position.set(0, 1.04, -2.04);
  wingBlade.rotation.x = 0.14;
  const wingStrutL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.14), carbonMat);
  wingStrutL.position.set(-0.52, 0.95, -2.02);
  const wingStrutR = wingStrutL.clone();
  wingStrutR.position.x = 0.52;

  carGroup.add(splitter, skirtL, skirtR, diffuser, wingBlade, wingStrutL, wingStrutR);

  // Predná maska a LED matrix svetlomety
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.08), carbonMat);
  grille.position.set(0, 0.42, 2.22);
  carGroup.add(grille);

  [-0.68, 0.68].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.12), ledFrontMat);
    headlight.position.set(x, 0.63, 2.15);
    headlight.rotation.y = x > 0 ? -0.22 : 0.22;
    carGroup.add(headlight);

    // Spätné zrkadlá
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), carbonMat);
    mirror.position.set(x * 1.48, 0.88, 0.58);
    carGroup.add(mirror);
  });

  // Zadná celoplošná LED svetelná lišta + 4 koncovky výfuku
  const rearLightBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.055, 0.08), ledRearMat);
  rearLightBar.position.set(0, 0.72, -2.21);
  carGroup.add(rearLightBar);

  [-0.58, -0.44, 0.44, 0.58].forEach((x) => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 20), alloyMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(x, 0.28, -2.22);
    carGroup.add(tip);
  });

  // Interiér kabíny (športové sedadlá, palubná doska, volant)
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.22, 0.36), carbonMat);
  dashboard.position.set(0, 0.76, 0.42);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 12, 24), carbonMat);
  steeringWheel.position.set(-0.36, 0.84, 0.22);
  steeringWheel.rotation.x = -0.35;
  carGroup.add(dashboard, steeringWheel);

  [-0.36, 0.36].forEach((x) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.46), carbonMat);
    base.position.set(x, 0.56, -0.15);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.12), carbonMat);
    back.position.set(x, 0.82, -0.36);
    back.rotation.x = -0.18;
    carGroup.add(base, back);
  });

  // Detailný motor V8 + modrý modul klimatizácie pod kapotou
  const engineGroup = new THREE.Group();
  engineGroup.position.set(0, 0.62, 1.38);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.30, 0.78), darkAlloyMat);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.66), paintMat);
  cover.position.y = 0.18;
  const strutBar = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.06), alloyMat);
  strutBar.position.set(0, 0.23, 0.12);

  // Kompresor a potrubie klimatizácie (zvýraznené modrou farbou)
  const acCompressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.2 })
  );
  acCompressor.rotation.z = Math.PI / 2;
  acCompressor.position.set(0.42, 0.10, 0.22);

  engineGroup.add(block, cover, strutBar, acCompressor);
  carGroup.add(engineGroup);

  // Otvárateľná kapota s pántom
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, 0.80, 0.82);
  const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.055, 1.18), paintMat);
  hoodMesh.position.set(0, 0.01, 0.58);
  hoodMesh.rotation.x = 0.08;
  hoodMesh.castShadow = true;
  hoodPivot.add(hoodMesh);
  carGroup.add(hoodPivot);

  // Otvárateľné nožnicové / športové dvere
  const doorLeftPivot = new THREE.Group();
  doorLeftPivot.position.set(-0.91, 0.56, 0.58);
  const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 1.18), paintMat);
  doorLeft.position.set(0, 0, -0.58);
  doorLeftPivot.add(doorLeft);

  const doorRightPivot = new THREE.Group();
  doorRightPivot.position.set(0.91, 0.56, 0.58);
  const doorRight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 1.18), paintMat);
  doorRight.position.set(0, 0, -0.58);
  doorRightPivot.add(doorRight);
  carGroup.add(doorLeftPivot, doorRightPivot);

  // 10-lúčové ALU disky, pneumatiky s profilom a brzdové kotúče
  const wheelPositions = [
    { x: -0.94, z: 1.38, side: -1 },
    { x: 0.94, z: 1.38, side: 1 },
    { x: -0.94, z: -1.36, side: -1 },
    { x: 0.94, z: -1.36, side: 1 }
  ];

  const wheels = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.82, metalness: 0.1 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.25, metalness: 0.5 });

  wheelPositions.forEach((wp) => {
    // Brzdový kotúč a červený brzdový strmeň
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 32), alloyMat);
    disc.rotation.z = Math.PI / 2;
    disc.position.set(wp.x - wp.side * 0.05, 0.39, wp.z);
    carGroup.add(disc);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.11), caliperMat);
    caliper.position.set(wp.x - wp.side * 0.05, 0.49, wp.z + 0.14);
    carGroup.add(caliper);

    // Zostava kolesa (pneumatika + lúčový disk)
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, 0.39, wp.z);
    wheelGroup.userData = { baseX: wp.x, side: wp.side };

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.26, 36), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rimBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.265, 32), darkAlloyMat);
    rimBarrel.rotation.z = Math.PI / 2;

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16), alloyMat);
    centerHub.rotation.z = Math.PI / 2;

    wheelGroup.add(tire, rimBarrel, centerHub);

    // 5 dvojitých Y-lúčov disku
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.275, 0.026, 0.25), alloyMat);
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    carGroup.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  // Stavy animácií a zmena laku
  const state = {
    hoodOpen: false,
    doorsOpen: false,
    wheelsExpanded: false
  };

  function setBodyColor(hexColor) {
    paintMat.color.set(hexColor);
  }

  function updateCarAnimations() {
    const targetHood = state.hoodOpen ? -0.66 : 0;
    hoodPivot.rotation.x += (targetHood - hoodPivot.rotation.x) * 0.1;

    const targetDoor = state.doorsOpen ? 0.72 : 0;
    doorLeftPivot.rotation.y += (-targetDoor - doorLeftPivot.rotation.y) * 0.1;
    doorRightPivot.rotation.y += (targetDoor - doorRightPivot.rotation.y) * 0.1;

    wheels.forEach((w) => {
      const offset = state.wheelsExpanded ? w.userData.side * 0.52 : 0;
      const targetX = w.userData.baseX + offset;
      w.position.x += (targetX - w.position.x) * 0.1;
      w.rotation.x += 0.015;
    });
  }

  return { carGroup, state, setBodyColor, updateCarAnimations };
}