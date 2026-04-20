import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  INTERVAL_COLORS,
  INTERVAL_NAMES,
  PITCH_NAMES,
  dyadInterval,
  dyadKey,
  type Dyad,
  type PitchClass,
} from "./chord.js";

const MAJOR_RADIUS = 3.2;
const MINOR_RADIUS = 1.3;
const NODE_RADIUS = 0.09;
const N = 12;

function toroidalPosition(a: PitchClass, b: PitchClass): THREE.Vector3 {
  const theta = (a / N) * Math.PI * 2;
  const phi = (b / N) * Math.PI * 2;
  const x = (MAJOR_RADIUS + MINOR_RADIUS * Math.cos(phi)) * Math.cos(theta);
  const y = (MAJOR_RADIUS + MINOR_RADIUS * Math.cos(phi)) * Math.sin(theta);
  const z = MINOR_RADIUS * Math.sin(phi);
  return new THREE.Vector3(x, y, z);
}

interface NodeEntry {
  readonly mesh: THREE.Mesh;
  readonly baseColor: THREE.Color;
  readonly dyad: Dyad;
}

export class TorusView {
  private readonly container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private nodes = new Map<string, NodeEntry>();
  private highlightedKey: string | null = null;
  private pathLine: THREE.Line | null = null;
  private resizeObserver: ResizeObserver;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0b0d12");
    this.scene.fog = new THREE.Fog("#0b0d12", 10, 22);

    const { clientWidth: w, clientHeight: h } = container;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(6.5, 5.5, 7.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 18;

    this.buildLights();
    this.buildTorusShell();
    this.buildNodes();
    this.buildVoiceLeadingEdges();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.start();
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.6);
    key.position.set(5, 8, 6);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.25);
    rim.position.set(-6, -3, -4);
    this.scene.add(ambient, key, rim);
  }

  private buildTorusShell(): void {
    const geom = new THREE.TorusGeometry(
      MAJOR_RADIUS,
      MINOR_RADIUS,
      48,
      96,
    );
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1a2029,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const torus = new THREE.Mesh(geom, mat);
    torus.rotation.x = Math.PI / 2;
    this.scene.add(torus);
  }

  private buildNodes(): void {
    const sphereGeom = new THREE.SphereGeometry(NODE_RADIUS, 12, 12);
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const dyad: Dyad = {
          a: a as PitchClass,
          b: b as PitchClass,
        };
        const ic = dyadInterval(dyad);
        const color = new THREE.Color(INTERVAL_COLORS[ic]);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color.clone().multiplyScalar(0.12),
          roughness: 0.55,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.copy(toroidalPosition(dyad.a, dyad.b));
        mesh.userData.dyadKey = dyadKey(dyad);
        this.scene.add(mesh);
        this.nodes.set(dyadKey(dyad), {
          mesh,
          baseColor: color.clone(),
          dyad,
        });
      }
    }
  }

  // Connect dyads that differ by a semitone in exactly one voice. That is the
  // standard voice-leading adjacency for ordered pairs — each node has 4
  // neighbours, giving a 12×12 toroidal grid graph.
  private buildVoiceLeadingEdges(): void {
    const positions: number[] = [];
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const p = toroidalPosition(a as PitchClass, b as PitchClass);
        const aNext = ((a + 1) % N) as PitchClass;
        const bNext = ((b + 1) % N) as PitchClass;
        const pA = toroidalPosition(aNext, b as PitchClass);
        const pB = toroidalPosition(a as PitchClass, bNext);
        positions.push(p.x, p.y, p.z, pA.x, pA.y, pA.z);
        positions.push(p.x, p.y, p.z, pB.x, pB.y, pB.z);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mat = new THREE.LineBasicMaterial({
      color: 0x2f3a48,
      transparent: true,
      opacity: 0.55,
    });
    const lines = new THREE.LineSegments(geom, mat);
    this.scene.add(lines);
  }

  highlightDyad(dyad: Dyad | null): void {
    if (this.highlightedKey) {
      const prev = this.nodes.get(this.highlightedKey);
      if (prev) {
        const mat = prev.mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(prev.baseColor).multiplyScalar(0.12);
        prev.mesh.scale.setScalar(1);
      }
    }
    if (dyad === null) {
      this.highlightedKey = null;
      return;
    }
    const key = dyadKey(dyad);
    const entry = this.nodes.get(key);
    if (!entry) {
      this.highlightedKey = null;
      return;
    }
    const mat = entry.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.copy(entry.baseColor).multiplyScalar(1.2);
    entry.mesh.scale.setScalar(1.6);
    this.highlightedKey = key;
  }

  setProgressionPath(dyads: readonly Dyad[]): void {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
      this.pathLine = null;
    }
    if (dyads.length < 2) return;
    const pts = dyads.map((d) => toroidalPosition(d.a, d.b));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this.pathLine = new THREE.Line(geom, mat);
    this.scene.add(this.pathLine);
  }

  legendEntries(): { label: string; color: string }[] {
    return INTERVAL_NAMES.map((name, i) => ({
      label: `${name} (${PITCH_NAMES[i] ?? i})`,
      color: INTERVAL_COLORS[i] ?? "#888",
    }));
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.controls.dispose();
    for (const entry of this.nodes.values()) {
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.Material).dispose();
    }
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
    }
    this.container.removeChild(this.renderer.domElement);
  }
}
