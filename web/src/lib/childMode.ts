// childMode.ts — local-device "this is the child" lock.
// The child shares the parent's auth credentials but is scoped to a single
// child_profiles row on this device. Sign-out clears the lock.

const KEY = "growquest:child_id";

export const childMode = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(childId: string): void {
    try {
      localStorage.setItem(KEY, childId);
    } catch {
      /* private mode etc — ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
};
