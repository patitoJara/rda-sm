// src/environments/environment.ts
export const environment = {
  /** Build de producción */
  production: true,
  environmentName: 'prod',

  /**
   * IMPORTANTE: siempre HTTPS para evitar redirecciones y problemas de CORS.
   * No dejes slash final para evitar // al concatenar.
   */
  //BaseUrl: 'https://backend02-production.up.railway.app',

  /** 🔐 API protegida (todas las requests con token) */
  //apiBaseUrl: 'https://backend02-production.up.railway.app/api/v1',

  /** 🔑 Auth (login / refresh / etc.) */
  //authBaseUrl: 'https://backend02-production.up.railway.app/auth',
  
  /** 🌐 Backend actual DSSM / red interna */
  BaseUrl: 'http://192.168.0.221:8080',

  /** 🔐 API protegida */
  apiBaseUrl: 'http://192.168.0.221:8080/api/v1',

  /** 🔑 Auth */
  authBaseUrl: 'http://192.168.0.221:8080/auth',
  

  /** Flags opcionales (ajusta si los usas) */
  enableDebugTools: true,

  // 🔄 Versión frontend para limpieza controlada de caché
  frontendVersion: '2026-06-19-01',
};
