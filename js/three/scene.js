import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090a0d);
  scene.fog = new THREE.FogExp2(0x090a0d, 0.018);

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    140
  );
  const defaultCamPos = new THREE.Vector3(4.6, 2.7, 6.8);
  const defaultTarget = new THREE.Vector3(0, 0.75, 0);
  camera.position.copy(defaultCamPos);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // Jasné panely v HDRI scéne vytvárajú široké štúdiové odlesky na laku.
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x151920);
  const envPanels = [
    { size: [13, 1.1], position: [0, 4.4, 2.5], rotation: [-Math.PI / 2, 0, 0] },
    { size: [13, 0.75], position: [0, 4.4, -3.2], rotation: [-Math.PI / 2, 0, 0] },
    { size: [0.85, 10], position: [-4.6, 2.8, 0], rotation: [0, Math.PI / 2, 0] },
    { size: [0.85, 10], position: [4.6, 2.8, 0], rotation: [0, -Math.PI / 2, 0] },
    { size: [9, 0.8], position: [0, 2.8, -5.2], rotation: [0, 0, 0] }
  ];
  envPanels.forEach(({ size, position, rotation }) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(...size),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    panel.position.set(...position);
    panel.rotation.set(...rotation);
    envScene.add(panel);
  });
  const environment = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 2.2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.target.copy(defaultTarget);

  // Leštená betónová podlaha s jemným odrazom.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({
      color: 0x0d1014,
      metalness: 0.06,
      roughness: 0.68,
      envMapIntensity: 0.35
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1015,
    metalness: 0.12,
    roughness: 0.82
  });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(28, 5.2, 0.35), wallMaterial);
  backWall.position.set(0, 2.6, -12);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 26), wallMaterial);
  leftWall.position.set(-10, 2.6, 0);
  const rightWall = leftWall.clone();
  rightWall.position.x = 10;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 28), wallMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5;
  scene.add(backWall, leftWall, rightWall, ceiling);

  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1e25,
    metalness: 0.36,
    roughness: 0.34
  });
  const pillars = [];
  [-8.7, 8.7].forEach((x) => {
    [-8, -3, 2, 7].forEach((z) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.8, 0.42), pillarMaterial);
      pillar.position.set(x, 2.4, z);
      pillar.castShadow = true;
      pillars.push(pillar);
    });
  });
  scene.add(...pillars);

  const ledMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 6,
    roughness: 0.25
  });
  const ledStrips = [];
  [-5.7, -2.9, 2.9, 5.7].forEach((x) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 18), ledMaterial);
    strip.position.set(x, 4.82, -1.5);
    ledStrips.push(strip);
  });
  [-1, 1].forEach((side) => {
    [-7, -2, 3, 8].forEach((z) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 4.2), ledMaterial);
      strip.position.set(side * 9.79, 4.3, z);
      ledStrips.push(strip);
    });
  });
  for (let i = -1; i <= 1; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.045, 0.04), ledMaterial);
    strip.position.set(0, 3.5 + i * 0.36, -11.79);
    ledStrips.push(strip);
  }
  scene.add(...ledStrips);

  // Mäkké štúdiové svetlá dopĺňajú odrazové pásy v environment mape.
  const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x171a20, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4.5, 8, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -5;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x9caec6, 2.1);
  rimLight.position.set(-5.5, 3.8, -4.5);
  scene.add(rimLight);

  [-1, 1].forEach((side) => {
    const fill = new THREE.PointLight(0xffffff, 5, 14, 2);
    fill.position.set(side * 4.5, 3.1, 0);
    scene.add(fill);
  });
  const frontFill = new THREE.PointLight(0xdce9ff, 4, 12, 2);
  frontFill.position.set(0, 3.2, 5.5);
  scene.add(frontFill);

  // Plynulá animácia kamery
  let targetCamPos = null;
  let targetLookAt = null;

  function focusCamera(posArr, lookArr) {
    targetCamPos = new THREE.Vector3(...posArr);
    targetLookAt = new THREE.Vector3(...lookArr);
  }

  function resetCamera() {
    targetCamPos = defaultCamPos.clone();
    targetLookAt = defaultTarget.clone();
  }

  function updateCamera() {
    if (targetCamPos && targetLookAt) {
      camera.position.lerp(targetCamPos, 0.075);
      controls.target.lerp(targetLookAt, 0.075);
      if (camera.position.distanceTo(targetCamPos) < 0.025) {
        targetCamPos = null;
        targetLookAt = null;
      }
    }
    controls.update();
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, focusCamera, resetCamera, updateCamera };
}