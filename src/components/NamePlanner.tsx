import { nanoid } from 'nanoid';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  AiNameInputPackage,
  NameActor,
  NameActorPose,
  NameBubble,
  NameCameraPreset,
  NameScene
} from '../types/name';

interface ThreeNameStageHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const cameraLabels: Record<NameCameraPreset, string> = {
  wide: 'ワイド',
  close: '寄り',
  low: 'あおり',
  high: '俯瞰',
  overShoulder: '肩越し'
};

const poseLabels: Record<NameActorPose, string> = {
  standing: '立ち',
  contrapposto: '重心立ち',
  talking: '会話',
  pointing: '指差し',
  thinking: '考える',
  sitting: '座り',
  walking: '歩き',
  running: '走り',
  lookingBack: '振り返り',
  reaching: '手を伸ばす',
  surprised: '驚き'
};

const defaultScene = (): NameScene => ({
  title: 'ネーム案',
  cameraPreset: 'wide',
  shotType: '2人の会話コマ',
  cameraAngle: '目線の高さ、やや広角',
  mood: '静かな会話、漫画原稿の下描き構図',
  compositionNote: '人物の視線が交差する。吹き出しは上部に置き、人物の顔を隠さない。',
  aiPrompt:
    'Japanese manga panel, clean black and white line art, use the 3D mannequin layout as composition reference, keep speech bubble positions, draw expressive characters, manga manuscript style.',
  actors: [
    { id: nanoid(), name: '人物A', x: -1.1, z: 0, rotationY: 28, scale: 1, pose: 'talking' },
    { id: nanoid(), name: '人物B', x: 1.1, z: 0.15, rotationY: -28, scale: 1, pose: 'thinking' }
  ],
  bubbles: [
    { id: nanoid(), text: 'セリフA', x: 0.08, y: 0.08, width: 0.34, height: 0.15 },
    { id: nanoid(), text: 'セリフB', x: 0.58, y: 0.08, width: 0.34, height: 0.15 }
  ]
});

function clearGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (!child) {
      continue;
    }
    child.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
}

function deg(value: number) {
  return THREE.MathUtils.degToRad(value);
}

function setRotation(object: THREE.Object3D | undefined, x = 0, y = 0, z = 0) {
  if (!object) {
    return;
  }
  object.rotation.set(deg(x), deg(y), deg(z));
}

function createCapsule(length: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, 18), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createJointSphere(radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createLimbRig(
  side: 'left' | 'right',
  limb: 'Arm' | 'Leg',
  upperLength: number,
  lowerLength: number,
  radius: number,
  material: THREE.Material,
  jointMaterial: THREE.Material
) {
  const upper = new THREE.Group();
  upper.name = `${side}Upper${limb}`;

  const upperMesh = createCapsule(upperLength, radius, material);
  upperMesh.position.y = -upperLength / 2;
  upper.add(upperMesh);

  const middleJoint = createJointSphere(radius * 1.15, jointMaterial);
  middleJoint.position.y = -upperLength;
  upper.add(middleJoint);

  const lower = new THREE.Group();
  lower.name = `${side}Lower${limb}`;
  lower.position.y = -upperLength;
  const lowerMesh = createCapsule(lowerLength, radius * 0.92, material);
  lowerMesh.position.y = -lowerLength / 2;
  lower.add(lowerMesh);
  upper.add(lower);

  const end = createJointSphere(radius * 1.05, jointMaterial);
  end.name = `${side}${limb === 'Arm' ? 'Hand' : 'Foot'}`;
  end.position.y = -lowerLength;
  lower.add(end);

  if (limb === 'Leg') {
    end.scale.set(1.8, 0.5, 2.6);
    end.position.z = 0.05;
  }

  return upper;
}

function applyPose(group: THREE.Group, actor: NameActor) {
  const root = group.getObjectByName('actorRoot') as THREE.Group | undefined;
  const chest = group.getObjectByName('chest') as THREE.Mesh | undefined;
  const pelvis = group.getObjectByName('pelvis') as THREE.Mesh | undefined;
  const neck = group.getObjectByName('neckRig') as THREE.Group | undefined;
  const head = group.getObjectByName('head') as THREE.Mesh | undefined;
  const leftUpperArm = group.getObjectByName('leftUpperArm') as THREE.Group | undefined;
  const leftLowerArm = group.getObjectByName('leftLowerArm') as THREE.Group | undefined;
  const rightUpperArm = group.getObjectByName('rightUpperArm') as THREE.Group | undefined;
  const rightLowerArm = group.getObjectByName('rightLowerArm') as THREE.Group | undefined;
  const leftUpperLeg = group.getObjectByName('leftUpperLeg') as THREE.Group | undefined;
  const leftLowerLeg = group.getObjectByName('leftLowerLeg') as THREE.Group | undefined;
  const rightUpperLeg = group.getObjectByName('rightUpperLeg') as THREE.Group | undefined;
  const rightLowerLeg = group.getObjectByName('rightLowerLeg') as THREE.Group | undefined;

  if (
    !root ||
    !chest ||
    !pelvis ||
    !neck ||
    !head ||
    !leftUpperArm ||
    !leftLowerArm ||
    !rightUpperArm ||
    !rightLowerArm ||
    !leftUpperLeg ||
    !leftLowerLeg ||
    !rightUpperLeg ||
    !rightLowerLeg
  ) {
    return;
  }

  root.position.y = 0;
  setRotation(chest, 0, 0, 0);
  setRotation(pelvis, 0, 0, 0);
  setRotation(neck, 0, 0, 0);
  setRotation(head, 0, 0, 0);
  setRotation(leftUpperArm, 2, 0, -12);
  setRotation(leftLowerArm, 0, 0, -8);
  setRotation(rightUpperArm, 2, 0, 12);
  setRotation(rightLowerArm, 0, 0, 8);
  setRotation(leftUpperLeg, 0, 0, -4);
  setRotation(leftLowerLeg, 0, 0, 2);
  setRotation(rightUpperLeg, 0, 0, 4);
  setRotation(rightLowerLeg, 0, 0, -2);

  if (actor.pose === 'contrapposto') {
    setRotation(chest, 0, -6, -5);
    setRotation(pelvis, 0, 8, 6);
    setRotation(neck, 0, 8, 3);
    setRotation(leftUpperLeg, -2, 0, -8);
    setRotation(rightUpperLeg, 7, 0, 8);
    setRotation(rightLowerLeg, -8, 0, -4);
  }

  if (actor.pose === 'talking') {
    setRotation(chest, -2, -8, -2);
    setRotation(neck, 0, -12, -4);
    setRotation(rightUpperArm, -22, 0, 78);
    setRotation(rightLowerArm, -8, 0, -56);
    setRotation(leftUpperArm, 6, 0, -18);
  }

  if (actor.pose === 'pointing') {
    setRotation(chest, -4, -14, -3);
    setRotation(neck, 0, -18, -2);
    setRotation(rightUpperArm, -78, 2, 86);
    setRotation(rightLowerArm, -4, 0, 6);
    setRotation(leftUpperArm, 4, 0, -18);
  }

  if (actor.pose === 'thinking') {
    setRotation(chest, 4, 8, 3);
    setRotation(neck, 8, 10, 8);
    setRotation(rightUpperArm, -16, 0, 70);
    setRotation(rightLowerArm, -18, 0, 88);
    setRotation(leftUpperArm, 4, 0, -16);
  }

  if (actor.pose === 'sitting') {
    root.position.y = -0.32;
    setRotation(chest, 7, 0, 0);
    setRotation(leftUpperArm, 14, 0, -20);
    setRotation(rightUpperArm, 14, 0, 20);
    setRotation(leftUpperLeg, 72, 0, -6);
    setRotation(leftLowerLeg, -76, 0, 0);
    setRotation(rightUpperLeg, 72, 0, 6);
    setRotation(rightLowerLeg, -76, 0, 0);
  }

  if (actor.pose === 'walking') {
    setRotation(chest, -2, -4, 2);
    setRotation(leftUpperArm, 24, 0, -16);
    setRotation(leftLowerArm, -12, 0, -4);
    setRotation(rightUpperArm, -28, 0, 14);
    setRotation(rightLowerArm, -12, 0, 8);
    setRotation(leftUpperLeg, -28, 0, -5);
    setRotation(leftLowerLeg, 34, 0, 2);
    setRotation(rightUpperLeg, 28, 0, 6);
    setRotation(rightLowerLeg, -22, 0, -3);
  }

  if (actor.pose === 'running') {
    root.position.y = 0.08;
    setRotation(chest, -14, -8, 4);
    setRotation(neck, 10, 6, -3);
    setRotation(leftUpperArm, 58, 0, -30);
    setRotation(leftLowerArm, -82, 0, -10);
    setRotation(rightUpperArm, -68, 0, 24);
    setRotation(rightLowerArm, -82, 0, 14);
    setRotation(leftUpperLeg, -62, 0, -8);
    setRotation(leftLowerLeg, 78, 0, 5);
    setRotation(rightUpperLeg, 54, 0, 10);
    setRotation(rightLowerLeg, -78, 0, -6);
  }

  if (actor.pose === 'lookingBack') {
    setRotation(chest, 0, 24, -3);
    setRotation(pelvis, 0, -10, 4);
    setRotation(neck, 0, 54, -6);
    setRotation(head, 0, 16, 0);
    setRotation(leftUpperArm, 6, 0, -24);
    setRotation(rightUpperArm, 8, 0, 18);
    setRotation(leftUpperLeg, -8, 0, -4);
    setRotation(rightUpperLeg, 8, 0, 5);
  }

  if (actor.pose === 'reaching') {
    setRotation(chest, -8, -8, -5);
    setRotation(neck, -4, -8, -2);
    setRotation(rightUpperArm, -100, 0, 132);
    setRotation(rightLowerArm, -8, 0, 14);
    setRotation(leftUpperArm, -38, 0, -28);
    setRotation(leftLowerArm, -18, 0, -12);
    setRotation(leftUpperLeg, -10, 0, -4);
    setRotation(rightUpperLeg, 14, 0, 6);
  }

  if (actor.pose === 'surprised') {
    setRotation(chest, -4, 0, 0);
    setRotation(neck, -7, 0, 0);
    setRotation(leftUpperArm, -42, 0, -108);
    setRotation(leftLowerArm, -14, 0, -22);
    setRotation(rightUpperArm, -42, 0, 108);
    setRotation(rightLowerArm, -14, 0, 22);
    setRotation(leftUpperLeg, 4, 0, -8);
    setRotation(rightUpperLeg, 4, 0, 8);
  }
}

function createActor(actor: NameActor, selected: boolean) {
  const group = new THREE.Group();
  group.position.set(actor.x, 0, actor.z);
  group.rotation.y = THREE.MathUtils.degToRad(actor.rotationY);
  group.scale.setScalar(actor.scale);
  group.userData.actorId = actor.id;

  const root = new THREE.Group();
  root.name = 'actorRoot';
  group.add(root);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: selected ? '#d8c09c' : '#d5c0a3',
    metalness: 0.02,
    roughness: 0.74
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: selected ? '#0f766e' : '#475569',
    metalness: 0.05,
    roughness: 0.68
  });

  const pelvis = createCapsule(0.2, 0.17, bodyMaterial);
  pelvis.name = 'pelvis';
  pelvis.position.set(0, 1.55, 0);
  pelvis.scale.set(1.38, 0.58, 0.72);
  root.add(pelvis);

  const abdomen = createCapsule(0.5, 0.15, bodyMaterial);
  abdomen.name = 'abdomen';
  abdomen.position.set(0, 1.88, 0);
  abdomen.scale.set(0.96, 1, 0.68);
  root.add(abdomen);

  const chest = createCapsule(0.6, 0.19, bodyMaterial);
  chest.name = 'chest';
  chest.position.set(0, 2.3, 0);
  chest.scale.set(1.32, 1, 0.72);
  root.add(chest);

  const shoulderBar = createCapsule(0.56, 0.055, jointMaterial);
  shoulderBar.position.set(0, 2.56, 0);
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.scale.set(1, 1, 0.85);
  root.add(shoulderBar);

  const neckRig = new THREE.Group();
  neckRig.name = 'neckRig';
  neckRig.position.set(0, 2.74, 0);
  root.add(neckRig);

  const neckMesh = createCapsule(0.16, 0.07, bodyMaterial);
  neckMesh.position.y = 0;
  neckRig.add(neckMesh);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 18), bodyMaterial);
  head.name = 'head';
  head.position.y = 0.28;
  head.scale.set(0.84, 1.14, 0.78);
  head.castShadow = true;
  head.receiveShadow = true;
  neckRig.add(head);

  const faceMarker = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), jointMaterial);
  faceMarker.position.set(0, 0.31, 0.15);
  neckRig.add(faceMarker);

  const leftArm = createLimbRig('left', 'Arm', 0.58, 0.54, 0.05, bodyMaterial, jointMaterial);
  leftArm.position.set(-0.36, 2.52, 0);
  root.add(leftArm);

  const rightArm = createLimbRig('right', 'Arm', 0.58, 0.54, 0.05, bodyMaterial, jointMaterial);
  rightArm.position.set(0.36, 2.52, 0);
  root.add(rightArm);

  const leftLeg = createLimbRig('left', 'Leg', 0.78, 0.74, 0.065, bodyMaterial, jointMaterial);
  leftLeg.position.set(-0.16, 1.5, 0);
  root.add(leftLeg);

  const rightLeg = createLimbRig('right', 'Leg', 0.78, 0.74, 0.065, bodyMaterial, jointMaterial);
  rightLeg.position.set(0.16, 1.5, 0);
  root.add(rightLeg);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.46, 48),
    new THREE.MeshBasicMaterial({ color: '#0f766e', transparent: true, opacity: selected ? 1 : 0 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.02;
  group.add(marker);

  group.traverse((node) => {
    node.userData.actorId = actor.id;
  });
  applyPose(group, actor);
  return group;
}

function setCamera(camera: THREE.PerspectiveCamera, controls: OrbitControls, preset: NameCameraPreset) {
  const target = new THREE.Vector3(0, 2.0, 0);
  const positions: Record<NameCameraPreset, [number, number, number]> = {
    wide: [0, 3.15, 7.0],
    close: [0, 2.75, 4.8],
    low: [0, 1.25, 5.4],
    high: [0, 6.4, 5.1],
    overShoulder: [2.9, 2.75, 4.2]
  };
  const position = positions[preset];
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target);
  controls.target.copy(target);
  controls.update();
}

const ThreeNameStage = forwardRef<
  ThreeNameStageHandle,
  {
    sceneData: NameScene;
    selectedActorId: string | null;
    onSelectActor: (id: string) => void;
    onMoveActor: (id: string, x: number, z: number) => void;
  }
>(function ThreeNameStage({ sceneData, selectedActorId, onSelectActor, onMoveActor }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const actorLayerRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const dragActorIdRef = useRef<string | null>(null);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  useImperativeHandle(ref, () => ({
    getCanvas: () => rendererRef.current?.domElement ?? null
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0xf8fafc, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd1d5db, 2.4);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 5),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(7, 14, 0x94a3b8, 0xd1d5db);
    scene.add(grid);

    const thirds = new THREE.Group();
    const guideMaterial = new THREE.LineBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.28 });
    [-1, 1].forEach((x) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.01, -2.5),
        new THREE.Vector3(x, 0.01, 2.5)
      ]);
      thirds.add(new THREE.Line(geo, guideMaterial));
    });
    [-0.85, 0.85].forEach((z) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3.5, 0.01, z),
        new THREE.Vector3(3.5, 0.01, z)
      ]);
      thirds.add(new THREE.Line(geo, guideMaterial));
    });
    scene.add(thirds);

    const actorLayer = new THREE.Group();
    actorLayerRef.current = actorLayer;
    scene.add(actorLayer);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
      camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getGroundPoint = (event: PointerEvent) => {
      updatePointer(event);
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const point = new THREE.Vector3();
      return raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, point) ? point : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      updatePointer(event);
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(actorLayer.children, true);
      const actorId = hits.find((hit) => hit.object.userData.actorId)?.object.userData.actorId as string | undefined;
      if (actorId) {
        onSelectActor(actorId);
        dragActorIdRef.current = actorId;
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const actorId = dragActorIdRef.current;
      if (!actorId) {
        return;
      }
      const point = getGroundPoint(event);
      if (!point) {
        return;
      }
      const x = Math.max(-3, Math.min(3, Number(point.x.toFixed(2))));
      const z = Math.max(-2, Math.min(2, Number(point.z.toFixed(2))));
      onMoveActor(actorId, x, z);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragActorIdRef.current) {
        return;
      }
      dragActorIdRef.current = null;
      controls.enabled = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    let raf = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      observer.disconnect();
      controls.dispose();
      clearGroup(actorLayer);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onMoveActor, onSelectActor]);

  useEffect(() => {
    const actorLayer = actorLayerRef.current;
    if (!actorLayer) {
      return;
    }
    clearGroup(actorLayer);
    sceneData.actors.forEach((actor) => {
      actorLayer.add(createActor(actor, actor.id === selectedActorId));
    });
  }, [sceneData.actors, selectedActorId]);

  useEffect(() => {
    if (cameraRef.current && controlsRef.current) {
      setCamera(cameraRef.current, controlsRef.current, sceneData.cameraPreset);
    }
  }, [sceneData.cameraPreset]);

  return <div className="nameStage3d" ref={containerRef} />;
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={Number(value.toFixed(2))}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function drawBubble(ctx: CanvasRenderingContext2D, bubble: NameBubble, width: number, height: number) {
  const x = bubble.x * width;
  const y = bubble.y * height;
  const w = bubble.width * width;
  const h = bubble.height * height;
  ctx.save();
  ctx.lineWidth = Math.max(3, width * 0.004);
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.font = `${Math.max(20, width * 0.025)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, x + w / 2, y + h / 2);
  ctx.restore();
}

function buildAiPrompt(scene: NameScene) {
  const actors = scene.actors
    .map((actor) => `${actor.name}: x=${actor.x}, z=${actor.z}, rotation=${actor.rotationY}deg, pose=${poseLabels[actor.pose]}`)
    .join('\n');
  const bubbles = scene.bubbles
    .map((bubble, index) => `Bubble ${index + 1}: "${bubble.text}" at ${(bubble.x * 100).toFixed(0)}%/${(bubble.y * 100).toFixed(0)}%`)
    .join('\n');

  return [
    scene.aiPrompt,
    '',
    `Shot type: ${scene.shotType}`,
    `Camera: ${cameraLabels[scene.cameraPreset]} / ${scene.cameraAngle}`,
    `Mood: ${scene.mood}`,
    `Composition note: ${scene.compositionNote}`,
    '',
    'Use the attached reference image as layout/composition guide.',
    'Preserve the rough character positions, camera angle, and speech bubble placement.',
    'Convert mannequins into finished manga characters. Keep bubbles readable and do not cover faces.',
    '',
    'Actors:',
    actors,
    '',
    'Speech bubbles:',
    bubbles
  ].join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCanvas(filename: string, canvas: HTMLCanvasElement) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function composeReferenceCanvas(source: HTMLCanvasElement, bubbles: NameBubble[]) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  bubbles.forEach((bubble) => drawBubble(ctx, bubble, canvas.width, canvas.height));
  return canvas;
}

export function NamePlanner() {
  const [scene, setScene] = useState<NameScene>(() => defaultScene());
  const [selectedActorId, setSelectedActorId] = useState(scene.actors[0]?.id ?? null);
  const [selectedBubbleId, setSelectedBubbleId] = useState(scene.bubbles[0]?.id ?? null);
  const stageRef = useRef<ThreeNameStageHandle | null>(null);
  const selectedActor = scene.actors.find((actor) => actor.id === selectedActorId) ?? null;
  const selectedBubble = scene.bubbles.find((bubble) => bubble.id === selectedBubbleId) ?? null;
  const prompt = useMemo(() => buildAiPrompt(scene), [scene]);

  const updateScene = (patch: Partial<NameScene>) => setScene((current) => ({ ...current, ...patch }));
  const updateActor = useCallback((id: string, patch: Partial<NameActor>) =>
    setScene((current) => ({
      ...current,
      actors: current.actors.map((actor) => (actor.id === id ? { ...actor, ...patch } : actor))
    })), []);
  const updateBubble = (id: string, patch: Partial<NameBubble>) =>
    setScene((current) => ({
      ...current,
      bubbles: current.bubbles.map((bubble) => (bubble.id === id ? { ...bubble, ...patch } : bubble))
    }));
  const moveActor = useCallback((id: string, x: number, z: number) => updateActor(id, { x, z }), [updateActor]);

  const addActor = () => {
    const actor: NameActor = {
      id: nanoid(),
      name: `人物${scene.actors.length + 1}`,
      x: 0,
      z: 0,
      rotationY: 0,
      scale: 1,
      pose: 'standing'
    };
    setScene((current) => ({ ...current, actors: [...current.actors, actor] }));
    setSelectedActorId(actor.id);
  };

  const addBubble = () => {
    const bubble: NameBubble = {
      id: nanoid(),
      text: `セリフ${scene.bubbles.length + 1}`,
      x: 0.25,
      y: 0.08 + scene.bubbles.length * 0.08,
      width: 0.34,
      height: 0.15
    };
    setScene((current) => ({ ...current, bubbles: [...current.bubbles, bubble] }));
    setSelectedBubbleId(bubble.id);
  };

  const exportReference = () => {
    const source = stageRef.current?.getCanvas();
    if (!source) {
      return;
    }
    const canvas = composeReferenceCanvas(source, scene.bubbles);
    if (canvas) {
      downloadCanvas('name-reference.png', canvas);
    }
  };

  const exportPackage = () => {
    const pkg: AiNameInputPackage = {
      version: 1,
      scene,
      prompt,
      referenceImageNote: 'Use name-reference.png as composition, camera, mannequin, and speech bubble placement reference.'
    };
    downloadText('name-ai-input.json', JSON.stringify(pkg, null, 2));
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="namePlanner">
      <aside className="namePanel">
        <div className="sectionHeader">
          <h2>ネーム</h2>
          <button type="button" onClick={addActor}>人物追加</button>
        </div>
        <Field label="タイトル">
          <input value={scene.title} onChange={(event) => updateScene({ title: event.target.value })} />
        </Field>
        <Field label="カメラ">
          <select value={scene.cameraPreset} onChange={(event) => updateScene({ cameraPreset: event.target.value as NameCameraPreset })}>
            {Object.entries(cameraLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="コマ種別">
          <input value={scene.shotType} onChange={(event) => updateScene({ shotType: event.target.value })} />
        </Field>
        <Field label="カメラ角度">
          <input value={scene.cameraAngle} onChange={(event) => updateScene({ cameraAngle: event.target.value })} />
        </Field>
        <Field label="雰囲気">
          <input value={scene.mood} onChange={(event) => updateScene({ mood: event.target.value })} />
        </Field>
        <Field label="構図メモ">
          <textarea value={scene.compositionNote} onChange={(event) => updateScene({ compositionNote: event.target.value })} />
        </Field>

        <h3>人物</h3>
        <div className="nameList">
          {scene.actors.map((actor) => (
            <button
              key={actor.id}
              type="button"
              className={actor.id === selectedActorId ? 'isSelected' : ''}
              onClick={() => setSelectedActorId(actor.id)}
            >
              {actor.name}
            </button>
          ))}
        </div>
        {selectedActor && (
          <div className="fieldGrid">
            <Field label="名前">
              <input value={selectedActor.name} onChange={(event) => updateActor(selectedActor.id, { name: event.target.value })} />
            </Field>
            <Field label="ポーズ">
              <select value={selectedActor.pose} onChange={(event) => updateActor(selectedActor.id, { pose: event.target.value as NameActorPose })}>
                {Object.entries(poseLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <div className="fieldFull">
              <span className="fieldLabel">ポーズプリセット</span>
              <div className="posePresetGrid">
                {Object.entries(poseLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={selectedActor.pose === value ? 'isSelected' : ''}
                    onClick={() => updateActor(selectedActor.id, { pose: value as NameActorPose })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <NumberInput label="X" value={selectedActor.x} min={-3} max={3} onChange={(x) => updateActor(selectedActor.id, { x })} />
            <NumberInput label="奥行" value={selectedActor.z} min={-2} max={2} onChange={(z) => updateActor(selectedActor.id, { z })} />
            <NumberInput label="向き" value={selectedActor.rotationY} min={-180} max={180} step={5} onChange={(rotationY) => updateActor(selectedActor.id, { rotationY })} />
            <NumberInput label="大きさ" value={selectedActor.scale} min={0.5} max={1.8} step={0.05} onChange={(scale) => updateActor(selectedActor.id, { scale })} />
          </div>
        )}
      </aside>

      <main className="nameStageWrap">
        <ThreeNameStage
          ref={stageRef}
          sceneData={scene}
          selectedActorId={selectedActorId}
          onSelectActor={setSelectedActorId}
          onMoveActor={moveActor}
        />
        <div className="nameBubbleLayer">
          {scene.bubbles.map((bubble) => (
            <button
              key={bubble.id}
              type="button"
              className={`nameBubble ${bubble.id === selectedBubbleId ? 'isSelected' : ''}`}
              style={{
                left: `${bubble.x * 100}%`,
                top: `${bubble.y * 100}%`,
                width: `${bubble.width * 100}%`,
                height: `${bubble.height * 100}%`
              }}
              onClick={() => setSelectedBubbleId(bubble.id)}
            >
              {bubble.text}
            </button>
          ))}
        </div>
      </main>

      <aside className="namePanel">
        <div className="sectionHeader">
          <h2>AI入力</h2>
          <button type="button" onClick={addBubble}>吹き出し追加</button>
        </div>
        <Field label="生成指示">
          <textarea value={scene.aiPrompt} onChange={(event) => updateScene({ aiPrompt: event.target.value })} />
        </Field>

        <h3>吹き出し</h3>
        <div className="nameList">
          {scene.bubbles.map((bubble) => (
            <button
              key={bubble.id}
              type="button"
              className={bubble.id === selectedBubbleId ? 'isSelected' : ''}
              onClick={() => setSelectedBubbleId(bubble.id)}
            >
              {bubble.text}
            </button>
          ))}
        </div>
        {selectedBubble && (
          <div className="fieldGrid">
            <Field label="テキスト">
              <input value={selectedBubble.text} onChange={(event) => updateBubble(selectedBubble.id, { text: event.target.value })} />
            </Field>
            <NumberInput label="X%" value={selectedBubble.x * 100} min={0} max={95} step={1} onChange={(x) => updateBubble(selectedBubble.id, { x: x / 100 })} />
            <NumberInput label="Y%" value={selectedBubble.y * 100} min={0} max={95} step={1} onChange={(y) => updateBubble(selectedBubble.id, { y: y / 100 })} />
            <NumberInput label="幅%" value={selectedBubble.width * 100} min={10} max={80} step={1} onChange={(width) => updateBubble(selectedBubble.id, { width: width / 100 })} />
            <NumberInput label="高さ%" value={selectedBubble.height * 100} min={6} max={40} step={1} onChange={(height) => updateBubble(selectedBubble.id, { height: height / 100 })} />
          </div>
        )}

        <Field label="プロンプト">
          <textarea readOnly value={prompt} />
        </Field>
        <div className="exportButtons">
          <button type="button" onClick={() => void copyPrompt()}>プロンプトコピー</button>
          <button type="button" onClick={exportReference}>参照PNG</button>
          <button type="button" className="primaryButton" onClick={exportPackage}>AI入力JSON</button>
        </div>
      </aside>
    </div>
  );
}
