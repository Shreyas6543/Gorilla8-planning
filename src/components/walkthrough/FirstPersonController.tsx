import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { isInsideRoom } from "../../lib/room3d";

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

function useKeyState() {
  const keys = useRef<KeyState>({ forward: false, backward: false, left: false, right: false });

  useEffect(() => {
    const setKey = (code: string, value: boolean) => {
      if (code === "KeyW" || code === "ArrowUp") keys.current.forward = value;
      if (code === "KeyS" || code === "ArrowDown") keys.current.backward = value;
      if (code === "KeyA" || code === "ArrowLeft") keys.current.left = value;
      if (code === "KeyD" || code === "ArrowRight") keys.current.right = value;
    };
    const onDown = (e: KeyboardEvent) => setKey(e.code, true);
    const onUp = (e: KeyboardEvent) => setKey(e.code, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return keys;
}

interface FirstPersonControllerProps {
  eyeHeight: number;
  speed: number;
  // Both optional, both mobile-only: PointerLockControls/keyboard cover
  // desktop entirely on their own. touchMoveInput is an analog joystick
  // vector (partial deflection => partial speed, unlike the keyboard's 4
  // on/off booleans); touchLookDelta is raw per-frame pixel deltas from a
  // touch-drag area, standing in for the movementX/Y a locked mouse
  // pointer would otherwise generate — real Pointer Lock never fires
  // those from a touchmove, so without this a touch device has no way to
  // look around at all. Both are refs (not props that change identity)
  // so reading/consuming them here doesn't need a dependency on the
  // object itself, just its current contents each frame.
  touchMoveInput?: RefObject<{ x: number; y: number }>;
  touchLookDelta?: RefObject<{ dx: number; dy: number }>;
}

export function FirstPersonController({ eyeHeight, speed, touchMoveInput, touchLookDelta }: FirstPersonControllerProps) {
  const { camera } = useThree();
  const keys = useKeyState();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  const lookEuler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const TOUCH_LOOK_SENSITIVITY = 0.0035;

  useFrame((_, delta) => {
    // Touch-drag look, applied before the movement direction is read
    // below so WASD-equivalent input this same frame already uses the
    // just-updated facing — matches how a real mouse-look frame feels.
    if (touchLookDelta) {
      const { dx, dy } = touchLookDelta.current;
      if (dx !== 0 || dy !== 0) {
        lookEuler.current.setFromQuaternion(camera.quaternion);
        lookEuler.current.y -= dx * TOUCH_LOOK_SENSITIVITY;
        lookEuler.current.x -= dy * TOUCH_LOOK_SENSITIVITY;
        const maxPitch = Math.PI / 2 - 0.01;
        lookEuler.current.x = Math.max(-maxPitch, Math.min(maxPitch, lookEuler.current.x));
        camera.quaternion.setFromEuler(lookEuler.current);
        touchLookDelta.current.dx = 0;
        touchLookDelta.current.dy = 0;
      }
    }

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up);

    move.current.set(0, 0, 0);
    if (keys.current.forward) move.current.add(forward.current);
    if (keys.current.backward) move.current.sub(forward.current);
    if (keys.current.right) move.current.add(right.current);
    if (keys.current.left) move.current.sub(right.current);
    if (touchMoveInput) {
      const t = touchMoveInput.current;
      move.current.addScaledVector(forward.current, t.y);
      move.current.addScaledVector(right.current, t.x);
    }

    const moveLen = move.current.length();
    if (moveLen > 0.0001) {
      // Cap at 1 (keyboard diagonals, or joystick pushed fully + a key
      // held) without amplifying a joystick's own partial deflection —
      // that's why this divides only when over 1, rather than always
      // normalizing to a fixed length the way the keyboard-only version
      // used to.
      if (moveLen > 1) move.current.divideScalar(moveLen);
      move.current.multiplyScalar(speed * delta);
      const nx = camera.position.x + move.current.x;
      const nz = camera.position.z + move.current.z;

      if (isInsideRoom(nx, nz)) {
        camera.position.x = nx;
        camera.position.z = nz;
      } else if (isInsideRoom(nx, camera.position.z)) {
        camera.position.x = nx;
      } else if (isInsideRoom(camera.position.x, nz)) {
        camera.position.z = nz;
      }
    }

    camera.position.y = eyeHeight;
  });

  return null;
}
