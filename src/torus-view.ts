import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  INTERVAL_COLORS,
  INTERVAL_NAMES,
  dyadInterval,
  dyadKey,
  type Dyad,
  type PitchClass,
} from "./chord.js";

const MAJOR_RADIUS = 3.2;
const MINOR_RADIUS = 1.3;
const NODE_RADIUS = 0.1;
const N = 12;
const CLICK_MOVE_TOLERANCE_PX = 4;
const CLICK_MAX_DURATION_MS = 500;

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

export interface TrackPath {
  readonly color: string | number;
  readonly dyads: readonly Dyad[];
}

export interface TorusViewCallbacks {
  onNodeSelect?: (dyad: Dyad) => void;
}

interface TrackLine {
  readonly line: THREE.Line;
  readonly material: THREE.LineBasicMaterial;
}

export class TorusView {
  private readonly container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private nodes = new Map<string, NodeEntry>();
  private nodeMeshes: THREE.Mesh[] = [];
  private highlightedKey: string | null = null;
  private trackLines: TrackLine[] = [];
  private resizeObserver: ResizeObserver;
  private animationId: number | null = null;
  private callbacks: TorusViewCallbacks;
  private clickStart: { x: number; y: number; time: number } | null = null;
  private readonly initialCameraPos = new THREE.Vector3(5.5, -8, 6);
  private readonly initialTarget = new THREE.Vector3(0, 0, 0);
  private torusShell: THREE.Mesh | null = null;
  private voiceLeadingLines: THREE.LineSegments | null = null;

  constructor(container: HTMLElement, callbacks: TorusViewCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();

    const { clientWidth: w, clientHeight: h } = container;
    const aspect = w === 0 || h === 0 ? 1 : w / h;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.up.set(0, 0, 1);
    this.camera.position.copy(this.initialCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(Math.max(w, 1), Math.max(h, 1), false);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 22;
    const mb = this.controls.mouseButtons as unknown as {
      LEFT: number;
      MIDDLE: number;
      RIGHT: number;
    };
    mb.LEFT = -1;
    mb.MIDDLE = THREE.MOUSE.ROTATE;
    mb.RIGHT = THREE.MOUSE.PAN;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

    this.buildLights();
    this.buildTorusShell();
    this.buildNodes();
    this.buildVoiceLeadingEdges();
    this.applySceneTheme();
    this.installPointerHandlers();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.start();
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(5, 8, 6);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(-6, -3, -4);
    this.scene.add(ambient, key, rim);
  }

  private buildTorusShell(): void {
    // Low-poly wireframe: 8 radial × 24 tubular gives a clean grid that
    // evokes the 12-pitch-class structure without the visual noise of a
    // dense (48, 96) mesh, which was especially harsh in light theme.
    const geom = new THREE.TorusGeometry(
      MAJOR_RADIUS,
      MINOR_RADIUS,
      8,
      24,
    );
    const mat = new THREE.MeshBasicMaterial({
      color: 0x2a3340,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const torus = new THREE.Mesh(geom, mat);
    torus.userData.isShell = true;
    this.torusShell = torus;
    this.scene.add(torus);
  }

  private buildNodes(): void {
    const sphereGeom = new THREE.SphereGeometry(NODE_RADIUS, 14, 14);
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const dyad: Dyad = { a: a as PitchClass, b: b as PitchClass };
        const ic = dyadInterval(dyad);
        const color = new THREE.Color(INTERVAL_COLORS[ic]);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color.clone().multiplyScalar(0.14),
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
        this.nodeMeshes.push(mesh);
      }
    }
  }

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
      color: 0x39455a,
      transparent: true,
      opacity: 0.45,
    });
    const lines = new THREE.LineSegments(geom, mat);
    this.voiceLeadingLines = lines;
    this.scene.add(lines);
  }

  private installPointerHandlers(): void {
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.clickStart = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
      };
    });
    el.addEventListener("pointerup", (e) => {
      if (e.button !== 0 || !this.clickStart) {
        this.clickStart = null;
        return;
      }
      const dx = e.clientX - this.clickStart.x;
      const dy = e.clientY - this.clickStart.y;
      const dt = performance.now() - this.clickStart.time;
      this.clickStart = null;
      if (Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE_PX) return;
      if (dt > CLICK_MAX_DURATION_MS) return;
      this.handlePick(e.clientX, e.clientY);
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private handlePick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.nodeMeshes, false);
    if (hits.length === 0) return;
    const hit = hits[0];
    if (!hit) return;
    const key = hit.object.userData.dyadKey as string | undefined;
    if (!key) return;
    const entry = this.nodes.get(key);
    if (entry && this.callbacks.onNodeSelect) {
      this.callbacks.onNodeSelect(entry.dyad);
    }
  }

  highlightDyad(dyad: Dyad | null): void {
    if (this.highlightedKey) {
      const prev = this.nodes.get(this.highlightedKey);
      if (prev) {
        const mat = prev.mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(prev.baseColor).multiplyScalar(0.14);
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
    mat.emissive.copy(entry.baseColor).multiplyScalar(1.4);
    entry.mesh.scale.setScalar(1.7);
    this.highlightedKey = key;
  }

  /**
   * Replace all per-track curves. Each track renders as a smooth
   * Catmull-Rom curve through its placed dyads, in its own color. Tracks
   * with fewer than two dyads render as nothing (a curve needs at least
   * two anchors).
   */
  setTrackPaths(paths: readonly TrackPath[]): void {
    for (const tl of this.trackLines) {
      this.scene.remove(tl.line);
      tl.line.geometry.dispose();
      tl.material.dispose();
    }
    this.trackLines = [];
    for (const path of paths) {
      if (path.dyads.length < 2) continue;
      const pts = path.dyads.map((d) => toroidalPosition(d.a, d.b));
      // `centripetal` tension keeps the curve near the anchors when
      // successive dyads are far apart on the torus.
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const sampleCount = Math.max(32, path.dyads.length * 24);
      const samples = curve.getPoints(sampleCount);
      const geom = new THREE.BufferGeometry().setFromPoints(samples);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(path.color as THREE.ColorRepresentation),
        transparent: true,
        opacity: 0.92,
      });
      const line = new THREE.Line(geom, material);
      line.renderOrder = 2; // draw curves on top of the grid edges
      this.scene.add(line);
      this.trackLines.push({ line, material });
    }
  }

  legendEntries(): { label: string; color: string }[] {
    return INTERVAL_NAMES.map((name, i) => ({
      label: name,
      color: INTERVAL_COLORS[i] ?? "#888",
    }));
  }

  /**
   * Pull the current theme from the document body and retint the scene
   * background, the torus wireframe, and the voice-leading edges so that
   * switching theme in the DOM updates the canvas without rebuilding it.
   */
  applySceneTheme(): void {
    const light = document.body.dataset.theme === "light";
    if (light) {
      this.scene.background = new THREE.Color("#f4f6fa");
      this.scene.fog = new THREE.Fog("#f4f6fa", 12, 28);
    } else {
      this.scene.background = new THREE.Color("#0b0d12");
      this.scene.fog = new THREE.Fog("#0b0d12", 10, 24);
    }
    if (this.torusShell) {
      const mat = this.torusShell.material as THREE.MeshBasicMaterial;
      if (light) {
        mat.color.set(0xbac2d1);
        mat.opacity = 0.5;
      } else {
        mat.color.set(0x2a3340);
        mat.opacity = 0.45;
      }
      mat.needsUpdate = true;
    }
    if (this.voiceLeadingLines) {
      const mat = this.voiceLeadingLines.material as THREE.LineBasicMaterial;
      if (light) {
        mat.color.set(0x9ca6b8);
        mat.opacity = 0.35;
      } else {
        mat.color.set(0x39455a);
        mat.opacity = 0.45;
      }
      mat.needsUpdate = true;
    }
  }

  resetCamera(): void {
    this.camera.position.copy(this.initialCameraPos);
    this.camera.up.set(0, 0, 1);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private start(): void {
    const loop = (): void => {
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
    for (const tl of this.trackLines) {
      tl.line.geometry.dispose();
      tl.material.dispose();
    }
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
