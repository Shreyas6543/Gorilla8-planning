import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PointerLockControls, useTexture, useGLTF, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { buildWalls, isInsideRoom, EYE_HEIGHT_FT, WALK_SPEED_FT_PER_SEC } from "../../lib/room3d";
import { OUTER_POLYGON, BEAMS, ENTRANCE } from "../../config/floorplan";
import { footprint, type FurnitureItem } from "../../config/layout";
import { FirstPersonController } from "./FirstPersonController";
import { useFurnitureLayout } from "../../state/furnitureLayout";

// Wraps a furniture component so it turns 90° in place around its true
// on-floor footprint center — the Design page lets any item be rotated,
// so this keeps the 3D view consistent with the 2D one. `children` gets
// the item's own (unrotated, intrinsic) width/height re-centered at the
// local origin; the outer group does the real-world placement + turn.
function RotatedFootprint({ item, children }: { item: FurnitureItem; children: (x: number, y: number) => ReactNode }) {
  const f = footprint(item);
  const centerX = item.x + f.w / 2;
  const centerZ = item.y + f.h / 2;
  return (
    <group position={[centerX, 0, centerZ]} rotation={[0, item.rotated ? Math.PI / 2 : 0, 0]}>
      {children(-item.width / 2, -item.height / 2)}
    </group>
  );
}

// Real vertical walls a PS5 could plausibly back onto, for auto-detecting
// which way its TV should face once its position comes from the editable
// layout (Design page) instead of a fixed config — picks whichever wall
// edge is closest to the station's current x-position.
const VERTICAL_WALLS = [0, 16.5, 36.7];
function nearestWallFacing(x: number, width: number) {
  let wallX = VERTICAL_WALLS[0];
  let facePositiveX = true;
  let best = Infinity;
  for (const w of VERTICAL_WALLS) {
    const distLeft = Math.abs(x - w);
    const distRight = Math.abs(x + width - w);
    if (distLeft < best) {
      best = distLeft;
      wallX = w;
      facePositiveX = true;
    }
    if (distRight < best) {
      best = distRight;
      wallX = w;
      facePositiveX = false;
    }
  }
  return { wallX, facePositiveX };
}

// Materials sampled from a real walkthrough video of the actual space
// (Video_20260917_130157_691.mp4): warm off-white matte walls, dark
// speckled polished-granite floor (texture cropped from the video itself,
// see public/textures/floor.jpg), a dark stone skirting board at the base
// of every wall, and a mullioned glass wall.
const WALL_COLOR = "#DAD7CE";
const SKIRTING_COLOR = "#332D29";
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

function Floor() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    OUTER_POLYGON.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
    s.closePath();
    return s;
  }, []);
  const texture = useTexture("/textures/floor.jpg");
  useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(36.7 / 5, 36.5 / 5); // roughly 5ft tiles, matching the real floor's slab size
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.35} metalness={0.15} />
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
              <meshPhysicalMaterial color="#3DB2FF" transparent opacity={0.15} roughness={0.05} transmission={0.7} />
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
                <meshStandardMaterial color="#EDEBE3" roughness={0.5} />
              </mesh>
            ))}
        </group>
      ))}
    </>
  );
}

function CeilingLights() {
  // A handful of linear strip lights, matching the thin white ceiling
  // fixtures visible in the real space.
  const positions: [number, number][] = [
    [8, 6], [8, 20], [8, 32],
    [26, 20], [26, 32],
  ];
  return (
    <>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, WALL_HEIGHT - 0.1, z]} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.5, 0.08, 0.15]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
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
              <meshStandardMaterial color="#EDEBE3" roughness={0.5} />
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

// Real pool table height (rail top ~2.5ft off the floor), sourced from a
// free CC-BY model (see credit in WalkthroughPage) rather than hand-built
// primitives — fixes the "boxy pocket" look flat geometry couldn't avoid.
const POOL_TABLE_HEIGHT_FT = 2.55;
const POOL_TABLE_SURFACE_Y = 2.45; // where the felt/rack sits, used by BallRackAndCues

function PoolTable({
  x,
  y,
  width,
  height,
  showRack,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  showRack?: boolean;
}) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const { scene } = useGLTF("/models/pool_table_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => fitFootprint(model, width, height, POOL_TABLE_HEIGHT_FT), [model, width, height]);

  return (
    <group position={[cx, 0, cz]}>
      <group rotation={[0, fit.rotationY, 0]} scale={fit.scale}>
        <primitive object={model} position={fit.offset} />
      </group>
      {showRack && <BallRackAndCues width={width} height={height} surfaceY={POOL_TABLE_SURFACE_Y} />}
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

function TVPanel() {
  const { scene } = useGLTF("/models/tv_raw.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    enableShadows(clone);
    return clone;
  }, [scene]);
  const fit = useMemo(() => fitFootprint(model, TV_WIDTH_FT, 0.15, TV_HEIGHT_FT, "x"), [model]);
  return (
    <group rotation={[0, fit.rotationY, 0]} scale={fit.scale}>
      <primitive object={model} position={fit.offset} />
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

// wallX: the world-X coordinate of the wall this station backs onto.
// facePositiveX: true if the TV should face toward +X (wall is on the low-X
// side), false if it faces -X (wall is on the high-X side).
function PS5Station({
  x,
  y,
  width,
  height,
  wallX,
  facePositiveX,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  wallX: number;
  facePositiveX: boolean;
}) {
  const cz = y + height / 2;
  const tvX = wallX + (facePositiveX ? 0.1 : -0.1);
  const consoleX = wallX + (facePositiveX ? 0.45 : -0.45);
  const chairX = x + width / 2 + (facePositiveX ? 1.3 : -1.3);
  const dir = facePositiveX ? 1 : -1;

  return (
    <group>
      {/* Console stand */}
      <mesh position={[consoleX, 0.7, cz]} castShadow>
        <boxGeometry args={[0.8, 1.4, 2.2]} />
        <meshStandardMaterial color="#2b2e33" roughness={0.5} />
      </mesh>
      {/* PS5-style tower: white body flanking a black center vent strip */}
      <mesh position={[consoleX + dir * 0.15, 1.55, cz - 0.5]} rotation={[0, 0, dir * 0.18]}>
        <boxGeometry args={[0.5, 0.9, 0.35]} />
        <meshStandardMaterial color="#EDEDED" roughness={0.3} />
      </mesh>
      <mesh position={[consoleX + dir * 0.15, 1.55, cz - 0.5]}>
        <boxGeometry args={[0.12, 0.85, 0.3]} />
        <meshStandardMaterial color="#111214" roughness={0.4} />
      </mesh>
      {/* TV panel, mounted on the wall — real model, faces toward the room */}
      <group position={[tvX, 4, cz]} rotation={[0, facePositiveX ? Math.PI / 2 : -Math.PI / 2, 0]}>
        <TVPanel />
      </group>
      {/* Bean bag chair — real model, sitting low */}
      <group position={[chairX, 0, cz]}>
        <BeanBagChair diameter={2.2} />
      </group>
    </group>
  );
}

function RacingSim({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const cx = x + width / 2;
  const nearZ = y; // toward entrance
  const farZ = y + height; // away from entrance
  return (
    <group>
      {/* Screen, at the far end */}
      <mesh position={[cx, 3, farZ - 0.3]}>
        <boxGeometry args={[4, 2.2, 0.15]} />
        <meshStandardMaterial color="#0a0a0a" emissive="#FF9F43" emissiveIntensity={0.15} />
      </mesh>
      {/* Rig frame legs */}
      {[-1.1, 1.1].map((dx) => (
        <mesh key={dx} position={[cx + dx, 0.4, nearZ + 1.2]}>
          <boxGeometry args={[0.15, 0.8, 2.4]} />
          <meshStandardMaterial color="#1a1c1f" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {/* Seat */}
      <mesh position={[cx, 1.3, nearZ + 2.6]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 1.4, 0.3]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.6} />
      </mesh>
      <mesh position={[cx, 0.75, nearZ + 2]} castShadow>
        <boxGeometry args={[1.6, 0.15, 1.6]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.6} />
      </mesh>
      {/* Pedals */}
      <mesh position={[cx, 0.15, nearZ + 3.6]}>
        <boxGeometry args={[0.9, 0.3, 0.5]} />
        <meshStandardMaterial color="#2b2e33" />
      </mesh>
      {/* Steering wheel */}
      <mesh position={[cx, 2, nearZ + 3.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.08, 12, 24]} />
        <meshStandardMaterial color="#FF9F43" />
      </mesh>
    </group>
  );
}

function Counter({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  return (
    <group>
      <mesh position={[cx, 1.6, cz]} castShadow>
        <boxGeometry args={[width, 3.2, height]} />
        <meshStandardMaterial color="#9AA4B2" roughness={0.6} />
      </mesh>
      {/* Countertop overhang */}
      <mesh position={[cx, 3.3, cz]}>
        <boxGeometry args={[width + 0.2, 0.15, height + 0.2]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.3} />
      </mesh>
    </group>
  );
}

// Storage cabinet, styled to match the counter right beside it (same
// countertop cap + body tone) so the two read as one deliberate nook —
// two-door front with a center seam and simple handles.
function Cabinet({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const cx = x + width / 2;
  const cz = y + height / 2;
  const bodyHeight = 6; // tall storage cabinet, floor to just under the counter's sightline
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, bodyHeight / 2, 0]} castShadow>
        <boxGeometry args={[width, bodyHeight, height]} />
        <meshStandardMaterial color="#EDEAE3" roughness={0.55} />
      </mesh>
      {/* Top cap, matching the counter's countertop */}
      <mesh position={[0, bodyHeight + 0.08, 0]}>
        <boxGeometry args={[width + 0.15, 0.15, height + 0.15]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.3} />
      </mesh>
      {/* Center seam between the two doors — front face points -X, into
          the room (the cabinet backs onto the glass wall on its +X side) */}
      <mesh position={[-width / 2 + 0.01, bodyHeight / 2, 0]}>
        <boxGeometry args={[0.02, bodyHeight - 0.3, 0.03]} />
        <meshStandardMaterial color="#B8B3A6" />
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
  const poolTables = items.filter((i) => i.type === "pool");
  const ps5Stations = items.filter((i) => i.type === "ps5");
  const racingSim = items.find((i) => i.type === "racingSim");
  const counter = items.find((i) => i.type === "counter");
  const cabinet = items.find((i) => i.type === "cabinet");

  return (
    <>
      <SceneSetup />
      <color attach="background" args={["#c9d3d6"]} />
      {/* Environment provides realistic ambient light + reflections on the
          glossy pool table wood and floor (an actual HDRI, not a flat
          color) — this does most of the "looks real" work now, so the
          manual lights below are dialed back to accents/fill only. */}
      <Environment preset="apartment" />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#8a8a8a", 0.5]} />
      <pointLight position={[8, 8, 10]} intensity={120} color="#39FF88" />
      <pointLight position={[30, 8, 25]} intensity={120} color="#3DB2FF" />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <Floor />
      <Walls />
      <CeilingLights />
      <Beams3D />
      <EntranceThreshold />

      {poolTables.map((t, i) => (
        <RotatedFootprint key={t.id} item={t}>
          {(x, y) => <PoolTable x={x} y={y} width={t.width} height={t.height} showRack={i === 0} />}
        </RotatedFootprint>
      ))}

      {/* PS5 footprints are square (6x6), so "rotating" one changes nothing
          about its floor space — its facing is auto-detected from position
          instead (nearestWallFacing), not from the rotate handle. */}
      {ps5Stations.map((p) => {
        const f = footprint(p);
        const { wallX, facePositiveX } = nearestWallFacing(p.x, f.w);
        return <PS5Station key={p.id} x={p.x} y={p.y} width={f.w} height={f.h} wallX={wallX} facePositiveX={facePositiveX} />;
      })}

      {racingSim && (
        <RotatedFootprint item={racingSim}>{(x, y) => <RacingSim x={x} y={y} width={racingSim.width} height={racingSim.height} />}</RotatedFootprint>
      )}
      {counter && (
        <RotatedFootprint item={counter}>{(x, y) => <Counter x={x} y={y} width={counter.width} height={counter.height} />}</RotatedFootprint>
      )}
      {cabinet && (
        <RotatedFootprint item={cabinet}>{(x, y) => <Cabinet x={x} y={y} width={cabinet.width} height={cabinet.height} />}</RotatedFootprint>
      )}

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
