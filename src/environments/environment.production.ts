// src/environments/environment.ts
export const environment = {

  production: true,

  BaseUrl: 'https://gestiondemanda-api.dssm.cl',
  apiBaseUrl: 'https://gestiondemanda-api.dssm.cl/api/v1',
  authBaseUrl: 'https://gestiondemanda-api.dssm.cl/auth',

  enableDebugTools: false,
  frontendVersion: '2026-10-20-control-ejecutivo-v1',



  /** Build de producción */
  //environmentName: 'prod',

  /** Flags opcionales (ajusta si los usas) */
  /** para mostrar */
  /** no mostrar */
  // 🔄 Versión frontend para limpieza controlada de caché
  /**
   * IMPORTANTE: siempre HTTPS para evitar redirecciones y problemas de CORS.
   * No dejes slash final para evitar // al concatenar.
   */

  /** 🔐 API protegida (todas las requests con token) */

  /** 🔑 Auth (login / refresh / etc.) */

  /** 🌐 Backend actual DSSM / red interna */
  /** 🔐 API protegida */
  /** 🔑 Auth */

};
