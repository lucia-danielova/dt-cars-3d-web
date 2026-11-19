import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090e);
  scene.fog = new THREE.FogExp2(0x07090e, 0.042);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  const defaultCamPos = new THREE.Vector3(3.9, 1.95, 4.5);
  const defaultTarget = new THREE.Vector3(0, 0.65, 0);
  camera.position.copy(defaultCamPos);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  container.appendChild(renderer.domElement);

  // Štúdiové odlesky pre lak karosérie, sklá a chrómové disky
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0d121c);

  const stripGeo = new THREE.PlaneGeometry(14, 2.2);
  const stripMatTop = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const topStrip = new THREE.Mesh(stripGeo, stripMatTop);
  topStrip.position.set(0, 7, 0);
  topStrip.rotation.x = Math.PI / 2;
  envScene.add(topStrip);

  const sideStripL = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xdbeafe, side: THREE.DoubleSide })
  );
  sideStripL.position.set(-7, 2.5, 0);
  sideStripL.rotation.y = Math.PI / 2;
  envScene.add(sideStripL);

  const sideStripR = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffe4e6, side: THREE.DoubleSide })
  );
  sideStripR.position.set(7, 2.5, 0);
  sideStripR.rotation.y = -Math.PI / 2;
  envScene.add(sideStripR);

  scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.4;
  controls.maxDistance = 8.8;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.target.copy(defaultTarget);

  // Štúdiové svetlá
  const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x0f172a, 0.65);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(4.5, 8.5, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xe63946, 1.3);
  rimLight.position.set(-5.5, 3.2, -5.0);
  scene.add(rimLight);

  const frontFill = new THREE.PointLight(0x38bdf8, 1.2, 10);
  frontFill.position.set(0, 1.4, 4.5);
  scene.add(frontFill);

  // Prémiové pódium
  const stageGeo = new THREE.CylinderGeometry(3.45, 3.68, 0.14, 72);
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x11151f,
    metalness: 0.72,
    roughness: 0.24
  });
  const stage = new THREE.Mesh(stageGeo, stageMat);
  stage.position.y = -0.07;
  stage.receiveShadow = true;
  scene.add(stage);

  const ringGeo = new THREE.RingGeometry(3.36, 3.45, 72);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  scene.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.48, 72),
    new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.003;
  scene.add(innerRing);

  const grid = new THREE.GridHelper(28, 28, 0x1e2536, 0x10141f);
  grid.position.y = -0.14;
  scene.add(grid);

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