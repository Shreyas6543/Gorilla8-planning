// Lightweight edit gate for the Expenses page. This is NOT real security —
// the passcode ships inside the built client bundle (normal for a
// Vite env var), so anyone with access to the deployed/dev bundle could
// recover it. It's meant to stop casual/accidental edits by someone who
// opens the page without the passcode, not to protect against a determined
// attacker.
//
// Deliberately not persisted anywhere (no sessionStorage/localStorage) —
// unlocking is in-memory only, so a refresh, a tab close, or navigating away
// and back always requires the passcode again.

const DEFAULT_PASSCODE = "gorilla8"; // used only if VITE_EDIT_PASSCODE isn't set

export function getConfiguredPasscode(): string {
  const fromEnv = import.meta.env.VITE_EDIT_PASSCODE;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : DEFAULT_PASSCODE;
}

export function checkPasscode(input: string): boolean {
  return input.trim().length > 0 && input.trim() === getConfiguredPasscode();
}

// Separate, lower-stakes passcode: gates VIEWING every internal page (see
// components/Gate.tsx), not editing. Deliberately a different value from
// the edit passcode above — meant to be shared with partners who need to
// see the numbers but shouldn't need (or have) edit access. See
// state/viewerAuth.tsx for how this unlock persists (unlike admin/edit,
// which is intentionally session-only).
const DEFAULT_VIEW_PASSCODE = "gorilla8team"; // used only if VITE_VIEW_PASSCODE isn't set

export function getConfiguredViewPasscode(): string {
  const fromEnv = import.meta.env.VITE_VIEW_PASSCODE;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : DEFAULT_VIEW_PASSCODE;
}

export function checkViewPasscode(input: string): boolean {
  return input.trim().length > 0 && input.trim() === getConfiguredViewPasscode();
}
