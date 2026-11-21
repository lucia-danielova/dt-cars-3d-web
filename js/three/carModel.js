import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  loader.load(
    new URL('../../assets/models/CAR.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const axes = [
        { index: 0, size: size.x },
        { index: 1, size: size.y },
        { index: 2, size: size.z }
      ].sort((a, b) => b.size - a.size);
      const localToWorldAxes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      localToWorldAxes[axes[0].index].set(1, 0, 0);
      localToWorldAxes[axes[1].index].set(0, 0, 1);
      localToWorldAxes[axes[2].index].set(0, 1, 0);
      const alignmentMatrix = new THREE.Matrix4().makeBasis(...localToWorldAxes);
      if (alignmentMatrix.determinant() < 0) {
        localToWorldAxes[axes[1].index].negate();
        alignmentMatrix.makeBasis(...localToWorldAxes);
      }

      const alignedModel = new THREE.Group();
      alignedModel.quaternion.setFromRotationMatrix(alignmentMatrix);
      alignedModel.add(model);
      alignedModel.updateMatrixWorld(true);
      const alignedBounds = new THREE.Box3().setFromObject(alignedModel);
      const alignedSize = alignedBounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(alignedSize.x, alignedSize.y, alignedSize.z);
      if (maxDimension > 0) alignedModel.scale.setScalar(4.4 / maxDimension);

      alignedModel.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(alignedModel);
      const center = scaledBounds.getCenter(new THREE.Vector3());
      alignedModel.position.set(-center.x, -scaledBounds.min.y, -center.z);
      alignedModel.updateMatrixWorld(true);

      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!/^m4car_(body|hood|bodykit)/i.test(material.name)) return;
          bodyMaterials.add(material);
          material.color.set(bodyColor);
        });
      });

      carGroup.add(alignedModel);
    },
    undefined,
    (error) => {
      console.error('Nepodarilo sa načítať 3D model vozidla D&T CARS.', error);
    }
  );

  return { setBodyColor };
}
