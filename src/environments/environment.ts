// src/environments/environment.ts
export const environment = {

  production: false,

  BaseUrl: 'https://gestiondemanda-api.dssm.cl',
  apiBaseUrl: 'https://gestiondemanda-api.dssm.cl/api/v1',
  authBaseUrl: 'https://gestiondemanda-api.dssm.cl/auth',

  enableDebugTools: true,
  frontendVersion: '2026-07-01-sirus-test-01',



  /** Build de producción */
  //production: true,
  //environmentName: 'prod',
  //BaseUrl: 'http://10.8.74.156:8095',
  //apiBaseUrl: 'http://10.8.74.156:8095/api/v1', 
  //authBaseUrl: 'http://10.8.74.156:8095/auth',

  /** Flags opcionales (ajusta si los usas) */
  /** para mostrar */
  //enableDebugTools: true,
  /** no mostrar */
  //enableDebugTools: false,
  // 🔄 Versión frontend para limpieza controlada de caché
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
  //BaseUrl: 'http://192.168.0.221:8080',
  /** 🔐 API protegida */
  //apiBaseUrl: 'http://192.168.0.221:8080/api/v1',
  /** 🔑 Auth */
  //authBaseUrl: 'http://192.168.0.221:8080/auth',
  
};

