import * as THREE from 'three';

export function buildCarModel(scene) {
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  // Metalický lak s hlbokým clearcoat odleskom.
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0d12,
    metalness: 0.85,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 4
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x101216,
    metalness: 0.58,
    roughness: 0.3,
    envMapIntensity: 0.8
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x05070a,
    metalness: 0.25,
    roughness: 0.08,
    clearcoat: 1,
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0.94
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.78,
    roughness: 0.2,
    envMapIntensity: 2
  });

  const darkAlloyMat = new THREE.MeshStandardMaterial({
    color: 0x272e3f,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 1.3
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

  // Jemný kontaktný tieň, ktorý neprekrýva leštenú showroomovú podlahu.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(128, 128, 18, 128, 128, 128);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  shadowGradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 256, 256);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 5.2),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.8
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.008;
  carGroup.add(shadowPlane);

  // Aerodynamický profil so zaoblenými výrezmi pre blatníky.
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-2.2, 0.27);
  bodyShape.lineTo(-1.78, 0.27);
  bodyShape.bezierCurveTo(-1.74, 0.64, -1.56, 0.84, -1.36, 0.84);
  bodyShape.bezierCurveTo(-1.14, 0.84, -0.98, 0.64, -0.94, 0.27);
  bodyShape.lineTo(0.94, 0.27);
  bodyShape.bezierCurveTo(0.98, 0.64, 1.14, 0.84, 1.38, 0.84);
  bodyShape.bezierCurveTo(1.61, 0.84, 1.76, 0.64, 1.8, 0.27);
  bodyShape.lineTo(2.08, 0.27);
  bodyShape.quadraticCurveTo(2.24, 0.34, 2.2, 0.54);
  bodyShape.quadraticCurveTo(2.13, 0.7, 1.88, 0.74);
  bodyShape.lineTo(0.92, 0.9);
  bodyShape.lineTo(0.38, 1.3);
  bodyShape.quadraticCurveTo(-0.22, 1.43, -0.82, 1.25);
  bodyShape.lineTo(-1.72, 0.88);
  bodyShape.quadraticCurveTo(-2.18, 0.82, -2.2, 0.58);
  bodyShape.closePath();

  const extrudeSettings = {
    steps: 2,
    depth: 1.66,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.055,
    bevelSegments: 6
  };

  const mainBodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  mainBodyGeo.center();
  // +Z je predná časť vozidla.
  mainBodyGeo.rotateY(-Math.PI / 2);

  const mainBody = new THREE.Mesh(mainBodyGeo, paintMat);
  mainBody.position.set(0, 0.74, 0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  carGroup.add(mainBody);

  // Presklená kabína
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.58, 0.78);
  cabinShape.lineTo(0.73, 0.78);
  cabinShape.lineTo(0.22, 1.25);
  cabinShape.quadraticCurveTo(-0.28, 1.37, -0.78, 1.2);
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
  cabinGeo.rotateY(-Math.PI / 2);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, 0.98, -0.28);
  carGroup.add(cabinMesh);

  // Karbónový splitter, bočné prahy a zadný difúzor.
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

  const diffuserFins = [];
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.38), carbonMat);
    fin.position.set(i * 0.28, 0.25, -2.12);
    diffuserFins.push(fin);
  }
  carGroup.add(splitter, skirtL, skirtR, diffuser, ...diffuserFins, wingBlade, wingStrutL, wingStrutR);

  // Predný karbónový otvor a boomerangové LED svetlomety.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.08), carbonMat);
  grille.position.set(0, 0.42, 2.2);
  carGroup.add(grille);

  [-1, 1].forEach((side) => {
    const headlightPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.36, 0.69, 2.12),
      new THREE.Vector3(side * 0.56, 0.75, 2.16),
      new THREE.Vector3(side * 0.82, 0.7, 2.11),
      new THREE.Vector3(side * 0.71, 0.61, 2.14),
      new THREE.Vector3(side * 0.47, 0.62, 2.15)
    ]);
    const headlight = new THREE.Mesh(new THREE.TubeGeometry(headlightPath, 24, 0.028, 8, false), ledFrontMat);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.075, 0.14), carbonMat);
    mirror.position.set(side * 1.02, 0.86, 0.5);
    carGroup.add(headlight, mirror);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.58), carbonMat);
    intake.position.set(side * 0.84, 0.62, -0.2);
    intake.rotation.z = side * 0.12;
    carGroup.add(intake);
    [-0.07, 0, 0.07].forEach((offset) => {
      const ventSlat = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.44), darkAlloyMat);
      ventSlat.position.set(side * 0.89, 0.62 + offset, -0.2);
      ventSlat.rotation.z = side * 0.12;
      carGroup.add(ventSlat);
    });
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

  // Interiér kabíny (športové sedadlá, palubná doska a volant).
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

  // Detailný motor V8 a modrý modul klimatizácie pod kapotou.
  const engineGroup = new THREE.Group();
  engineGroup.position.set(0, 0.62, 1.38);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.30, 0.78), darkAlloyMat);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.66), paintMat);
  cover.position.y = 0.18;
  const intakeManifold = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.09, 0.3), alloyMat);
  intakeManifold.position.set(0, 0.12, 0.02);
  const strutBar = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.06), alloyMat);
  strutBar.position.set(0, 0.23, 0.12);
  const cylinderMat = new THREE.MeshStandardMaterial({
    color: 0x87909d,
    metalness: 0.76,
    roughness: 0.28
  });
  [-1, 1].forEach((side) => {
    const valveCover = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.62), darkAlloyMat);
    valveCover.position.set(side * 0.22, 0.22, 0);
    engineGroup.add(valveCover);
    for (let cylinderIndex = 0; cylinderIndex < 4; cylinderIndex++) {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12), cylinderMat);
      cylinder.position.set(side * 0.22, 0.29, -0.24 + cylinderIndex * 0.16);
      engineGroup.add(cylinder);
    }
  });

  // Kompresor a potrubie klimatizácie (zvýraznené modrou farbou)
  const acCompressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.2 })
  );
  acCompressor.rotation.z = Math.PI / 2;
  acCompressor.position.set(0.42, 0.10, 0.22);

  engineGroup.add(block, cover, intakeManifold, strutBar, acCompressor);
  carGroup.add(engineGroup);

  // Otvárateľná kapota s pántom
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, 0.80, 0.82);
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-0.58, 0);
  hoodShape.quadraticCurveTo(-0.7, -0.18, -0.66, -0.42);
  hoodShape.lineTo(-0.54, -1.12);
  hoodShape.quadraticCurveTo(0, -1.2, 0.54, -1.12);
  hoodShape.lineTo(0.66, -0.42);
  hoodShape.quadraticCurveTo(0.7, -0.18, 0.58, 0);
  hoodShape.closePath();
  const hoodGeometry = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.025,
    bevelSegments: 3
  });
  hoodGeometry.translate(0, 0, -0.022);
  hoodGeometry.rotateX(-Math.PI / 2);
  const hoodMesh = new THREE.Mesh(hoodGeometry, paintMat);
  hoodMesh.position.set(0, 0.01, 0);
  hoodMesh.castShadow = true;
  hoodPivot.add(hoodMesh);
  carGroup.add(hoodPivot);

  // Vyklápacie butterfly dvere s pántom pri prednom okraji.
  const doorLeftPivot = new THREE.Group();
  doorLeftPivot.position.set(-0.86, 0.56, 0.58);
  const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.43, 1.18), paintMat);
  doorLeft.position.set(-0.025, 0.08, -0.58);
  doorLeftPivot.add(doorLeft);

  const doorRightPivot = new THREE.Group();
  doorRightPivot.position.set(0.86, 0.56, 0.58);
  const doorRight = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.43, 1.18), paintMat);
  doorRight.position.set(0.025, 0.08, -0.58);
  doorRightPivot.add(doorRight);
  carGroup.add(doorLeftPivot, doorRightPivot);

  // Veľké dvojfarebné 10-lúčové disky, vŕtané kotúče a červené strmene.
  const wheelPositions = [
    { x: -0.94, z: 1.38, side: -1 },
    { x: 0.94, z: 1.38, side: 1 },
    { x: -0.94, z: -1.36, side: -1 },
    { x: 0.94, z: -1.36, side: 1 }
  ];

  const wheels = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.82, metalness: 0.1 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.25, metalness: 0.5 });
  const brakeHoleMat = new THREE.MeshBasicMaterial({ color: 0x171a20 });
  const brakeHoleGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8);
  const spokeGeometry = new THREE.BoxGeometry(0.032, 0.26, 0.05);
  const fenderLipGeometry = new THREE.TorusGeometry(0.46, 0.035, 8, 36, Math.PI);

  wheelPositions.forEach((wp) => {
    // Brzdový kotúč a červený brzdový strmeň
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.035, 40), darkAlloyMat);
    disc.rotation.z = Math.PI / 2;
    disc.position.set(wp.x - wp.side * 0.05, 0.39, wp.z);
    carGroup.add(disc);
    for (let holeIndex = 0; holeIndex < 10; holeIndex++) {
      const angle = (holeIndex / 10) * Math.PI * 2;
      const hole = new THREE.Mesh(brakeHoleGeometry, brakeHoleMat);
      hole.rotation.z = Math.PI / 2;
      hole.position.set(
        disc.position.x + wp.side * 0.022,
        0.39 + Math.sin(angle) * 0.255,
        wp.z + Math.cos(angle) * 0.255
      );
      carGroup.add(hole);
    }

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.11), caliperMat);
    caliper.position.set(wp.x - wp.side * 0.05, 0.49, wp.z + 0.14);
    carGroup.add(caliper);
    const fenderLip = new THREE.Mesh(fenderLipGeometry, carbonMat);
    fenderLip.rotation.y = Math.PI / 2;
    fenderLip.position.set(wp.x - wp.side * 0.1, 0.39, wp.z);

    // Zostava kolesa (pneumatika + lúčový disk)
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, 0.39, wp.z);
    wheelGroup.userData = { baseX: wp.x, side: wp.side };

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.28, 40, 1, true), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rimBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.285, 36, 1, true), darkAlloyMat);
    rimBarrel.rotation.z = Math.PI / 2;
    rimBarrel.position.x = wp.side * 0.15;

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16), alloyMat);
    centerHub.rotation.z = Math.PI / 2;
    centerHub.position.x = wp.side * 0.17;

    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.018, 10, 40), alloyMat);
    rimLip.rotation.y = Math.PI / 2;
    rimLip.position.x = wp.side * 0.17;
    const tireSidewall = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 12, 40), tireMat);
    tireSidewall.rotation.y = Math.PI / 2;
    tireSidewall.position.x = wp.side * 0.14;
    wheelGroup.add(tire, rimBarrel, centerHub, rimLip, tireSidewall);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeometry, i % 2 === 0 ? alloyMat : darkAlloyMat);
      spoke.position.set(wp.side * 0.18, Math.sin(angle) * 0.12, Math.cos(angle) * 0.12);
      spoke.rotation.x = Math.PI / 2 - angle;
      wheelGroup.add(spoke);
    }

    carGroup.add(fenderLip, wheelGroup);
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

    const targetDoor = state.doorsOpen ? 0.92 : 0;
    doorLeftPivot.rotation.z += (targetDoor - doorLeftPivot.rotation.z) * 0.1;
    doorRightPivot.rotation.z += (-targetDoor - doorRightPivot.rotation.z) * 0.1;

    wheels.forEach((w) => {
      const offset = state.wheelsExpanded ? w.userData.side * 0.52 : 0;
      const targetX = w.userData.baseX + offset;
      w.position.x += (targetX - w.position.x) * 0.1;
      w.rotation.x += 0.015;
    });
  }

  return { carGroup, state, setBodyColor, updateCarAnimations };
}