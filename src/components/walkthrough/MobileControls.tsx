import { useEffect, useRef, useState } from "react";

// Desktop drives movement from keydown/up and looking from real mouse
// pointer-lock (see FirstPersonController + drei's PointerLockControls).
// Neither exists on a touch device — there's no keyboard, and touchmove
// never generates the locked-pointer movementX/Y deltas Pointer Lock
// depends on — which is exactly why the walkthrough was unusable on
// mobile before this. These two hooks detect that situation so
// WalkthroughPage can swap in the touch-native controls below instead.
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);
  return isTouch;
}

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() => (typeof window !== "undefined" ? window.innerWidth > window.innerHeight : true));
  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return isLandscape;
}

// Best-effort landscape lock for the browsers that support it (Android
// Chrome, in fullscreen) — the Screen Orientation lock API has no iOS
// Safari support at all, and even on Android it only works once the page
// is actually in fullscreen, so this can silently fail; RotateDevicePrompt
// below is the real cross-browser fallback, not this.
export async function tryLockLandscape() {
  try {
    const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    if (el.requestFullscreen && !document.fullscreenElement) {
      await el.requestFullscreen();
    }
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // Unsupported on this browser (notably iOS Safari) — the rotate
    // prompt is what actually carries these devices, this is just a
    // convenience for the ones that do support it.
  }
}

export interface JoystickVector {
  x: number; // strafe, -1..1
  y: number; // forward, -1..1
}

// Movement stick — bottom-left, thumb-sized. Reports a normalized,
// analog vector rather than the 4 on/off booleans keyboard input uses,
// so partial deflection gives partial speed (a real joystick feel, not
// a d-pad pretending to be one).
export function VirtualJoystick({ onChange }: { onChange: (v: JoystickVector) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const RADIUS = 46;

  const move = (clientX: number, clientY: number) => {
    const dx = clientX - origin.current.x;
    const dy = clientY - origin.current.y;
    const dist = Math.min(Math.hypot(dx, dy), RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    setKnob({ x: kx, y: ky });
    onChange({ x: kx / RADIUS, y: -ky / RADIUS });
  };
  const end = () => {
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div
      onTouchStart={(e) => {
        e.stopPropagation();
        const t = e.changedTouches[0];
        activeId.current = t.identifier;
        origin.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current) move(t.clientX, t.clientY);
        }
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        end();
      }}
      onTouchCancel={(e) => {
        e.stopPropagation();
        end();
      }}
      style={{
        position: "absolute",
        left: 28,
        bottom: 28,
        width: 116,
        height: 116,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.10)",
        border: "2px solid rgba(255,255,255,0.35)",
        touchAction: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `calc(50% + ${knob.x}px - 26px)`,
          top: `calc(50% + ${knob.y}px - 26px)`,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.55)",
        }}
      />
    </div>
  );
}

// Look area — the rest of the screen (everything not over the joystick,
// which sits in its own corner and stops its own touches from bubbling
// here via stopPropagation above). Reports raw per-move pixel deltas;
// FirstPersonController turns those into yaw/pitch itself, the same way
// it already turns mouse movementX/Y into rotation on desktop.
export function TouchLookArea({ onDelta }: { onDelta: (dx: number, dy: number) => void }) {
  const last = useRef<{ x: number; y: number } | null>(null);
  const activeId = useRef<number | null>(null);

  return (
    <div
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        activeId.current = t.identifier;
        last.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current && last.current) {
            onDelta(t.clientX - last.current.x, t.clientY - last.current.y);
            last.current = { x: t.clientX, y: t.clientY };
          }
        }
      }}
      onTouchEnd={() => {
        activeId.current = null;
        last.current = null;
      }}
      onTouchCancel={() => {
        activeId.current = null;
        last.current = null;
      }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    />
  );
}
