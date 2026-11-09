import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Network, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';

interface ThreeForensicCoreProps {
  className?: string;
  onSelectNode?: (nodeLabel: string) => void;
}

export const ThreeForensicCore: React.FC<ThreeForensicCoreProps> = ({
  className = '',
  onSelectNode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<string>(
    'Select or hover on any node in the 3D network to inspect contextual links.'
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 540;
    let height = container.clientHeight || 380;

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
    camera.position.set(0, 1.5, 9.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 1. Lighting Rig
    const ambient = new THREE.AmbientLight(0x0a1024, 2.5);
    scene.add(ambient);

    const centerPoint = new THREE.PointLight(0x28dfff, 4.0, 12);
    scene.add(centerPoint);

    const violetPoint = new THREE.PointLight(0xe15cff, 3.0, 10);
    violetPoint.position.set(-4, -2, -2);
    scene.add(violetPoint);

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // 2. Central Holographic Forensic AI Core
    const coreGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x101a32,
      emissive: 0x28dfff,
      emissiveIntensity: 0.6,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    networkGroup.add(coreMesh);

    // Inner Glowing Orb
    const innerOrbGeo = new THREE.SphereGeometry(0.65, 32, 32);
    const innerOrbMat = new THREE.MeshStandardMaterial({
      color: 0x9666ff,
      emissive: 0x9666ff,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.85,
    });
    const innerOrb = new THREE.Mesh(innerOrbGeo, innerOrbMat);
    networkGroup.add(innerOrb);

    // 3. Orbiting Document & Entity Nodes
    interface GraphNode {
      mesh: THREE.Mesh;
      label: string;
      category: 'document' | 'field' | 'contradiction' | 'identity';
      description: string;
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
      orbitY: number;
    }

    const graphNodes: GraphNode[] = [];

    const nodeSpecs = [
      {
        label: 'Loan Application (Signed)',
        category: 'document' as const,
        description: 'Declared Income: ₹45,000.00. Unverified self-declaration.',
        color: 0x397bff,
        radius: 3.4,
        speed: 0.45,
        offset: 0,
        y: 0.8,
        size: 0.32,
      },
      {
        label: 'Salary Slip (October)',
        category: 'contradiction' as const,
        description: 'Stated Net Pay: ₹45,000.00 with visual font splice detected on numeral 4.',
        color: 0xff536b, // Flagged Contradiction
        radius: 3.6,
        speed: 0.45,
        offset: (Math.PI * 2) / 3,
        y: -0.6,
        size: 0.38,
      },
      {
        label: 'HDFC Bank Statement',
        category: 'document' as const,
        description: 'Audited monthly salary remittance credit: ₹25,000.00. Official core banking export.',
        color: 0x28dfff,
        radius: 3.5,
        speed: 0.45,
        offset: (Math.PI * 4) / 3,
        y: 0.3,
        size: 0.34,
      },
      {
        label: 'Applicant Identity: Rahul Sharma',
        category: 'identity' as const,
        description: 'Entity validated. No identity alias detected.',
        color: 0x10b981,
        radius: 4.8,
        speed: -0.3,
        offset: 0.5,
        y: -1.2,
        size: 0.26,
      },
      {
        label: 'Discrepancy: ₹20,000 Delta',
        category: 'contradiction' as const,
        description: 'Cross-document conflict between pay slip declared ₹45,000 and bank credit ₹25,000.',
        color: 0xffb547,
        radius: 2.2,
        speed: 0.7,
        offset: 1.8,
        y: 1.4,
        size: 0.3,
      },
    ];

    nodeSpecs.forEach((spec) => {
      const nodeGeo = new THREE.SphereGeometry(spec.size, 24, 24);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 1.2,
        metalness: 0.4,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      networkGroup.add(mesh);

      graphNodes.push({
        mesh,
        label: spec.label,
        category: spec.category,
        description: spec.description,
        orbitRadius: spec.radius,
        orbitSpeed: spec.speed,
        orbitOffset: spec.offset,
        orbitY: spec.y,
      });
    });

    // 4. Dynamic Synapse Energy Lines between Core and Nodes
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x28dfff,
      transparent: true,
      opacity: 0.4,
    });
    const contradictionLineMat = new THREE.LineBasicMaterial({
      color: 0xff536b,
      transparent: true,
      opacity: 0.85,
    });

    const lines: { line: THREE.Line; fromNode?: GraphNode; toNode?: GraphNode }[] = [];

    graphNodes.forEach((node) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(lineGeo, node.category === 'contradiction' ? contradictionLineMat : lineMat);
      networkGroup.add(line);
      lines.push({ line, toNode: node });
    });

    // Cross-link between Salary Slip and Bank Statement (Direct Contradiction Chord)
    const chordGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const chordLine = new THREE.Line(chordGeo, contradictionLineMat);
    networkGroup.add(chordLine);

    // 5. Mouse Parallax & Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('mousemove', handleMouseMove);

    // Raycaster for node selection
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(graphNodes.map((n) => n.mesh));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const matched = graphNodes.find((n) => n.mesh === clickedMesh);
        if (matched) {
          setSelectedNodeInfo(`[${matched.category.toUpperCase()}] ${matched.label}: ${matched.description}`);
          if (onSelectNode) onSelectNode(matched.label);
        }
      }
    };
    container.addEventListener('click', handleClick);

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 6. Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Core rotation and mouse damp
      networkGroup.rotation.y = THREE.MathUtils.damp(
        networkGroup.rotation.y,
        elapsed * 0.12 + mouseX * 0.5,
        4,
        0.016
      );
      networkGroup.rotation.x = THREE.MathUtils.damp(
        networkGroup.rotation.x,
        mouseY * 0.3,
        4,
        0.016
      );

      // Pulse Core
      const corePulse = 1.0 + Math.sin(elapsed * 2.5) * 0.08;
      coreMesh.scale.set(corePulse, corePulse, corePulse);
      coreMesh.rotation.y = elapsed * 0.3;
      coreMesh.rotation.z = elapsed * 0.2;

      innerOrb.scale.set(
        1.0 + Math.sin(elapsed * 3.5) * 0.12,
        1.0 + Math.sin(elapsed * 3.5) * 0.12,
        1.0 + Math.sin(elapsed * 3.5) * 0.12
      );

      // Orbit Nodes and update line geometries
      graphNodes.forEach((node) => {
        const angle = elapsed * node.orbitSpeed + node.orbitOffset;
        node.mesh.position.x = Math.cos(angle) * node.orbitRadius;
        node.mesh.position.z = Math.sin(angle) * node.orbitRadius;
        node.mesh.position.y = node.orbitY + Math.sin(elapsed * 1.5 + node.orbitOffset) * 0.2;
      });

      // Update lines to center
      lines.forEach(({ line, toNode }) => {
        if (toNode) {
          const positions = line.geometry.attributes.position.array as Float32Array;
          positions[0] = 0;
          positions[1] = 0;
          positions[2] = 0;
          positions[3] = toNode.mesh.position.x;
          positions[4] = toNode.mesh.position.y;
          positions[5] = toNode.mesh.position.z;
          line.geometry.attributes.position.needsUpdate = true;
        }
      });

      // Update chord line between salary slip and bank statement
      if (graphNodes[1] && graphNodes[2]) {
        const chordPositions = chordLine.geometry.attributes.position.array as Float32Array;
        chordPositions[0] = graphNodes[1].mesh.position.x;
        chordPositions[1] = graphNodes[1].mesh.position.y;
        chordPositions[2] = graphNodes[1].mesh.position.z;
        chordPositions[3] = graphNodes[2].mesh.position.x;
        chordPositions[4] = graphNodes[2].mesh.position.y;
        chordPositions[5] = graphNodes[2].mesh.position.z;
        chordLine.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      coreGeo.dispose();
      coreMat.dispose();
      innerOrbGeo.dispose();
      innerOrbMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col ${className}`}>
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-bold font-sans">Contextual Intelligence Network</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span className="text-red-300">Contradiction Chord Active</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-80 sm:h-96 relative flex items-center justify-center cursor-pointer" />

      {/* Selected Node Telemetry Banner */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 truncate max-w-xl">
          <span className="text-cyan-400 font-mono font-bold shrink-0">Node Inspector:</span>
          <span className="text-xs text-slate-300 truncate">{selectedNodeInfo}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono shrink-0 hidden sm:block">
          Interactive WebGL Graph
        </div>
      </div>
    </div>
  );
};
