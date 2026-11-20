import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function buildCarModel(scene) {
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const state = {
    hoodOpen: false,
    doorsOpen: false,
    wheelsExpanded: false
  };
  const wheelParts = [];
  let bodyMaterial = null;
  let bodyColor = '#0b0d12';

  function setBodyColor(hexColor) {
    bodyColor = hexColor;
    if (bodyMaterial) bodyMaterial.color.set(hexColor);
  }

  function updateCarAnimations() {
    wheelParts.forEach((wheel) => {
      const offset = state.wheelsExpanded ? Math.sign(wheel.baseX) * 0.45 : 0;
      const targetX = wheel.baseX + offset;
      wheel.node.position.x += (targetX - wheel.node.position.x) * 0.1;
      wheel.node.rotation.x += 0.015;
    });
  }

  const loader = new GLTFLoader();
  loader.load(
    new URL('../../models/Chevrolet_Camaro_SS.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 4.4 / size.z;

      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      carGroup.add(model);
      model.updateMatrixWorld(true);

      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (material.name === 'Material') {
              bodyMaterial = material;
              material.color.set(bodyColor);
            }
          });
        }

        if (/^Rueda_(Ad|At)_/.test(node.name)) {
          wheelParts.push({ node, baseX: node.position.x });
        }
      });
    },
    undefined,
    (error) => {
      console.error('Nepodarilo sa načítať 3D model Chevrolet Camaro SS.', error);
    }
  );

  return { carGroup, state, setBodyColor, updateCarAnimations };
}
