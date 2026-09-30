/**
 * Utilitários para integração e detecção do ambiente Desktop Tauri
 */

export const isTauriEnvironment = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
};

export const getPlatformInfo = () => {
  if (isTauriEnvironment()) {
    return {
      type: 'DESKTOP' as const,
      label: 'SaberX Desktop App (Tauri v2)',
      isNative: true,
    };
  }
  return {
    type: 'WEB' as const,
    label: 'SaberX Web & PWA',
    isNative: false,
  };
};
