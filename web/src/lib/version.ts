// Single source of truth for the app version shown in the UI (About
// card, feedback email). Bump alongside package.json on releases.
// Vite injects the build timestamp so testers can tell two builds of
// the same version apart when reporting bugs.
export const APP_VERSION = "0.1.0";
export const BUILD_TIME = __BUILD_TIME__;
