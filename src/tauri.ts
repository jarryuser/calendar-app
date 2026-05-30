// Desktop (Tauri) integration. No-op in the browser build.

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function setupDesktop(): Promise<void> {
  // reserved for future desktop-specific initialization
}
