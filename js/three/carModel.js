import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export function buildCarModel(scene) {
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const state = {
    hoodOpen: false,
    doorsOpen: false,
    wheelsExpanded: false
  };
  const bodyMaterials = new Set();
  const wheels = [];
  let doorPivot = null;
  let bodyColor = '#0b0d12';

  function setBodyColor(hexColor) {
    bodyColor = hexColor;
    bodyMaterials.forEach((material) => material.color.set(hexColor));
  }

  function updateCarAnimations() {
    if (doorPivot) {
      const targetRotation = state.doorsOpen ? -0.72 : 0;
      doorPivot.rotation.y += (targetRotation - doorPivot.rotation.y) * 0.1;
    }

    wheels.forEach((wheel) => {
      const offset = state.wheelsExpanded ? wheel.userData.side * 0.45 : 0;
      const targetX = wheel.userData.baseX + offset;
      wheel.position.x += (targetX - wheel.position.x) * 0.1;
      wheel.rotation.x += 0.015;
    });
  }

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    new URL('../../models/Chevrolet_Camaro_SS.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene;

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) model.scale.setScalar(4.4 / maxDim);

      const scaledBounds = new THREE.Box3().setFromObject(model);
      const center = scaledBounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -scaledBounds.min.y, -center.z);
      carGroup.add(model);

      const bodyMaterialCopies = new Map();
      const wheelNames = ['Rueda_Ad_De', 'Rueda_Ad_Iz', 'Rueda_At_De', 'Rueda_At_Iz'];
      let doorsNode = null;
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          const isProxyMesh = node.name === 'Cubo.002' || node.geometry.name === 'Cubo.002';
          if (isProxyMesh) {
            const hideProxyMaterial = (material) => {
              const hiddenMaterial = material.clone();
              hiddenMaterial.visible = false;
              return hiddenMaterial;
            };
            node.material = Array.isArray(node.material)
              ? node.material.map(hideProxyMaterial)
              : hideProxyMaterial(node.material);
          }

          const applyBodyFinish = (material) => {
            if (material.name !== 'Material') return material;

            let bodyMaterial = bodyMaterialCopies.get(material);
            if (!bodyMaterial) {
              bodyMaterial = new THREE.MeshPhysicalMaterial().copy(material);
              bodyMaterial.metalness = 0.85;
              bodyMaterial.roughness = 0.22;
              bodyMaterial.clearcoat = 1;
              bodyMaterial.clearcoatRoughness = 0.08;
              bodyMaterial.color.set(bodyColor);
              bodyMaterialCopies.set(material, bodyMaterial);
              bodyMaterials.add(bodyMaterial);
            }
            return bodyMaterial;
          };

          const updateMaterial = isProxyMesh ? (material) => material : applyBodyFinish;
          node.material = Array.isArray(node.material)
            ? node.material.map(updateMaterial)
            : updateMaterial(node.material);
        }

        if (wheelNames.includes(node.name)) {
          node.userData.baseX = node.position.x;
          node.userData.side = node.position.x >= 0 ? 1 : -1;
          wheels.push(node);
        }

        if (node.name === 'Pueratas') doorsNode = node;
      });

      if (doorsNode) {
        const doorBounds = new THREE.Box3().setFromObject(doorsNode);
        const hinge = new THREE.Vector3(
          doorBounds.max.x,
          doorBounds.getCenter(new THREE.Vector3()).y,
          doorBounds.max.z
        );
        const doorParent = doorsNode.parent;
        doorParent.worldToLocal(hinge);
        doorPivot = new THREE.Group();
        doorParent.add(doorPivot);
        doorPivot.position.copy(hinge);
        doorPivot.attach(doorsNode);
      }
    },
    undefined,
    (error) => {
      console.error('Nepodarilo sa načítať 3D model Chevrolet Camaro SS.', error);
    }
  );

  return { carGroup, state, setBodyColor, updateCarAnimations };
}
