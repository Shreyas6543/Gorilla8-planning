import { useEffect, useRef } from "react";
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
}

export function FirstPersonController({ eyeHeight, speed }: FirstPersonControllerProps) {
  const { camera } = useThree();
  const keys = useKeyState();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up);

    move.current.set(0, 0, 0);
    if (keys.current.forward) move.current.add(forward.current);
    if (keys.current.backward) move.current.sub(forward.current);
    if (keys.current.right) move.current.add(right.current);
    if (keys.current.left) move.current.sub(right.current);

    if (move.current.lengthSq() > 0) {
      move.current.normalize().multiplyScalar(speed * delta);
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
