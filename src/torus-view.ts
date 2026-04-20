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
  readonly baseColor: THREE.Color; // interval-class color, immutable
  readonly dyad: Dyad;
}

const PLAYHEAD_COLOR = 0xff3b3b;

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
  private highlightedKeys = new Set<string>();
  private trackLines: TrackLine[] = [];
  private trackColorMap = new Map<string, THREE.Color>();
  private playheadMarkers: THREE.Mesh[] = [];
  private playheadLine: THREE.Line | null = null;
  private playheadMarkerGeom: THREE.SphereGeometry | null = null;
  private playheadMarkerMat: THREE.MeshBasicMaterial | null = null;
  private playheadLineMat: THREE.LineBasicMaterial | null = null;
  private resizeObserver: ResizeObserver;
  private animationId: number | null = null;
  private callbacks: TorusViewCallbacks;
  private clickStart: { x: number; y: number; time: number } | null = null;
  private readonly initialCameraPos = new THREE.Vector3(5.5, -8, 6);
  private readonly initialTarget = new THREE.Vector3(0, 0, 0);
  private torusShell: THREE.Mesh | null = null;
  private voiceLeadingLines: THREE.LineSegments | null = null;
  private minimalMode = false;
  private usedDyadKeys = new Set<string>();

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
    // Left click is consumed by the raycaster (node pick), not by orbit.
    // Right drag rotates; middle drag pans; scroll zooms. This overrides the
    // OrbitControls default (left = rotate, right = pan).
    mb.LEFT = -1;
    mb.MIDDLE = THREE.MOUSE.PAN;
    mb.RIGHT = THREE.MOUSE.ROTATE;
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

  /** Highlight a single dyad — convenience wrapper around `highlightDyads`. */
  highlightDyad(dyad: Dyad | null): void {
    this.highlightDyads(dyad === null ? [] : [dyad]);
  }

  /**
   * Highlight zero or more dyads simultaneously. Every previously highlighted
   * node that is not in the new set is un-highlighted. Used during playback
   * so every currently-sounding track lights up its own node.
   */
  highlightDyads(dyads: readonly Dyad[]): void {
    const next = new Set<string>();
    for (const d of dyads) next.add(dyadKey(d));
    for (const key of this.highlightedKeys) {
      if (next.has(key)) continue;
      const entry = this.nodes.get(key);
      if (!entry) continue;
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(entry.baseColor).multiplyScalar(0.14);
      entry.mesh.scale.setScalar(1);
    }
    for (const key of next) {
      if (this.highlightedKeys.has(key)) continue;
      const entry = this.nodes.get(key);
      if (!entry) continue;
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(entry.baseColor).multiplyScalar(1.4);
      entry.mesh.scale.setScalar(1.7);
    }
    this.highlightedKeys = next;
    this.applyNodeVisibility();
  }

  /**
   * Replace all per-track curves. Each track renders as a **closed**
   * Catmull-Rom (centripetal) curve through its placed dyads in its own
   * color — the progression loops head-to-tail, which matches the
   * looping playback in the scheduler. Tracks with fewer than two dyads
   * render as nothing. Also:
   *   - rebuilds the "used dyad keys" set that drives node visibility
   *     in minimal mode;
   *   - tints every node on a track's curve with that track's color
   *     (first track wins on a shared node). Unused nodes revert to
   *     their interval-class color.
   */
  setTrackPaths(paths: readonly TrackPath[]): void {
    for (const tl of this.trackLines) {
      this.scene.remove(tl.line);
      tl.line.geometry.dispose();
      tl.material.dispose();
    }
    this.trackLines = [];
    this.usedDyadKeys.clear();
    this.trackColorMap.clear();
    for (const path of paths) {
      const color = new THREE.Color(path.color as THREE.ColorRepresentation);
      for (const d of path.dyads) {
        const key = dyadKey(d);
        this.usedDyadKeys.add(key);
        // First-listed track wins on a shared node (Lead over Bass over Pad).
        if (!this.trackColorMap.has(key)) {
          this.trackColorMap.set(key, color);
        }
      }
      if (path.dyads.length < 2) continue;
      const pts = path.dyads.map((d) => toroidalPosition(d.a, d.b));
      const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      const sampleCount = Math.max(48, path.dyads.length * 24);
      const samples = curve.getPoints(sampleCount);
      const geom = new THREE.BufferGeometry().setFromPoints(samples);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
      });
      const line = new THREE.Line(geom, material);
      line.renderOrder = 2;
      this.scene.add(line);
      this.trackLines.push({ line, material });
    }
    this.applyTrackNodeColors();
    this.applyNodeVisibility();
  }

  private applyTrackNodeColors(): void {
    for (const [key, entry] of this.nodes) {
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      const tc = this.trackColorMap.get(key);
      if (tc) {
        mat.color.copy(tc);
      } else {
        mat.color.copy(entry.baseColor);
      }
    }
  }

  /**
   * Red progress indicator shown during playback. Each currently-sounding
   * dyad gets a small bright sphere, and if two or more tracks sound at
   * the same step they are connected by a red line (a triangle if all
   * three tracks are active). Pass an empty array to hide the indicator.
   */
  setPlayhead(dyads: readonly Dyad[]): void {
    // Ensure marker pool exists.
    if (!this.playheadMarkerGeom) {
      this.playheadMarkerGeom = new THREE.SphereGeometry(
        NODE_RADIUS * 1.55,
        14,
        14,
      );
    }
    if (!this.playheadMarkerMat) {
      this.playheadMarkerMat = new THREE.MeshBasicMaterial({
        color: PLAYHEAD_COLOR,
        transparent: true,
        opacity: 0.95,
      });
    }
    while (this.playheadMarkers.length < dyads.length) {
      const m = new THREE.Mesh(
        this.playheadMarkerGeom,
        this.playheadMarkerMat,
      );
      m.renderOrder = 5;
      this.scene.add(m);
      this.playheadMarkers.push(m);
    }
    for (let i = 0; i < this.playheadMarkers.length; i++) {
      const m = this.playheadMarkers[i];
      if (!m) continue;
      const d = dyads[i];
      if (d) {
        m.visible = true;
        m.position.copy(toroidalPosition(d.a, d.b));
      } else {
        m.visible = false;
      }
    }
    // Red connecting line through the currently-sounding dyads.
    if (this.playheadLine) {
      this.scene.remove(this.playheadLine);
      this.playheadLine.geometry.dispose();
      this.playheadLine = null;
    }
    if (dyads.length >= 2) {
      const pts = dyads.map((d) => toroidalPosition(d.a, d.b));
      if (dyads.length >= 3) {
        const first = pts[0];
        if (first) pts.push(first.clone());
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      if (!this.playheadLineMat) {
        this.playheadLineMat = new THREE.LineBasicMaterial({
          color: PLAYHEAD_COLOR,
          transparent: true,
          opacity: 0.9,
        });
      }
      const line = new THREE.Line(geom, this.playheadLineMat);
      line.renderOrder = 4;
      this.scene.add(line);
      this.playheadLine = line;
    }
  }

  /**
   * Minimal mode hides the torus shell, the voice-leading grid edges, and
   * any node that does not appear in a current track path. The currently
   * highlighted node stays visible so picking still works.
   */
  setMinimalMode(hide: boolean): void {
    this.minimalMode = hide;
    if (this.torusShell) this.torusShell.visible = !hide;
    if (this.voiceLeadingLines) this.voiceLeadingLines.visible = !hide;
    this.applyNodeVisibility();
  }

  private applyNodeVisibility(): void {
    if (!this.minimalMode) {
      for (const entry of this.nodes.values()) entry.mesh.visible = true;
      return;
    }
    for (const [key, entry] of this.nodes) {
      entry.mesh.visible =
        this.usedDyadKeys.has(key) || this.highlightedKeys.has(key);
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
    if (this.playheadLine) {
      this.playheadLine.geometry.dispose();
      this.playheadLine = null;
    }
    this.playheadMarkerGeom?.dispose();
    this.playheadMarkerMat?.dispose();
    this.playheadLineMat?.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
