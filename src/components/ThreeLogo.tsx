import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeLogoProps {
  size?: 'hero' | 'compact' | 'emblem';
  interactive?: boolean;
  className?: string;
}

export const ThreeLogo: React.FC<ThreeLogoProps> = ({
  size = 'compact',
  interactive = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || (size === 'hero' ? 440 : size === 'emblem' ? 80 : 44);
    const height = container.clientHeight || (size === 'hero' ? 440 : size === 'emblem' ? 80 : 44);

    // 1. Software WebGL detection guard
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

    // 2. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, size === 'hero' ? 6.5 : 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // 3. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0a1024, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x28dfff, 3.5);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe15cff, 3.0);
    rimLight.position.set(-5, -4, -3);
    scene.add(rimLight);

    const blueFill = new THREE.PointLight(0x397bff, 2.0, 10);
    blueFill.position.set(0, 0, 3);
    scene.add(blueFill);

    // 4. Custom 3D Logo Assembly (Multi-Part Procedural Model in THREE.Group)
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    // Part A: Shield Shape Geometry (Extruded with Bevel)
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 2.2);
    shieldShape.bezierCurveTo(1.4, 2.2, 1.9, 1.4, 1.9, 0.3);
    shieldShape.bezierCurveTo(1.9, -1.1, 1.1, -1.9, 0, -2.5);
    shieldShape.bezierCurveTo(-1.1, -1.9, -1.9, -1.1, -1.9, 0.3);
    shieldShape.bezierCurveTo(-1.9, 1.4, -1.4, 2.2, 0, 2.2);

    const shieldExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };
    const shieldGeometry = new THREE.ExtrudeGeometry(shieldShape, shieldExtrudeSettings);
    shieldGeometry.center();

    // Part B: Glass Material (Translucent with refraction & metallic tint)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1c38,
      emissive: 0x051329,
      metalness: 0.15,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.85,
      opacity: isSoftwareGl ? 0.45 : 0.95,
      transparent: true,
      ior: 1.52,
      thickness: 0.6,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const shieldMesh = new THREE.Mesh(shieldGeometry, glassMaterial);
    logoGroup.add(shieldMesh);

    // Part C: Metallic Beveled Border Frame
    const frameGeometry = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    frameGeometry.center();
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x28dfff,
      emissive: 0x10345e,
      metalness: 0.92,
      roughness: 0.2,
      wireframe: true,
    });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.scale.set(1.02, 1.02, 1.05);
    logoGroup.add(frameMesh);

    // Part D: Floating Holographic Document Inside Shield
    const docCanvas = document.createElement('canvas');
    docCanvas.width = 512;
    docCanvas.height = 680;
    const ctx = docCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(5, 12, 30, 0.85)';
      ctx.fillRect(0, 0, 512, 680);
      ctx.strokeStyle = '#28DFFF';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 480, 648);

      // Header Banner
      ctx.fillStyle = '#28DFFF';
      ctx.fillRect(36, 40, 220, 20);

      // Procedural Data Lines
      ctx.fillStyle = 'rgba(57, 123, 255, 0.7)';
      for (let i = 0; i < 9; i++) {
        const w = 180 + Math.sin(i * 1.5) * 120;
        ctx.fillRect(36, 95 + i * 44, w, 10);
      }

      // Red Anomaly Splice Highlight
      ctx.fillStyle = '#FF536B';
      ctx.fillRect(36, 230, 160, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('ANOMALY: KERNING SPLICE', 44, 246);

      // Forensic Seal
      ctx.strokeStyle = '#9666FF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(380, 530, 55, 0, Math.PI * 2);
      ctx.stroke();
    }

    const docTexture = new THREE.CanvasTexture(docCanvas);
    docTexture.colorSpace = THREE.SRGBColorSpace;
    const docPlaneGeometry = new THREE.PlaneGeometry(1.65, 2.2);
    const docMaterial = new THREE.MeshBasicMaterial({
      map: docTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const docMesh = new THREE.Mesh(docPlaneGeometry, docMaterial);
    docMesh.position.z = 0.05;
    logoGroup.add(docMesh);

    // Part E: Central AI Scanning Eye / Lens
    const eyeRingGeo = new THREE.TorusGeometry(0.55, 0.035, 16, 64);
    const eyeRingMat = new THREE.MeshStandardMaterial({
      color: 0x28dfff,
      emissive: 0x28dfff,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.1,
    });
    const eyeRingMesh = new THREE.Mesh(eyeRingGeo, eyeRingMat);
    eyeRingMesh.position.z = 0.25;
    logoGroup.add(eyeRingMesh);

    const innerCoreGeo = new THREE.SphereGeometry(0.24, 32, 32);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x9666ff,
      emissive: 0x9666ff,
      emissiveIntensity: 2.0,
      metalness: 0.5,
      roughness: 0.2,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    innerCoreMesh.position.z = 0.25;
    logoGroup.add(innerCoreMesh);

    // Part F: Dynamic Animated Laser Beam Line
    const laserGeo = new THREE.BoxGeometry(1.7, 0.035, 0.08);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x28dfff,
      transparent: true,
      opacity: 0.95,
    });
    const laserBeam = new THREE.Mesh(laserGeo, laserMat);
    laserBeam.position.z = 0.18;
    logoGroup.add(laserBeam);

    // Part G: Holographic Outer Gyroscopic Scanning Rings
    const ring1Geo = new THREE.TorusGeometry(2.4, 0.02, 16, 80);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x397bff,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    logoGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.7, 0.015, 16, 80);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xe15cff,
      transparent: true,
      opacity: 0.45,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 4;
    logoGroup.add(ring2);

    // Part H: Neural Particle Cloud (Surrounding Data Nodes)
    const particleCount = size === 'hero' ? 140 : 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const isCyan = Math.random() > 0.5;
      colors[i * 3] = isCyan ? 0.15 : 0.6;
      colors[i * 3 + 1] = isCyan ? 0.88 : 0.4;
      colors[i * 3 + 2] = 1.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: size === 'hero' ? 0.08 : 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    logoGroup.add(particlePoints);

    // 5. Interactive Mouse Parallax
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.55;
      targetRotationX = -y * 0.45;
    };

    if (interactive) {
      window.addEventListener('mousemove', handlePointerMove);
    }

    // 6. Animation Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth idle rotation + gentle bobbing
      const idleRotY = elapsedTime * 0.35;
      logoGroup.rotation.y = THREE.MathUtils.damp(
        logoGroup.rotation.y,
        idleRotY + targetRotationY,
        4,
        0.016
      );
      logoGroup.rotation.x = THREE.MathUtils.damp(
        logoGroup.rotation.x,
        targetRotationX,
        4,
        0.016
      );
      logoGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.08;

      // Scanning Beam Vertical Sweep
      laserBeam.position.y = Math.sin(elapsedTime * 2.5) * 0.85;

      // Rotating Scanning Rings & Particles
      ring1.rotation.z = elapsedTime * 0.4;
      ring2.rotation.y = -elapsedTime * 0.3;
      ring2.rotation.x = Math.sin(elapsedTime * 0.5) * 0.6;
      particlePoints.rotation.y = elapsedTime * 0.08;

      // Pulsing Eye Core
      const pulse = 1.0 + Math.sin(elapsedTime * 4.0) * 0.15;
      innerCoreMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // 7. Cleanup & Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactive) {
        window.removeEventListener('mousemove', handlePointerMove);
      }
      shieldGeometry.dispose();
      glassMaterial.dispose();
      frameGeometry.dispose();
      frameMaterial.dispose();
      docPlaneGeometry.dispose();
      docMaterial.dispose();
      docTexture.dispose();
      eyeRingGeo.dispose();
      eyeRingMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      laserGeo.dispose();
      laserMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, interactive]);

  const containerSizes = {
    hero: 'w-[360px] h-[360px] sm:w-[440px] sm:h-[440px]',
    compact: 'w-10 h-10',
    emblem: 'w-20 h-20',
  };

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center shrink-0 select-none ${containerSizes[size]} ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
