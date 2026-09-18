import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PointerLockControls, useGLTF, useTexture, Text } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { buildWalls, isInsideRoom, EYE_HEIGHT_FT, WALK_SPEED_FT_PER_SEC } from "../../lib/room3d";
import { OUTER_POLYGON, BEAMS, ENTRANCE, GLASS_WALL } from "../../config/floorplan";
import { footprint, type FurnitureItem } from "../../config/layout";
import { BUILTIN_CATALOG } from "../../lib/furnitureCatalog";
import { FirstPersonController } from "./FirstPersonController";
import { useFurnitureLayout } from "../../state/furnitureLayout";

function defaultElevationFor(renderType: string): number {
  return BUILTIN_CATALOG.find((c) => c.renderType === renderType)?.defaultElevation ?? 4;
}

// Wraps a furniture component so it turns in place (a real 0/90/180/270°
// turn, not a 2-state flip) around its true on-floor footprint center —
// the Design page lets any item be rotated, so this keeps the 3D view
// consistent with the 2D one. `children` gets the item's own (0°,
// intrinsic) width/height re-centered at the local origin; the outer
// group does the real-world placement + turn.
function RotatedFootprint({ item, children }: { item: FurnitureItem; children: (x: number, y: number) => ReactNode }) {
  const f = footprint(item);
  const centerX = item.x + f.w / 2;
  const centerZ = item.y + f.h / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, (item.rotationSteps ?? 0) * (Math.PI / 2), 0]}>
      {children(-item.width / 2, -item.height / 2)}
    </group>
  );
}

// Base interior, finalized: dark grey carpet, dark grey walls + ceiling
// (same color as each other), and grey-tinted glass (the real glass gets
// outward-facing ad stickers, so from inside it reads as ~10% transmission
// tinted glass rather than clear). Every general room light is off — the
// only illumination is TV/screen glow spill and dedicated pool table
// lights, both added at their fixtures below.
const WALL_COLOR = "#34343a";
const CARPET_COLOR = "#222226";
const SKIRTING_COLOR = "#141416";
const GLASS_COLOR = "#5a5a5e";
const MULLION_COLOR = "#1c1c1f";
const WALL_HEIGHT = 9.5;
const SKIRTING_HEIGHT = 0.5;
const START_X = (ENTRANCE.from[0] + ENTRANCE.to[0]) / 2;
const START_Z = ENTRANCE.from[1] + 2; // just inside the doorway

function SceneSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(START_X, EYE_HEIGHT_FT, START_Z);
    camera.lookAt(START_X, EYE_HEIGHT_FT, START_Z + 10); // face into the room
  }, [camera]);
  return null;
}

function roomShape() {
  const s = new THREE.Shape();
  OUTER_POLYGON.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

function Floor() {
  const shape = useMemo(() => roomShape(), []);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={CARPET_COLOR} side={THREE.DoubleSide} roughness={0.95} metalness={0} />
    </mesh>
  );
}

// Same footprint as the floor, at ceiling height — same color as the
// walls, per Shreyas's call ("walls and the roof will be of the same
// color"). DoubleSide so it's visible from below without worrying about
// winding order.
function Ceiling() {
  const shape = useMemo(() => roomShape(), []);
  return (
    <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} roughness={0.9} metalness={0} />
    </mesh>
  );
}

function Walls() {
  const walls = useMemo(() => buildWalls(), []);
  return (
    <>
      {walls.map((w) => (
        <group key={w.id}>
          <mesh position={[w.x, WALL_HEIGHT / 2, w.z]} castShadow>
            <boxGeometry args={w.horizontal ? [w.length, WALL_HEIGHT, 0.3] : [0.3, WALL_HEIGHT, w.length]} />
            {w.isGlass ? (
              // Ad stickers on the outside face + a grey privacy film means
              // only ~10% of outside light actually makes it through.
              <meshPhysicalMaterial color={GLASS_COLOR} roughness={0.35} transmission={0.1} opacity={1} />
            ) : (
              <meshStandardMaterial color={WALL_COLOR} roughness={0.92} />
            )}
          </mesh>
          {/* Skirting board at the base — every wall has one, glass included */}
          <mesh position={[w.x, SKIRTING_HEIGHT / 2, w.z]}>
            <boxGeometry args={w.horizontal ? [w.length, SKIRTING_HEIGHT, 0.34] : [0.34, SKIRTING_HEIGHT, w.length]} />
            <meshStandardMaterial color={SKIRTING_COLOR} roughness={0.4} />
          </mesh>
          {/* Glass wall mullions — 3 evenly-spaced vertical dividers */}
          {w.isGlass &&
            [0.25, 0.5, 0.75].map((frac) => (
              <mesh
                key={frac}
                position={
                  w.horizontal
                    ? [w.x - w.length / 2 + w.length * frac, WALL_HEIGHT / 2, w.z]
                    : [w.x, WALL_HEIGHT / 2, w.z - w.length / 2 + w.length * frac]
                }
              >
                <boxGeometry args={w.horizontal ? [0.15, WALL_HEIGHT, 0.32] : [0.32, WALL_HEIGHT, 0.15]} />
                <meshStandardMaterial color={MULLION_COLOR} metalness={0.4} roughness={0.4} />
              </mesh>
            ))}
        </group>
      ))}
    </>
  );
}

function CeilingLights() {
  // The fixtures are still physically there — same handful of linear strip
  // lights as the real space — they're just switched off: no ambient room
  // lighting apart from the TV/screen glow and the pool table lights.
  const positions: [number, number][] = [
    [8, 6], [8, 20], [8, 32],
    [26, 20], [26, 32],
  ];
  return (
    <>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, WALL_HEIGHT - 0.1, z]} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.5, 0.08, 0.15]} />
          <meshStandardMaterial color="#0d0d0f" roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

function Beams3D() {
  return (
    <>
      {BEAMS.map((b) => {
        const size = Math.max(b.width, 0.4); // exaggerated slightly so it's visible at all
        const isEntranceBeam = b.id === "beam-entrance-side";
        return (
          <mesh key={b.id} position={[b.x, WALL_HEIGHT / 2, b.y]}>
            <boxGeometry args={[size, WALL_HEIGHT, size]} />
            {isEntranceBeam ? (
              // Dressed up to match the counter/cabinet nook right beside
              // it, so it reads as a deliberate architectural post rather
              // than a bare obstacle poking out next to the doorway.
              <meshStandardMaterial color={WALL_COLOR} roughness={0.5} />
            ) : (
              <meshStandardMaterial color="#8b3a3a" />
            )}
          </mesh>
        );
      })}
    </>
  );
}

// Scales + centers a loaded GLTF (whatever its native units/orientation)
// onto a real-world footprint of targetX (world X) x targetZ (world Z),
// sitting on the floor (y=0). `longAxisTo` says which world axis the
// model's longer horizontal dimension should end up on — 'z' for things
// like the pool table (length runs along Z), 'x' for things like a TV
// panel (screen width runs along X, depth is the short axis).
function fitFootprint(
  root: THREE.Object3D,
  targetX: number,
  targetZ: number,
  targetHeight?: number,
  longAxisTo: "x" | "z" = "z",
) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const modelLongIsX = size.x >= size.z;
  const needsRotation = longAxisTo === "z" ? modelLongIsX : !modelLongIsX;
  const rotationY = needsRotation ? Math.PI / 2 : 0;
  const worldXSize = needsRotation ? size.z : size.x;
  const worldZSize = needsRotation ? size.x : size.z;
  return {
    rotationY,
    scale: [targetX / worldXSize, (targetHeight ?? (targetX + targetZ) / 2) / size.y, targetZ / worldZSize] as [
      number,
      number,
      number,
    ],
    offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
  };
}

function enableShadows(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

// pool_table_raw.glb's color atlas leaves the felt on a placeholder magenta
// ("Color_K05") and the body/rails on flat black ("Color_M09") — recolored
// here to the real table Shreyas sent a photo of: green felt, a polished
// mahogany/rosewood body (NOT bright red — a dark reddish-brown wood
// lacquer, low metalness so it reads as glossy varnish, not red plastic).
const POOL_FELT_COLOR = "#146B3A";
const POOL_BODY_COLOR = "#4A1B10";

function recolorPoolTable(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials as THREE.MeshStandardMaterial[]) {
      if (mat.name === "Color_K05") {
        mat.color.set(POOL_FELT_COLOR);
        mat.roughness = 0.85;
        mat.metalness = 0;
      } else if (mat.name === "Color_M09") {
        mat.color.set(POOL_BODY_COLOR);
        mat.roughness = 0.18;
        mat.metalness = 0.08;
      }
    }
  });
}

// A real pool-hall light fixture: a long low-hanging shade suspended over
// the table by rods from the ceiling, running along the table's long axis
// (`height`, per this file's local-frame convention), with a warm glowing
// underside and the actual light sources tucked just beneath it — the only
// light in the room besides TV/screen glow, per Shreyas's call to turn
// everything else off.
function PoolTableLight({ height, surfaceY }: { height: number; surfaceY: number }) {
  const shadeY = surfaceY + 3.0; // ~3ft above the felt, like a real snooker light
  const shadeLen = Math.min(height * 0.65, 6);
  const rodTop = WALL_HEIGHT;
  return (
    <group>
      {[-shadeLen / 2 + 0.3, shadeLen / 2 - 0.3].map((dz) => (
        <mesh key={dz} position={[0, (shadeY + rodTop) / 2, dz]}>
          <cylinderGeometry args={[0.03, 0.03, rodTop - shadeY, 8]} />
          <meshStandardMaterial color="#141416" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, shadeY, 0]} castShadow>
        <boxGeometry args={[0.55, 0.3, shadeLen]} />
        <meshStandardMaterial color="#101012" roughness={0.5} />
      </mesh>
      <mesh position={[0, shadeY - 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.48, shadeLen - 0.1]} />
        <meshBasicMaterial color="#FFDDAA" toneMapped={false} />
      </mesh>
      {/* Only one of the two lights casts a shadow — point-light shadows
          are expensive (a 6-face cubemap render each), and 2 per table
          across every table adds up fast. */}
      {[-shadeLen / 4, shadeLen / 4].map((dz, i) => (
        <pointLight
          key={dz}
          position={[0, shadeY - 0.3, dz]}
          intensity={140}
          distance={height + 5}
          decay={2}
          color="#FFD9A0"
          castShadow={i === 0}
        />
      ))}
    </group>
  );
}

function PoolTable({
  x,
  y,
  width,
  height,
  elevation,
  showRack,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
  showRack?: boolean;
}) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const { scene } = useGLTF("/models/pool_table_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    recolorPoolTable(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => fitFootprint(model, width, height, elevation), [model, width, height, elevation]);
  const surfaceY = elevation - 0.1; // where the felt/rack sits, just under the rail top

  return (
    <group position={[cx, 0, cz]}>
      <group rotation={[0, fit.rotationY, 0]} scale={fit.scale}>
        <primitive object={model} position={fit.offset} />
      </group>
      {showRack && <BallRackAndCues width={width} height={height} surfaceY={surfaceY} />}
      <PoolTableLight height={height} surfaceY={surfaceY} />
    </group>
  );
}

function BallRackAndCues({ width, height, surfaceY }: { width: number; height: number; surfaceY: number }) {
  // Staged like the reference photo: a triangle of balls near one end, a
  // lone cue ball out on the table, two crossed cues.
  const ballColors = ["#F2D024", "#2E5FCC", "#D6402A", "#7A2CA8", "#E8792B", "#1E7A3E", "#7A2020", "#0A0A0A"];
  const rackZ = -height / 2 + 2.3;
  const rows = [4, 3, 2, 1];
  const balls: [number, number][] = [];
  rows.forEach((count, row) => {
    const rowZ = rackZ - row * 0.28;
    for (let i = 0; i < count; i++) {
      const rowX = (i - (count - 1) / 2) * 0.28;
      balls.push([rowX, rowZ]);
    }
  });
  return (
    <group>
      {balls.map(([bx, bz], i) => (
        <mesh key={i} position={[bx, surfaceY + 0.11, bz]} castShadow>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color={ballColors[i % ballColors.length]} roughness={0.25} />
        </mesh>
      ))}
      {/* Cue ball, out on the table */}
      <mesh position={[0.6, surfaceY + 0.11, height / 2 - 2.5]} castShadow>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.2} />
      </mesh>
      {/* Two crossed cues resting on the felt */}
      <mesh position={[-0.3, surfaceY + 0.08, 0.5]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.04, width + 1, 8]} />
        <meshStandardMaterial color="#d9b98a" roughness={0.4} />
      </mesh>
      <mesh position={[0.3, surfaceY + 0.08, -0.3]} rotation={[0, -0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.04, width + 1, 8]} />
        <meshStandardMaterial color="#d9b98a" roughness={0.4} />
      </mesh>
    </group>
  );
}

// A real 55" 16:9 TV (≈4.0ft wide x 2.25ft tall) mounted on the wall: the
// screen's long edge fits world-X (the "mount" rotation applied by the
// parent group then turns that to face the room), depth is a thin 0.15ft.
const TV_WIDTH_FT = 4.0;
const TV_HEIGHT_FT = 2.25;

// Only the TV/screens are actually lit in this interior — a glowing screen
// quad (self-illuminating, unaffected by scene lighting) plus a real point
// light so it spills onto the wall/floor/bean bag around it, since every
// other room light is off.
function TVPanel() {
  const { scene } = useGLTF("/models/tv_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => fitFootprint(model, TV_WIDTH_FT, 0.15, TV_HEIGHT_FT, "x"), [model]);
  return (
    <group>
      <group rotation={[0, fit.rotationY, 0]} scale={fit.scale}>
        <primitive object={model} position={fit.offset} />
      </group>
      <mesh position={[0, TV_HEIGHT_FT / 2, 0.09]}>
        <planeGeometry args={[TV_WIDTH_FT * 0.82, TV_HEIGHT_FT * 0.82]} />
        <meshBasicMaterial color="#BFE4FF" toneMapped={false} />
      </mesh>
      <pointLight position={[0, TV_HEIGHT_FT / 2, 0.6]} intensity={55} distance={10} decay={2} color="#BFE4FF" />
    </group>
  );
}

function BeanBagChair({ diameter }: { diameter: number }) {
  const { scene } = useGLTF("/models/beanbag_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = diameter / Math.max(size.x, size.z);
    return { scale: s, offset: [-center.x, -box.min.y, -center.z] as [number, number, number] };
  }, [model, diameter]);
  return (
    <group scale={fit.scale}>
      <primitive object={model} position={fit.offset} />
    </group>
  );
}

// Real chair (CC0, Poly Pizza — Quaternius "Office Chair"), placed facing
// +Z toward the wheel/monitors. Fitted to a generic gaming/office-chair
// footprint since the model's own proportions are already close to real.
const CHAIR_WIDTH_FT = 2.0;
const CHAIR_DEPTH_FT = 2.0;
const CHAIR_HEIGHT_FT = 3.9;

function GamingChair({ z }: { z: number }) {
  const { scene } = useGLTF("/models/office_chair_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => fitFootprint(model, CHAIR_WIDTH_FT, CHAIR_DEPTH_FT, CHAIR_HEIGHT_FT), [model]);
  return (
    <group position={[0, 0, z]}>
      <group rotation={[0, fit.rotationY, 0]} scale={fit.scale}>
        <primitive object={model} position={fit.offset} />
      </group>
    </group>
  );
}

// Laid out along local Z, same convention as every other rotatable type
// (RacingSim etc): TV at the far edge, bean bag near the near edge, facing
// back toward it. Rotation is handled entirely by the outer
// RotatedFootprint wrapper via rotationSteps — this used to instead
// auto-detect "the nearest real wall" from world position, which seemed
// safer (a TV could never end up unmounted in open air) but was actually
// buggy (it only ever checked the 3 vertical walls, so a PS5 dragged next
// to a horizontal wall like the 35ft one was silently ignored and always
// pointed at whichever vertical wall was closest instead — wrong). Shreyas
// explicitly asked to drop the auto-detection and just rotate it manually,
// which also fixes that bug outright and makes PS5 behave exactly like
// every other item (rotate button + facing arrow both do something real).
function PS5Station({
  x,
  y,
  width,
  height,
  elevation,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
}) {
  const cx = x + width / 2;
  const nearZ = y;
  const farZ = y + height;
  const tvZ = farZ - 0.1;
  const consoleZ = farZ - 0.5;
  const chairZ = nearZ + 1.4;
  // This assembly's internals (console/TV/bean-bag) have fixed absolute Y
  // positions, not a single "height" — elevation edits scale the whole
  // group vertically around the floor instead of precisely reflowing each
  // part. A known simplification; the built-in proportions still look right
  // at the default elevation.
  const verticalScale = elevation / defaultElevationFor("ps5");

  return (
    <group scale={[1, verticalScale, 1]}>
      {/* Console stand */}
      <mesh position={[cx, 0.7, consoleZ]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.8]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.5} />
      </mesh>
      {/* PS5-style tower: white body flanking a black center vent strip */}
      <mesh position={[cx + 0.5, 1.55, consoleZ + 0.15]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.35, 0.9, 0.5]} />
        <meshStandardMaterial color="#EDEDED" roughness={0.3} />
      </mesh>
      <mesh position={[cx + 0.5, 1.55, consoleZ + 0.15]}>
        <boxGeometry args={[0.3, 0.85, 0.12]} />
        <meshStandardMaterial color="#111214" roughness={0.4} />
      </mesh>
      {/* TV panel, at the far edge — real model, facing back toward the
          bean bag (180° from its own default +Z facing) */}
      <group position={[cx, 4, tvZ]} rotation={[0, Math.PI, 0]}>
        <TVPanel />
      </group>
      {/* Bean bag chair — real model, sitting low, facing the TV */}
      <group position={[cx, 0, chairZ]}>
        <BeanBagChair diameter={2.2} />
      </group>
    </group>
  );
}

// A simple procedural "road receding into sky" texture, painted once onto
// an offscreen canvas — stands in for real racing-game footage on the
// triple-monitor bank below (a static image, sampled from the reference
// photo's overall look rather than an actual game frame).
function useRoadScreenTexture(): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 60);
    sky.addColorStop(0, "#9FC6E0");
    sky.addColorStop(1, "#D8E7EE");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 128, 60);
    const road = ctx.createLinearGradient(0, 60, 0, 128);
    road.addColorStop(0, "#5b5e63");
    road.addColorStop(1, "#2b2d30");
    ctx.fillStyle = road;
    ctx.fillRect(0, 60, 128, 68);
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 60);
    ctx.lineTo(58, 128);
    ctx.moveTo(64, 60);
    ctx.lineTo(70, 128);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

// Shared by RacingScreen and the hinge groups below it, so the panels are
// always sized/rotated consistently — the side panels hinge at exactly
// ±SCREEN_W/2 from center, folded by SCREEN_FOLD (30°) each, giving a real
// 150° angle between adjacent panels (180° flat, minus the 30° fold).
const SCREEN_W = 2.3;
const SCREEN_FOLD = Math.PI / 6;

// One 32"-ish curved-bank monitor: dark bezel + glowing "screen" + a thin
// mounting arm underneath, angled inward for the wraparound triple-screen
// look from the reference photo.
function RacingScreen({ x, rotY, texture }: { x: number; rotY: number; texture: THREE.Texture }) {
  const w = SCREEN_W;
  const h = 1.3;
  return (
    <group position={[x, 3.55, 0]} rotation={[0, rotY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.07]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.22, -0.04]}>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshStandardMaterial color="#111214" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Gaming PC tower with 3 RGB fan rings visible through a tinted glass
// panel — sits beside the monitor stand, matching the reference photo.
function PCTower({ x, z }: { x: number; z: number }) {
  const fanColors = ["#4C6BFF", "#B24CFF", "#FF4C9E"];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.7, 1.8, 1.4]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0.36, 0.9, 0]}>
        <boxGeometry args={[0.02, 1.6, 1.2]} />
        <meshPhysicalMaterial color="#101820" transparent opacity={0.35} roughness={0.1} />
      </mesh>
      {[0.5, 1.0, 1.5].map((fy, i) => (
        <mesh key={fy} position={[0.37, fy, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.22, 0.05, 8, 16]} />
          <meshStandardMaterial color={fanColors[i]} emissive={fanColors[i]} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

// Full sim rig: black tube chassis, low reclined bucket seat, pedal deck,
// wheel + paddles, gear shifter, triple curved monitors, and a side-mounted
// RGB gaming PC — rebuilt from a real Playseat-style reference photo.
function RacingSim({
  x,
  y,
  width,
  height,
  elevation,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
}) {
  const cx = x + width / 2;
  const halfW = width / 2;
  const farZ = y + height; // away from entrance — monitor end; the whole rig
  // clusters close to this end (compact, like the real reference photos —
  // NOT spread across the full footprint depth with a dead gap in the
  // middle). Measuring backward from the monitor: seat is furthest back,
  // then (moving toward the screen) gear shifter, pedals, wheel, PC tower,
  // monitor — the chair sits right up against the rig, wheel in front of
  // the chair, exactly as specced.
  const seatZ = farZ - 3.1;
  const gearZ = farZ - 2.3;
  const pedalZ = farZ - 2.0;
  const wheelPostZ = farZ - 1.7;
  const wheelZ = farZ - 1.15;
  const pcZ = farZ - 1.0;
  const monitorZ = farZ - 0.45;
  const railCenterZ = farZ - 2.0;
  const railLen = 2.6;

  const roadTexture = useRoadScreenTexture();
  // Same simplification as PS5Station — scales the whole rig vertically
  // from the floor rather than reflowing each fixed absolute Y position.
  const verticalScale = elevation / defaultElevationFor("racingSim");
  const frameMat = <meshStandardMaterial color="#131417" metalness={0.6} roughness={0.35} />;

  return (
    <group position={[cx, 0, 0]} scale={[1, verticalScale, 1]}>
      {/* Chassis side rails, under the seat-to-wheel span */}
      {[-0.9, 0.9].map((dx) => (
        <mesh key={dx} position={[dx, 0.28, railCenterZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, railLen, 8]} />
          {frameMat}
        </mesh>
      ))}
      {/* Cross braces */}
      {[railCenterZ - railLen / 2, railCenterZ + railLen / 2].map((bz) => (
        <mesh key={bz} position={[0, 0.28, bz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 1.8, 8]} />
          {frameMat}
        </mesh>
      ))}

      {/* Pedal deck — floor mounted, slight rearward tilt, right under the wheel */}
      <group position={[0, 0, pedalZ]} rotation={[-0.22, 0, 0]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[1.3, 0.14, 1.0]} />
          <meshStandardMaterial color="#161616" roughness={0.6} />
        </mesh>
        {[-0.4, 0, 0.4].map((dx) => (
          <mesh key={dx} position={[dx, 0.27, 0.28]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.22, 0.05, 0.55]} />
            <meshStandardMaterial color="#C7CBCE" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Gear shifter, mounted to the side, between seat and pedals */}
      <group position={[-halfW * 0.6, 0.7, gearZ]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.22, 0.32]} />
          <meshStandardMaterial color="#161616" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0.06]}>
          <sphereGeometry args={[0.065, 10, 10]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
        </mesh>
      </group>

      {/* Wheel-mount post, leaning back toward the seat */}
      <mesh position={[0, 1.05, wheelPostZ]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
        {frameMat}
      </mesh>

      {/* Steering wheel, hub, red top marker, paddle shifters — right in
          front of the seat, between the seat and the monitors */}
      <group position={[0, 2.15, wheelZ]} rotation={[0.15, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.55, 0.075, 14, 28]} />
          <meshStandardMaterial color="#161616" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.08, 16]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0.04]}>
          <boxGeometry args={[0.12, 0.05, 0.02]} />
          <meshStandardMaterial color="#D6202A" emissive="#D6202A" emissiveIntensity={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.45, 0.22, 0.05]} rotation={[0, 0, s * 0.3]}>
            <boxGeometry args={[0.35, 0.06, 0.03]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Real chair model (CC0, Poly Pizza) — a placeholder gaming/office
          chair for now, stands in for a real Playseat-style racing seat
          until/unless a proper one gets built or sourced. Faces the wheel. */}
      <GamingChair z={seatZ} />

      {/* Triple curved monitor bank — main screen centered, the other two
          hinged exactly at its edges (not floating with a gap) and folded
          30° each, giving a real 150° angle between adjacent panels,
          curving toward the driver's seat. */}
      <group position={[0, 0, monitorZ]}>
        <RacingScreen x={0} rotY={0} texture={roadTexture} />
        {/* Left panel: hinge sits at the center panel's left edge; the
            panel itself is shifted so its inner edge lands exactly on that
            hinge, so rotating never opens a gap. */}
        <group position={[-SCREEN_W / 2, 0, 0]} rotation={[0, -SCREEN_FOLD, 0]}>
          <group position={[-SCREEN_W / 2, 0, 0]}>
            <RacingScreen x={0} rotY={0} texture={roadTexture} />
          </group>
        </group>
        <group position={[SCREEN_W / 2, 0, 0]} rotation={[0, SCREEN_FOLD, 0]}>
          <group position={[SCREEN_W / 2, 0, 0]}>
            <RacingScreen x={0} rotY={0} texture={roadTexture} />
          </group>
        </group>
        {/* Stand posts */}
        {[-0.85, 0.85].map((dx) => (
          <mesh key={dx} position={[dx, 1.85, 0.1]} castShadow>
            <boxGeometry args={[0.09, 3.7, 0.09]} />
            {frameMat}
          </mesh>
        ))}
        {/* Screen glow spill toward the seat — the only light this rig
            gives off, since every general room light is off. */}
        <pointLight position={[0, 3.55, -0.5]} intensity={45} distance={9} decay={2} color="#CFE8FF" />
      </group>

      {/* Gaming PC tower, beside the monitor stand */}
      <PCTower x={halfW - 0.9} z={pcZ} />
    </group>
  );
}

// Dark reeded-wood reception counter, matching the reference photo Shreyas
// sent: near-black wood body, tightly-spaced vertical fluted ridges, and
// a warm glowing LED strip under the countertop overhang and another at
// the floor. Unlike the TV glow / pool table lights elsewhere in this
// scene, these strips carry NO dynamic light — purely emissive geometry.
// Per Shreyas's reference photos, a real LED strip barely lights its
// surroundings at all; every attempt to actually cast light from them
// (point light, area light) rendered as a visible bulb or beam on nearby
// surfaces. Don't re-add a light here without checking with him first.
const COUNTER_BODY_COLOR = "#171310";
const COUNTER_TOP_COLOR = "#0F0C0A";
const COUNTER_LED_COLOR = "#FFC98A";

// One flat face of the counter body: ridges run along `span` (the face's
// own width) at the fixed cross-axis position `pos`, everything else
// (LED strips + their lights) mirrors that same layout.
interface CounterFace {
  axis: "x" | "z"; // which world axis is held fixed for this face
  pos: number; // fixed coordinate on that axis (the face's plane)
  spanStart: number; // start of the face's other axis, in world units
  span: number; // length of the face along that other axis
  outward: 1 | -1; // which way the face points, for LED/light offsets
}

function Counter({ x, y, width, height, elevation }: { x: number; y: number; width: number; height: number; elevation: number }) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const ledInset = 0.35; // vertical gap the ridges leave for each LED slot
  const ridgeHeight = elevation - ledInset * 2;
  const ridgeY = elevation / 2;
  // All 4 sides get ridges + LEDs — this item can be square (width ===
  // height), so which pair of opposite faces ends up facing the room
  // after rotation isn't knowable here; decorating all 4 means it always
  // looks right regardless of orientation.
  const faces: CounterFace[] = [
    { axis: "z", pos: y, spanStart: x, span: width, outward: -1 },
    { axis: "z", pos: y + height, spanStart: x, span: width, outward: 1 },
    { axis: "x", pos: x, spanStart: y, span: height, outward: -1 },
    { axis: "x", pos: x + width, spanStart: y, span: height, outward: 1 },
  ];

  return (
    <group>
      <mesh position={[cx, elevation / 2, cz]} castShadow>
        <boxGeometry args={[width, elevation, height]} />
        <meshStandardMaterial color={COUNTER_BODY_COLOR} roughness={0.55} />
      </mesh>

      {/* Reeded/fluted wood front, on every face */}
      {faces.map((face) => {
        const ridgeCount = Math.max(8, Math.round(face.span / 0.18));
        const ridgeSpacing = face.span / ridgeCount;
        return Array.from({ length: ridgeCount }, (_, i) => {
          const along = face.spanStart + ridgeSpacing * (i + 0.5);
          const pos: [number, number, number] =
            face.axis === "z" ? [along, ridgeY, face.pos] : [face.pos, ridgeY, along];
          return (
            <mesh key={`ridge-${face.axis}-${face.pos}-${i}`} position={pos}>
              <cylinderGeometry args={[0.045, 0.045, ridgeHeight, 8]} />
              {/* Small baked-in emissive tint (not a light) so the ridges
                  read as visible instead of pitch black. */}
              <meshStandardMaterial color={COUNTER_BODY_COLOR} roughness={0.4} metalness={0.05} emissive={COUNTER_LED_COLOR} emissiveIntensity={0.12} />
            </mesh>
          );
        });
      })}

      {/* Countertop overhang */}
      <mesh position={[cx, elevation + 0.1, cz]}>
        <boxGeometry args={[width + 0.2, 0.15, height + 0.2]} />
        <meshStandardMaterial color={COUNTER_TOP_COLOR} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Warm LED strips — one under the overhang lip, one at the floor,
          on every face. Purely emissive, no dynamic light attached at
          all — every version that added a real light source (point or
          area) rendered as a visible bulb/beam on nearby surfaces, which
          is exactly what Shreyas ruled out with reference photos. A real
          LED strip's glow, in a photo, is a camera bloom artifact around
          the LEDs themselves, not the strip actually casting light onto
          the room — so `Bloom` in the post-processing pipeline below is
          what should sell the glow, not a simulated light source. */}
      {faces.map((face) => {
        const faceOut = face.pos + face.outward * 0.03;
        const stripSize: [number, number, number] =
          face.axis === "z" ? [face.span, 0.04, 0.05] : [0.05, 0.04, face.span];
        const stripAlong = face.spanStart + face.span / 2;
        const topStripPos: [number, number, number] =
          face.axis === "z" ? [stripAlong, elevation - 0.03, faceOut] : [faceOut, elevation - 0.03, stripAlong];
        const bottomStripPos: [number, number, number] =
          face.axis === "z" ? [stripAlong, 0.06, faceOut] : [faceOut, 0.06, stripAlong];
        return (
          <group key={`led-${face.axis}-${face.pos}`}>
            <mesh position={topStripPos}>
              <boxGeometry args={stripSize} />
              <meshBasicMaterial color={COUNTER_LED_COLOR} toneMapped={false} />
            </mesh>
            <mesh position={bottomStripPos}>
              <boxGeometry args={stripSize} />
              <meshBasicMaterial color={COUNTER_LED_COLOR} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Storage cabinet, styled to match the counter right beside it (same
// countertop cap + body tone) so the two read as one deliberate nook —
// two-door front with a center seam and simple handles.
function Cabinet({ x, y, width, height, elevation }: { x: number; y: number; width: number; height: number; elevation: number }) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const bodyHeight = elevation;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, bodyHeight / 2, 0]} castShadow>
        <boxGeometry args={[width, bodyHeight, height]} />
        <meshStandardMaterial color={COUNTER_BODY_COLOR} roughness={0.55} />
      </mesh>
      {/* Top cap, matching the counter's countertop */}
      <mesh position={[0, bodyHeight + 0.08, 0]}>
        <boxGeometry args={[width + 0.15, 0.15, height + 0.15]} />
        <meshStandardMaterial color={COUNTER_TOP_COLOR} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* Center seam between the two doors — front face points -X, into
          the room (the cabinet backs onto the glass wall on its +X side) */}
      <mesh position={[-width / 2 + 0.01, bodyHeight / 2, 0]}>
        <boxGeometry args={[0.02, bodyHeight - 0.3, 0.03]} />
        <meshStandardMaterial color="#3a3128" />
      </mesh>
      {/* Two door handles */}
      {[-0.6, 0.6].map((dz) => (
        <mesh key={dz} position={[-width / 2 - 0.03, bodyHeight / 2, dz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          <meshStandardMaterial color="#3a3d42" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Any admin-created object type that isn't one of the 5 built-ins gets
// this: a plain box sized to its footprint + elevation, colored per the
// catalog entry, with its name floating above it. No bespoke model —
// that's the honest tradeoff for "add whatever objects you want."
function GenericObject({
  x,
  y,
  width,
  height,
  elevation,
  color,
  label,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
  color: string;
  label: string;
}) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, elevation / 2, 0]} castShadow>
        <boxGeometry args={[width, elevation, height]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <Text position={[0, elevation + 0.5, 0]} fontSize={0.5} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

// SpotLight aims at its `target` (a separate Object3D), not via rotation
// like a mesh — three.js computes the light's direction from position to
// target.position, so the target has to actually exist and have its
// matrix updated. This is the sofa unit's gallery spotlight: unlike the
// LED strips elsewhere in this scene, Shreyas explicitly wants this one
// to visibly spread over the whole nook, so a real, fairly wide-angle
// SpotLight is the right tool here (not something to avoid).
function AimedSpotLight({
  position,
  target,
  angle,
  penumbra,
  distance,
  intensity,
  color,
}: {
  position: [number, number, number];
  target: [number, number, number];
  angle: number;
  penumbra: number;
  distance: number;
  intensity: number;
  color: string;
}) {
  const ref = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.target.position.set(target[0], target[1], target[2]);
    ref.current.target.updateMatrixWorld();
  }, [target]);
  return (
    <spotLight
      ref={ref}
      position={position}
      angle={angle}
      penumbra={penumbra}
      distance={distance}
      intensity={intensity}
      decay={2}
      color={color}
      castShadow
    />
  );
}

// Sofa + the portrait hung above it + the gallery spotlight that lights
// both — one combined unit, per Shreyas's request ("all three things
// come as one unit"). The sofa sits with its back to the far wall
// (farZ, same convention as every other wall-mounted piece in this
// file); the portrait and spotlight mount there too. Scales vertically
// with `elevation`, same trick as PS5Station/RacingSim, so resizing it
// on the Design page keeps everything proportional.
function SofaUnit({ x, y, width, height, elevation }: { x: number; y: number; width: number; height: number; elevation: number }) {
  const cx = x + width / 2;
  const nearZ = y;
  const farZ = y + height;
  const backZ = farZ - 0.15; // sofa's own back, right against the wall
  const verticalScale = elevation / defaultElevationFor("sofaUnit");

  const texture = useTexture("/textures/deadpool-poster.png");
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  const seatY = 1.1;
  const seatDepth = height - 0.3;
  const armWidth = 0.5;
  const portraitWidth = Math.min(width * 0.4, 2.2);
  const portraitHeight = portraitWidth * (932 / 664); // matches the actual image's aspect ratio
  const portraitY = seatY + 2.3;

  return (
    <group scale={[1, verticalScale, 1]}>
      {/* Base cushion */}
      <mesh position={[cx, seatY / 2, nearZ + seatDepth / 2]} castShadow>
        <boxGeometry args={[width - armWidth * 2, seatY, seatDepth]} />
        <meshStandardMaterial color="#3a3d4a" roughness={0.75} />
      </mesh>
      {/* Backrest */}
      <mesh position={[cx, seatY + 0.75, backZ - 0.15]} castShadow>
        <boxGeometry args={[width - armWidth * 2, 1.5, 0.3]} />
        <meshStandardMaterial color="#3a3d4a" roughness={0.75} />
      </mesh>
      {/* Armrests */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[cx + side * (width / 2 - armWidth / 2), seatY / 2 + 0.35, nearZ + seatDepth / 2]} castShadow>
          <boxGeometry args={[armWidth, seatY + 0.7, seatDepth]} />
          <meshStandardMaterial color="#2f323d" roughness={0.7} />
        </mesh>
      ))}
      {/* Seat cushion seam */}
      {[-0.25, 0.25].map((f) => (
        <mesh key={f} position={[cx + f * (width - armWidth * 2) * 0.5, seatY + 0.08, nearZ + seatDepth * 0.55]}>
          <boxGeometry args={[(width - armWidth * 2) * 0.48, 0.18, seatDepth * 0.75]} />
          <meshStandardMaterial color="#454858" roughness={0.8} />
        </mesh>
      ))}

      {/* Portrait, mounted on the wall above the sofa */}
      <mesh position={[cx, portraitY, backZ - 0.01]}>
        <planeGeometry args={[portraitWidth + 0.15, portraitHeight + 0.15]} />
        <meshStandardMaterial color="#141416" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[cx, portraitY, backZ - 0.02]}>
        <planeGeometry args={[portraitWidth, portraitHeight]} />
        <meshStandardMaterial map={texture} roughness={0.5} />
      </mesh>

      {/* Gallery spotlight fixture — a small ceiling-mounted downlight
          housing, angled onto the portrait */}
      <group position={[cx, WALL_HEIGHT - 0.3, backZ - 1.2]} rotation={[0.55, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.35, 12]} />
          <meshStandardMaterial color="#1a1a1c" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <circleGeometry args={[0.16, 12]} />
          <meshBasicMaterial color="#FFF3D6" toneMapped={false} />
        </mesh>
      </group>
      <AimedSpotLight
        position={[cx, WALL_HEIGHT - 0.3, backZ - 1.2]}
        target={[cx, portraitY, backZ]}
        angle={0.6}
        penumbra={0.85}
        distance={12}
        intensity={55}
        color="#FFEBC2"
      />
    </group>
  );
}

// A simple potted plant — pot + a rounded cluster of foliage. Small
// bespoke shape rather than a plain box, since this is a permanent
// catalog item, not a one-off admin-added generic.
function PlantPot({ x, y, width, height, elevation }: { x: number; y: number; width: number; height: number; elevation: number }) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const potHeight = elevation * 0.45;
  const potRadiusTop = Math.min(width, height) / 2;
  const potRadiusBottom = potRadiusTop * 0.75;
  const foliageY = potHeight + elevation * 0.28;
  const leafOffsets: [number, number, number][] = [
    [-0.3, 0.15, 0.2],
    [0.28, 0.1, -0.22],
    [0.05, 0.32, 0.18],
    [-0.15, 0.05, -0.28],
  ];
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, potHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[potRadiusTop, potRadiusBottom, potHeight, 16]} />
        <meshStandardMaterial color="#8a4a32" roughness={0.7} />
      </mesh>
      <mesh position={[0, foliageY, 0]} castShadow>
        <sphereGeometry args={[potRadiusTop * 1.1, 10, 8]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.85} />
      </mesh>
      {leafOffsets.map((o, i) => (
        <mesh key={i} position={[o[0] * potRadiusTop * 2, foliageY + o[1] * elevation, o[2] * potRadiusTop * 2]} castShadow>
          <sphereGeometry args={[potRadiusTop * 0.55, 8, 6]} />
          <meshStandardMaterial color="#3a9142" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// GORILLA 8 neon sign, mounted on the glass wall directly behind the
// counter (the counter's back edge sits right up against it — only 0.2ft
// gap) at Shreyas's specced height and size. The source image is already
// a photo of a lit neon sign — black backing, glowing gold linework — so
// it's used as-is for both the color and the glow: `meshBasicMaterial`
// with `toneMapped={false}` renders it at its own brightness regardless
// of scene lighting, so the neon lines read as lit and the near-black
// backing stays dark. Just the sign, no backing panel — a flat emissive
// panel behind it (tried once) read as a distinct rectangular plaque
// shape on the wall, not a subtle glow; Shreyas had it removed.
const LOGO_SIZE_FT = 3;
const LOGO_HEIGHT_FT = 7; // vertical center of the sign
function Gorilla8Logo({ counterCenterZ }: { counterCenterZ: number }) {
  const texture = useTexture("/textures/gorilla8-logo.png");
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);
  // Glass wall is a real 0.3ft-thick box centered ON GLASS_WALL.from[0], so
  // its inner (room-side) face sits 0.15ft in front of that line — the
  // sign needs to clear that face, not just offset from the centerline,
  // or it renders embedded inside the glass and gets occluded by it.
  const wallX = GLASS_WALL.from[0] - 0.2;
  return (
    <mesh position={[wallX, LOGO_HEIGHT_FT, counterCenterZ]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[LOGO_SIZE_FT, LOGO_SIZE_FT]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
}

function EntranceThreshold() {
  const cx = (ENTRANCE.from[0] + ENTRANCE.to[0]) / 2;
  const width = Math.abs(ENTRANCE.to[0] - ENTRANCE.from[0]);
  return (
    <mesh position={[cx, 0.05, ENTRANCE.from[1]]}>
      <boxGeometry args={[width, 0.1, 0.3]} />
      <meshStandardMaterial color="#9AA4B2" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

export function WalkthroughScene() {
  const locked = useRef(false);
  const { items } = useFurnitureLayout();
  const poolTables = items.filter((i) => i.renderType === "pool");
  const ps5Stations = items.filter((i) => i.renderType === "ps5");
  const racingSims = items.filter((i) => i.renderType === "racingSim");
  const counters = items.filter((i) => i.renderType === "counter");
  const cabinets = items.filter((i) => i.renderType === "cabinet");
  const sofaUnits = items.filter((i) => i.renderType === "sofaUnit");
  const plantPots = items.filter((i) => i.renderType === "plantPot");
  const generics = items.filter((i) => i.renderType === "generic");
  // Logo mounts behind whichever item is actually the counter right now —
  // reads its live position (Design page), not the hardcoded default,
  // since the two have drifted apart (the counter's been resized/moved
  // since that default was written).
  const counterForLogo = counters[0];
  const counterCenterZ = counterForLogo ? counterForLogo.y + footprint(counterForLogo).h / 2 : undefined;

  return (
    <>
      <SceneSetup />
      <color attach="background" args={["#c9d3d6"]} />
      {/* No general room lighting — Shreyas's call: every light in the
          room is off except the TV/screen glow (added at each screen) and
          the dedicated pool table lights (added at each table). This
          ambient is uniform with no position/falloff, so it can't produce
          a hotspot or beam — warm-tinted to match the LED strips
          (COUNTER_LED_COLOR) instead of plain white, kept low so wall/
          floor texture reads as visible while the room still stays dark
          overall. */}
      <ambientLight intensity={0.5} color={COUNTER_LED_COLOR} />
      <Floor />
      <Walls />
      <Ceiling />
      <CeilingLights />
      <Beams3D />
      <EntranceThreshold />
      {counterCenterZ !== undefined && <Gorilla8Logo counterCenterZ={counterCenterZ} />}

      {poolTables.map((t, i) => (
        <RotatedFootprint key={t.id} item={t}>
          {(x, y) => <PoolTable x={x} y={y} width={t.width} height={t.height} elevation={t.elevation} showRack={i === 0} />}
        </RotatedFootprint>
      ))}

      {ps5Stations.map((p) => (
        <RotatedFootprint key={p.id} item={p}>
          {(x, y) => <PS5Station x={x} y={y} width={p.width} height={p.height} elevation={p.elevation} />}
        </RotatedFootprint>
      ))}

      {racingSims.map((r) => (
        <RotatedFootprint key={r.id} item={r}>
          {(x, y) => <RacingSim x={x} y={y} width={r.width} height={r.height} elevation={r.elevation} />}
        </RotatedFootprint>
      ))}
      {counters.map((c) => (
        <RotatedFootprint key={c.id} item={c}>
          {(x, y) => <Counter x={x} y={y} width={c.width} height={c.height} elevation={c.elevation} />}
        </RotatedFootprint>
      ))}
      {cabinets.map((c) => (
        <RotatedFootprint key={c.id} item={c}>
          {(x, y) => <Cabinet x={x} y={y} width={c.width} height={c.height} elevation={c.elevation} />}
        </RotatedFootprint>
      ))}
      {sofaUnits.map((s) => (
        <RotatedFootprint key={s.id} item={s}>
          {(x, y) => <SofaUnit x={x} y={y} width={s.width} height={s.height} elevation={s.elevation} />}
        </RotatedFootprint>
      ))}
      {plantPots.map((p) => (
        <RotatedFootprint key={p.id} item={p}>
          {(x, y) => <PlantPot x={x} y={y} width={p.width} height={p.height} elevation={p.elevation} />}
        </RotatedFootprint>
      ))}
      {generics.map((g) => (
        <RotatedFootprint key={g.id} item={g}>
          {(x, y) => (
            <GenericObject x={x} y={y} width={g.width} height={g.height} elevation={g.elevation} color={g.color ?? "#8899AA"} label={g.label} />
          )}
        </RotatedFootprint>
      ))}

      <FirstPersonController eyeHeight={EYE_HEIGHT_FT} speed={WALK_SPEED_FT_PER_SEC} />
      <PointerLockControls
        onLock={() => (locked.current = true)}
        onUnlock={() => (locked.current = false)}
      />

      {/* Post-processing: contact shadows in corners/crevices (AO), a soft
          glow on the emissive TV/screen panels (bloom), and filmic tone
          mapping so highlights roll off naturally instead of clipping. */}
      <EffectComposer>
        <N8AO aoRadius={1.2} intensity={2.5} />
        <Bloom intensity={0.35} luminanceThreshold={0.4} luminanceSmoothing={0.9} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

export { isInsideRoom };
