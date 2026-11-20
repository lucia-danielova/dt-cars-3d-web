import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export function buildCarModel(scene) {
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const bodyMaterials = new Set();
  let bodyColor = '#c5cbd2';

  function setBodyColor(hexColor) {
    bodyColor = hexColor;
    bodyMaterials.forEach((material) => material.color.set(hexColor));
  }

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    new URL('../../assets/models/dt-cars-suv.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.x += Math.PI / 2;

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) model.scale.setScalar(4.4 / maxDim);

      const scaledBounds = new THREE.Box3().setFromObject(model);
      const scaledSize = scaledBounds.getSize(new THREE.Vector3());
      const center = scaledBounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -scaledBounds.min.y, -center.z);
      carGroup.add(model);
      model.visible = false;

      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        new URL('../../assets/models/dt-cars-suv-cutout.png', import.meta.url).href,
        (sourceTexture) => {
          sourceTexture.colorSpace = THREE.SRGBColorSpace;
          const spriteMaterial = new THREE.SpriteMaterial({
            map: sourceTexture,
            transparent: true,
            alphaTest: 0.02,
            depthWrite: false,
            color: bodyColor
          });
          const vehicleSprite = new THREE.Sprite(spriteMaterial);
          vehicleSprite.position.set(0, scaledSize.y / 2, 0.25);
          vehicleSprite.scale.set(scaledSize.x, scaledSize.y, 1);
          carGroup.add(vehicleSprite);
          bodyMaterials.add(spriteMaterial);
        },
        undefined,
        (error) => {
          console.error('Nepodarilo sa načítať vizuálnu textúru vozidla.', error);
        }
      );

    },
    undefined,
    (error) => {
      console.error('Nepodarilo sa načítať 3D model vozidla D&T CARS.', error);
    }
  );

  return { setBodyColor };
}
