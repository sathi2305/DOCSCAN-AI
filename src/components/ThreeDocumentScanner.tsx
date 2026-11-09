import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ScanEye, Play, Pause, RotateCcw } from 'lucide-react';

interface ThreeDocumentScannerProps {
  className?: string;
  height?: number;
}

export const ThreeDocumentScanner: React.FC<ThreeDocumentScannerProps> = ({
  className = '',
  height: propHeight,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeScanStatus, setActiveScanStatus] = useState<string>('Optical Scanning Active');
  const [scanSpeed, setScanSpeed] = useState<number>(1.0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 480;
    let height = propHeight || container.clientHeight || 360;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 2.5, 6.2);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 1. Lighting
    const ambient = new THREE.AmbientLight(0x0a1024, 2.0);
    scene.add(ambient);

    const cyanSpot = new THREE.SpotLight(0x28dfff, 4.0, 15, Math.PI / 4, 0.3);
    cyanSpot.position.set(2, 5, 3);
    scene.add(cyanSpot);

    const violetRim = new THREE.PointLight(0x9666ff, 3.0, 10);
    violetRim.position.set(-3, -1, -2);
    scene.add(violetRim);

    // 2. Pedestal / Scanner Base (Hexagonal holographic platform)
    const baseGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.35, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0a1024,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.6;
    scene.add(baseMesh);

    // Scanner Base Edge Ring
    const baseRingGeo = new THREE.TorusGeometry(2.35, 0.04, 8, 64);
    const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x28dfff });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.45;
    scene.add(baseRing);

    // 3. Floating 3D Holographic Document
    const docCanvas = document.createElement('canvas');
    docCanvas.width = 512;
    docCanvas.height = 720;
    const ctx = docCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(8, 16, 36, 0.9)';
      ctx.fillRect(0, 0, 512, 720);
      ctx.strokeStyle = '#28DFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 488, 696);

      ctx.fillStyle = '#28DFFF';
      ctx.fillRect(32, 35, 180, 24);

      ctx.fillStyle = 'rgba(57, 123, 255, 0.7)';
      for (let i = 0; i < 11; i++) {
        ctx.fillRect(32, 90 + i * 38, 320 + Math.sin(i) * 90, 8);
      }

      // Flagged salary section
      ctx.fillStyle = 'rgba(255, 83, 107, 0.25)';
      ctx.strokeStyle = '#FF536B';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 280, 448, 65);
      ctx.fillRect(32, 280, 448, 65);

      ctx.fillStyle = '#FF536B';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('DISCREPANCY: NET PAY ₹45,000.00', 44, 310);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText('Bank credit reflects ₹25,000.00. Kerning splice detected.', 44, 332);
    }

    const docTexture = new THREE.CanvasTexture(docCanvas);
    docTexture.colorSpace = THREE.SRGBColorSpace;

    const docGroup = new THREE.Group();
    scene.add(docGroup);

    const docGeo = new THREE.PlaneGeometry(2.2, 3.1);
    const docMat = new THREE.MeshPhysicalMaterial({
      map: docTexture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 0.8,
    });
    const docMesh = new THREE.Mesh(docGeo, docMat);
    docGroup.add(docMesh);

    // 4. Moving Holographic Laser Beam
    const laserBeamGeo = new THREE.BoxGeometry(2.3, 0.04, 0.06);
    const laserBeamMat = new THREE.MeshBasicMaterial({
      color: 0x28dfff,
    });
    const laserBeam = new THREE.Mesh(laserBeamGeo, laserBeamMat);
    laserBeam.position.z = 0.05;
    docGroup.add(laserBeam);

    // Laser Sheet Fan Geometry
    const laserFanGeo = new THREE.BufferGeometry();
    const fanPositions = new Float32Array([
      -1.15, 0, 0.05,
      1.15, 0, 0.05,
      0, -1.6, 0.5,
    ]);
    laserFanGeo.setAttribute('position', new THREE.BufferAttribute(fanPositions, 3));
    const laserFanMat = new THREE.MeshBasicMaterial({
      color: 0x28dfff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const laserFan = new THREE.Mesh(laserFanGeo, laserFanMat);
    scene.add(laserFan);

    // 5. OCR Character Particle Stream
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 2.0;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 3.0;
      pPositions[i * 3 + 2] = 0.1 + Math.random() * 0.4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x9666ff,
      size: 0.06,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    docGroup.add(particles);

    // 6. Interactive Mouse Rotation
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime() * scanSpeed;

      // Document hover & mouse parallax
      docGroup.position.y = 0.2 + Math.sin(elapsedTime * 1.5) * 0.08;
      docGroup.rotation.y = THREE.MathUtils.damp(
        docGroup.rotation.y,
        Math.sin(elapsedTime * 0.5) * 0.2 + mouseX * 0.4,
        4,
        0.016
      );
      docGroup.rotation.x = THREE.MathUtils.damp(
        docGroup.rotation.x,
        0.1 + mouseY * 0.2,
        4,
        0.016
      );

      // Laser sweep
      const laserY = Math.sin(elapsedTime * 2.2) * 1.35;
      laserBeam.position.y = laserY;

      // Update fan apex to follow laser
      const fanPos = laserFanGeo.attributes.position.array as Float32Array;
      fanPos[0] = -1.15;
      fanPos[1] = laserY + docGroup.position.y;
      fanPos[2] = 0.05;
      fanPos[3] = 1.15;
      fanPos[4] = laserY + docGroup.position.y;
      fanPos[5] = 0.05;
      laserFanGeo.attributes.position.needsUpdate = true;

      // Rotate particles slightly
      particles.rotation.z = elapsedTime * 0.1;

      // Platform slow spin
      baseMesh.rotation.y = elapsedTime * 0.15;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      baseGeo.dispose();
      baseMat.dispose();
      baseRingGeo.dispose();
      baseRingMat.dispose();
      docGeo.dispose();
      docMat.dispose();
      docTexture.dispose();
      laserBeamGeo.dispose();
      laserBeamMat.dispose();
      laserFanGeo.dispose();
      laserFanMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scanSpeed]);

  return (
    <div className={`relative rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col ${className}`}>
      {/* Top Telemetry Header */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <ScanEye className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-bold font-sans">3D AI Document Scanner</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 uppercase">{activeScanStatus}</span>
        </div>
      </div>

      {/* 3D Canvas Mounting Area */}
      <div ref={mountRef} className="w-full h-80 sm:h-96 relative flex items-center justify-center cursor-grab active:cursor-grabbing" />

      {/* Bottom Floating Control Dock (Zero Viewport Occlusion) */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px]">Scan Rate:</span>
          <button
            onClick={() => setScanSpeed(scanSpeed === 1.0 ? 2.0 : scanSpeed === 2.0 ? 0.5 : 1.0)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-slate-700"
          >
            {scanSpeed}x Speed
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Drag to rotate 3D viewport · Optical raster mapped
        </div>
      </div>
    </div>
  );
};
