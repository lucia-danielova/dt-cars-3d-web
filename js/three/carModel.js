import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODEL_LENGTH = 4.6;
const DEFAULT_BODY_COLOR = '#3b4048';

function trackPart(object, shiftAxis = new THREE.Vector3(1, 0, 0)) {
  return {
    object,
    rotation: object.rotation.clone(),
    position: object.position.clone(),
    shiftAxis
  };
}

export function buildCarModel(scene) {
  const carRoot = new THREE.Group();
  scene.add(carRoot);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_BODY_COLOR,
    metalness: 0.82,
    roughness: 0.26,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12
  });
  const bodyMaterials = new Set([bodyMaterial]);
  let selectedBodyColor = null;
  const parts = {
    hood: null,
    leftDoor: null,
    rightDoor: null,
    leftWheels: [],
    rightWheels: []
  };
  const state = {
    hoodOpen: false,
    doorsOpen: false,
    wheelsExpanded: false,
    hoodAngle: 0,
    doorAngle: 0,
    wheelOffset: 0
  };

  const fallbackGroup = createProceduralCoupe(bodyMaterial, parts);
  carRoot.add(fallbackGroup);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  dracoLoader.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(
    new URL('../../assets/models/car-draco.glb', import.meta.url).href,
    (gltf) => {
      const model = gltf.scene;
      const alignedModel = alignModel(model);
      const loadedParts = {
        hood: null,
        leftDoor: null,
        rightDoor: null,
        leftWheels: [],
        rightWheels: []
      };
      const candidates = { hood: null, leftDoor: null, rightDoor: null, wheels: [] };
      const trackedWheelNodes = new Set();

      model.updateMatrixWorld(true);
      model.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (!material || !/^m4car_(body|hood|bodykit)/i.test(material.name)) return;
            bodyMaterials.add(material);
            if (selectedBodyColor !== null) material.color.set(selectedBodyColor);
          });
        }

        const name = (object.name || '').toLowerCase();
        if (!candidates.hood && /(hood|bonnet|capot)/.test(name)) {
          candidates.hood = object;
        }
        if (object.children.length > 0 && /(door|puerta)/.test(name)) {
          if (!candidates.leftDoor && /(left|_l|izq)/.test(name)) {
            candidates.leftDoor = object;
          } else if (!candidates.rightDoor && /(right|_r|der)/.test(name)) {
            candidates.rightDoor = object;
          }
        }
        if (/^(3d.?wheel|tire\s+(front|rear))/.test(name) && object.children.length > 0) {
          let parent = object.parent;
          while (parent && !trackedWheelNodes.has(parent)) parent = parent.parent;
          if (parent) return;

          trackedWheelNodes.add(object);
          candidates.wheels.push(object);
        }
      });

      if (candidates.hood) {
        const bounds = new THREE.Box3().setFromObject(candidates.hood);
        const hinge = new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y, bounds.max.z);
        loadedParts.hood = createWorldPivot(alignedModel, candidates.hood, hinge);
      }
      if (candidates.leftDoor) {
        const bounds = new THREE.Box3().setFromObject(candidates.leftDoor);
        const hinge = new THREE.Vector3(bounds.min.x, (bounds.min.y + bounds.max.y) / 2, bounds.max.z);
        loadedParts.leftDoor = createWorldPivot(alignedModel, candidates.leftDoor, hinge);
      }
      if (candidates.rightDoor) {
        const bounds = new THREE.Box3().setFromObject(candidates.rightDoor);
        const hinge = new THREE.Vector3(bounds.max.x, (bounds.min.y + bounds.max.y) / 2, bounds.max.z);
        loadedParts.rightDoor = createWorldPivot(alignedModel, candidates.rightDoor, hinge);
      }
      candidates.wheels.forEach((object) => {
        const bounds = new THREE.Box3().setFromObject(object);
        const center = bounds.getCenter(new THREE.Vector3());
        const wheel = createWorldPivot(alignedModel, object, center);
        const side = center.x < 0 ? -1 : 1;
        (side < 0 ? loadedParts.leftWheels : loadedParts.rightWheels).push({ ...wheel, side });
      });

      Object.assign(parts, loadedParts);
      carRoot.remove(fallbackGroup);
      carRoot.add(alignedModel);
      dracoLoader.dispose();
    },
    undefined,
    (error) => {
      console.error('Nepodarilo sa načítať Draco model vozidla D&T CARS; zostáva procedurálny fallback.', error);
      dracoLoader.dispose();
    }
  );

  function setBodyColor(hexColor) {
    selectedBodyColor = hexColor;
    bodyMaterials.forEach((material) => material.color.set(hexColor));
  }

  function setHoodOpen(isOpen) {
    state.hoodOpen = Boolean(isOpen);
  }

  function setDoorsOpen(isOpen) {
    state.doorsOpen = Boolean(isOpen);
  }

  function setWheelsExpanded(isExpanded) {
    state.wheelsExpanded = Boolean(isExpanded);
  }

  function updateCarAnimations() {
    state.hoodAngle += ((state.hoodOpen ? 0.58 : 0) - state.hoodAngle) * 0.1;
    state.doorAngle += ((state.doorsOpen ? 0.65 : 0) - state.doorAngle) * 0.1;
    state.wheelOffset += ((state.wheelsExpanded ? 0.28 : 0) - state.wheelOffset) * 0.1;

    if (parts.hood) {
      parts.hood.object.rotation.set(
        parts.hood.rotation.x - state.hoodAngle,
        parts.hood.rotation.y,
        parts.hood.rotation.z
      );
    }
    if (parts.leftDoor) {
      parts.leftDoor.object.rotation.set(
        parts.leftDoor.rotation.x,
        parts.leftDoor.rotation.y - state.doorAngle,
        parts.leftDoor.rotation.z
      );
    }
    if (parts.rightDoor) {
      parts.rightDoor.object.rotation.set(
        parts.rightDoor.rotation.x,
        parts.rightDoor.rotation.y + state.doorAngle,
        parts.rightDoor.rotation.z
      );
    }

    parts.leftWheels.forEach((wheel) => {
      wheel.object.position.copy(wheel.position).addScaledVector(wheel.shiftAxis, -state.wheelOffset);
    });
    parts.rightWheels.forEach((wheel) => {
      wheel.object.position.copy(wheel.position).addScaledVector(wheel.shiftAxis, state.wheelOffset);
    });
  }

  return { setBodyColor, setHoodOpen, setDoorsOpen, setWheelsExpanded, updateCarAnimations };
}

function alignModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const axes = [
    { index: 0, size: size.x },
    { index: 1, size: size.y },
    { index: 2, size: size.z }
  ].sort((a, b) => b.size - a.size);
  const localToWorldAxes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  localToWorldAxes[axes[0].index].set(0, 0, 1);
  localToWorldAxes[axes[1].index].set(1, 0, 0);
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
  if (maxDimension > 0) alignedModel.scale.setScalar(MODEL_LENGTH / maxDimension);

  alignedModel.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(alignedModel);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  alignedModel.position.set(-center.x, -scaledBounds.min.y, -center.z);
  return alignedModel;
}

function createWorldPivot(root, object, anchorWorld) {
  root.updateMatrixWorld(true);
  const anchorLocal = root.worldToLocal(anchorWorld.clone());
  const shiftedLocal = root.worldToLocal(anchorWorld.clone().add(new THREE.Vector3(1, 0, 0)));
  const shiftAxis = shiftedLocal.sub(anchorLocal);
  const rootRotation = root.getWorldQuaternion(new THREE.Quaternion());
  const pivot = new THREE.Group();
  pivot.position.copy(anchorLocal);
  pivot.quaternion.copy(rootRotation).invert();
  root.add(pivot);
  root.updateMatrixWorld(true);
  pivot.attach(object);
  return trackPart(pivot, shiftAxis);
}

function createProceduralCoupe(bodyMaterial, parts) {
  const group = new THREE.Group();
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.45, metalness: 0.4 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x101923,
    metalness: 0.12,
    roughness: 0.14,
    transmission: 0.18,
    transparent: true,
    opacity: 0.94
  });
  const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.56, 4.45), bodyMaterial);
  chassis.position.y = 0.54;
  chassis.castShadow = true;
  group.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.48, 2.05), glassMaterial);
  cabin.position.set(0, 1.02, -0.18);
  group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 1.65), bodyMaterial);
  roof.position.set(0, 1.27, -0.22);
  group.add(roof);

  const hood = new THREE.Group();
  hood.position.set(0, 0.83, 0.78);
  const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 1.38), bodyMaterial);
  hoodPanel.position.z = 0.68;
  hood.add(hoodPanel);
  group.add(hood);
  parts.hood = trackPart(hood);

  const engine = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.36, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
  );
  engine.position.set(0, 0.68, 1.42);
  group.add(engine);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.08, 0.35), darkMaterial);
  splitter.position.set(0, 0.26, 2.18);
  group.add(splitter);

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.16, 0.3), darkMaterial);
  diffuser.position.set(0, 0.3, -2.18);
  group.add(diffuser);

  [-0.68, 0.68].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.08), headlightMaterial);
    headlight.position.set(x, 0.64, 2.22);
    group.add(headlight);
  });
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.07, 0.06), taillightMaterial);
  taillight.position.set(0, 0.72, -2.23);
  group.add(taillight);

  const leftDoor = createDoor(bodyMaterial, -1);
  const rightDoor = createDoor(bodyMaterial, 1);
  group.add(leftDoor, rightDoor);
  parts.leftDoor = trackPart(leftDoor);
  parts.rightDoor = trackPart(rightDoor);

  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.75 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 });
  const caliperMaterial = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 });
  const wheelPositions = [
    [-0.96, 0.38, 1.36],
    [0.96, 0.38, 1.36],
    [-0.96, 0.38, -1.36],
    [0.96, 0.38, -1.36]
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 28), tireMaterial);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.29, 20), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), caliperMaterial);
    caliper.position.set(x < 0 ? 0.06 : -0.06, 0.1, 0.12);
    wheel.add(caliper);
    group.add(wheel);
    (x < 0 ? parts.leftWheels : parts.rightWheels).push(trackPart(wheel));
  });

  return group;
}

function createDoor(material, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.97, 0.56, 0.55);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.25), material);
  panel.position.z = -0.62;
  pivot.add(panel);
  return pivot;
}
