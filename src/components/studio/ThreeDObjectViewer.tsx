import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Eye, Sparkles, X } from 'lucide-react';

interface ThreeDObjectViewerProps {
  type: 'heart' | 'turbine' | 'server' | 'molecule';
  title?: string;
  onClose?: () => void;
  interactiveMode?: boolean;
}

export const ThreeDObjectViewer: React.FC<ThreeDObjectViewerProps> = ({
  type,
  title,
  onClose,
  interactiveMode = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.5);
    dirLight2.position.set(-5, -3, -3);
    scene.add(dirLight2);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Create 3D geometry according to type
    let mainMesh: THREE.Mesh;
    const pulseObjects: THREE.Object3D[] = [];

    if (type === 'heart') {
      // Anatomical heart model using smooth stylized geometries
      const heartMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.3,
        metalness: 0.2,
      });
      const ventricleGeo = new THREE.TorusKnotGeometry(1, 0.35, 128, 20, 2, 3);
      mainMesh = new THREE.Mesh(ventricleGeo, heartMat);
      rootGroup.add(mainMesh);
      pulseObjects.push(mainMesh);

      // Coronary Artery highlighting
      const arteryMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.6,
      });
      const arteryGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.6, 0.8, 0.4),
          new THREE.Vector3(-0.2, 0.2, 0.8),
          new THREE.Vector3(0.1, -0.6, 0.6),
          new THREE.Vector3(0.4, -1.1, 0.2),
        ]),
        32,
        0.08,
        12,
        false
      );
      const arteryMesh = new THREE.Mesh(arteryGeo, arteryMat);
      rootGroup.add(arteryMesh);
    } else if (type === 'turbine') {
      // Modern Wind Turbine
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.8, 24), towerMat);
      tower.position.y = -0.5;
      rootGroup.add(tower);

      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), towerMat);
      nacelle.position.set(0, 0.9, 0);
      rootGroup.add(nacelle);

      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), towerMat);
      hub.position.set(0, 0.9, 0.45);
      rootGroup.add(hub);

      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 0.9, 0.45);
      rootGroup.add(rotorGroup);

      const bladeGeo = new THREE.BoxGeometry(0.12, 1.6, 0.04);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.8;
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = (i * Math.PI * 2) / 3;
        bladeHolder.add(blade);
        rotorGroup.add(bladeHolder);
      }
      pulseObjects.push(rotorGroup);
      mainMesh = tower;
    } else if (type === 'server') {
      // Blade Server Rack with glowing bays
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.8), rackMat);
      rootGroup.add(rack);
      mainMesh = rack;

      // Glowing drive bays
      for (let r = 0; r < 5; r++) {
        const bayMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: r === 2 ? 0xef4444 : 0x10b981,
          emissiveIntensity: 0.8,
        });
        const bay = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.85), bayMat);
        bay.position.set(0, 0.8 - r * 0.4, 0);
        rootGroup.add(bay);
      }
    } else {
      // Molecule (Caffeine / Receptor Ligand)
      const atomMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.2 });
      mainMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), atomMat);
      rootGroup.add(mainMesh);
    }

    // Mouse / Touch interaction handlers
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      rootGroup.rotation.y += deltaX * 0.01;
      rootGroup.rotation.x += deltaY * 0.01;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(2, Math.min(8, camera.position.z + e.deltaY * 0.005));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate && !isDragging) {
        rootGroup.rotation.y += 0.008;
      }

      if (type === 'heart' && pulseObjects[0]) {
        const scale = 1 + Math.sin(elapsedTime * 6) * 0.04;
        pulseObjects[0].scale.set(scale, scale, scale);
      } else if (type === 'turbine' && pulseObjects[0]) {
        pulseObjects[0].rotation.z -= 0.04;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [type, autoRotate]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-700/60 shadow-2xl flex flex-col">
      {/* 3D Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-200 font-semibold">{title || `Modèle 3D Interactif : ${type.toUpperCase()}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
              autoRotate ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            <span>Auto-Rotation</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Fermer la vue 3D"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* WebGL Canvas Holder */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative" />

      {/* 3D Footer Tips */}
      <div className="px-4 py-1.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
        <span>Glissez pour faire pivoter à 360° · Molette pour zoomer</span>
        <span className="font-mono text-indigo-400">Three.js WebGL Engine</span>
      </div>
    </div>
  );
};
