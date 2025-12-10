// Endpoints de la API del backend Forneria - Compatible con rama migracion
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const endpoints = {
  // === AUTH ===
  auth: {
    login: '/api/auth/login/',
    logout: '/api/auth/logout/',
    tokenRefresh: '/api/auth/token/refresh/',
  },

  // === ANALYTICS / DASHBOARD FINANCIERO ===
  analytics: {
    // Finanzas - Endpoints principales
    resumen: '/analytics/finanzas/resumen/',
    kpisHoy: '/analytics/finanzas/kpis-hoy/',
    
    // Finanzas - Gráficos temporales
    ventasDiarias: '/analytics/finanzas/ventas-diarias/',
    ventasPorHora: '/analytics/finanzas/ventas-por-hora/',
    comparativaMensual: '/analytics/finanzas/comparativa-mensual/',
    
    // Finanzas - Análisis de productos
    productosTop: '/analytics/finanzas/productos-top/',
    ventasPorCategoria: '/analytics/finanzas/ventas-por-categoria/',
    
    // Finanzas - Otros análisis
    ventasPorCanal: '/analytics/finanzas/ventas-por-canal/',
    clientesTop: '/analytics/finanzas/clientes-top/',
    
    // Métricas avanzadas
    metricasAvanzadas: '/analytics/finanzas/metricas-avanzadas/',
    ticketSegmentado: '/analytics/finanzas/ticket-segmentado/',
    ventasDiaSemana: '/analytics/finanzas/ventas-dia-semana/',
    clientesNuevosRecurrentes: '/analytics/finanzas/clientes-nuevos-recurrentes/',
    heatmapVentas: '/analytics/finanzas/heatmap-ventas/',
    proyeccion: '/analytics/finanzas/proyeccion/',
    comparativaMom: '/analytics/finanzas/mom/',
    alertas: '/analytics/finanzas/alertas/',
    
    // Exportación
    exportarExcel: '/analytics/finanzas/exportar/excel/',
    exportarCsv: '/analytics/finanzas/exportar/csv/',
    exportarPdf: '/analytics/finanzas/exportar/pdf/',
  },

  // === POS / VENTAS ===
  ventas: {
    list: '/pos/ventas/',
    detail: (id) => `/pos/ventas/${id}/`,
    create: '/pos/ventas/',
    dashboard: '/pos/dashboard/',
  },

  // === PRODUCTOS / INVENTARIO ===
  productos: {
    list: '/pos/productos/',
    detail: (id) => `/pos/productos/${id}/`,
    create: '/pos/productos/',
    update: (id) => `/pos/productos/${id}/`,
    delete: (id) => `/pos/productos/${id}/`,
  },

  // === CLIENTES ===
  clientes: {
    list: '/pos/clientes/',
    detail: (rut) => `/pos/clientes/${rut}/`,
    create: '/pos/clientes/',
    update: (id) => `/pos/clientes/${id}/`,
    delete: (id) => `/pos/clientes/${id}/`,
  },

  // === CATEGORÍAS ===
  categorias: {
    list: '/pos/categorias/',
    detail: (id) => `/pos/categorias/${id}/`,
  },

  // === LOTES ===
  lotes: {
    list: '/pos/lotes/',
    detail: (id) => `/pos/lotes/${id}/`,
    create: '/pos/lotes/',
    update: (id) => `/pos/lotes/${id}/`,
    delete: (id) => `/pos/lotes/${id}/`,
    byProduct: (productId) => `/pos/productos/${productId}/lotes/`,
  },

  // === PEDIDOS ===
  pedidos: {
    list: '/pedidos/',
    detail: (id) => `/pedidos/${id}/`,
    activos: '/pedidos/activos/',
  },

  // === INVENTARIO ===
  inventario: {
    list: '/inventario/',
  },

  // === EMPLEADOS ===
  empleados: {
    list: '/pos/empleados/',
    detail: (id) => `/pos/empleados/${id}/`,
  },

  // === MOVIMIENTOS INVENTARIO ===
  movimientos: {
    list: '/pos/movimientos-inventario/',
  },
};

export default endpoints;
