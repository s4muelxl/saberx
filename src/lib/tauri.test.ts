import { describe, it, expect } from 'vitest';

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import { isTauriEnvironment, getPlatformInfo } from './tauri';

describe('Tauri Desktop Integration Tests', () => {
  it('detecta ambiente web padrão quando flags do tauri não estão injetadas', () => {
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    const info = getPlatformInfo();
    expect(info.type).toBe('WEB');
    expect(info.isNative).toBe(false);
    expect(isTauriEnvironment()).toBe(false);
  });

  it('detecta ambiente desktop nativo quando window.__TAURI__ existe', () => {
    (window as any).__TAURI__ = {};
    expect(isTauriEnvironment()).toBe(true);
    expect(getPlatformInfo().type).toBe('DESKTOP');
    expect(getPlatformInfo().isNative).toBe(true);

    // Limpa
    delete (window as any).__TAURI__;
    expect(isTauriEnvironment()).toBe(false);
  });
});
