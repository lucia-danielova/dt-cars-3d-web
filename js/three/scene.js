import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    140
  );
  const defaultCamPos = new THREE.Vector3(0.35, 2.6, 8.5);
  const defaultTarget = new THREE.Vector3(0, 1.4, 0);
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
  envScene.background = new THREE.Color(0xf8fafc);
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
  scene.environmentIntensity = 1.7;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.target.copy(defaultTarget);

  // Svetlá matná podlaha drží štúdiové pozadie čisté a bez viditeľného horizontu.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0,
      roughness: 0.9,
      envMapIntensity: 0.12
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
  shadowGradient.addColorStop(0.48, 'rgba(15, 23, 42, 0.1)');
  shadowGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false
  });
  const bodyShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.9), shadowMaterial);
  bodyShadow.rotation.x = -Math.PI / 2;
  bodyShadow.position.set(0, 0.018, 0);
  scene.add(bodyShadow);
  [-1, 1].forEach((x) => {
    [-1, 1].forEach((z) => {
      const wheelShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.68), shadowMaterial);
      wheelShadow.rotation.x = -Math.PI / 2;
      wheelShadow.position.set(x * 1.12, 0.022, z * 0.45);
      scene.add(wheelShadow);
    });
  });

  const platformMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ab8bd,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide
  });
  const platformRing = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.018, 8, 160), platformMaterial);
  platformRing.rotation.x = -Math.PI / 2;
  platformRing.position.y = 0.012;
  const platformOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.72, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({
      color: 0xd5dee6,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide
    })
  );
  platformOuterRing.rotation.x = -Math.PI / 2;
  platformOuterRing.position.y = 0.009;
  scene.add(platformRing, platformOuterRing);

  // Mäkké štúdiové svetlá zachovávajú kontrast laku na bielom pozadí.
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(4.5, 8, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -5;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x9caec6, 1.4);
  rimLight.position.set(-5.5, 3.8, -4.5);
  scene.add(rimLight);

  [-1, 1].forEach((side) => {
    const fill = new THREE.PointLight(0xffffff, 2.8, 14, 2);
    fill.position.set(side * 4.5, 3.1, 0);
    scene.add(fill);
  });
  const frontFill = new THREE.PointLight(0xdce9ff, 2.4, 12, 2);
  frontFill.position.set(0, 3.2, 5.5);
  scene.add(frontFill);
  const cyanFill = new THREE.PointLight(0x35dfd0, 0.8, 10, 2);
  cyanFill.position.set(-4.2, 1.6, 1.8);
  scene.add(cyanFill);
  const amberFill = new THREE.PointLight(0xffad43, 0.9, 8, 2);
  amberFill.position.set(0, 1.1, 4.1);
  scene.add(amberFill);

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