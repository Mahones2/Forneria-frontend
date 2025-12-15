// src/api/endpoints.js (VERSIÓN FINAL)

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const endpoints = {
  // === AUTH === (Se mantiene igual)

  auth: {
    // CORRECCIÓN: Agregamos /pos/ al inicio porque así quedó tu urls.py
    login: '/pos/api/auth/login/', 
    logout: '/pos/api/auth/logout/',
    tokenRefresh: '/pos/api/auth/refresh/',
    // Endpoint del empleado logueado
    me: '/pos/me/', 
  },

  // =========================================================
  // === ANALYTICS (DASHBOARD FINANCIERO) ===
  // =========================================================
  analytics: {
    // Endpoints principales (Asumimos rutas basadas en tu analytics/urls.py)
    resumen: '/analytics/finanzas/resumen/', // Nuevo endpoint
    kpisHoy: '/analytics/finanzas/kpis-hoy/',
    
    // Gráficos temporales
    ventasDiarias: '/analytics/finanzas/ventas-diarias/',
    ventasPorHora: '/analytics/finanzas/ventas-por-hora/', // Nuevo endpoint
    comparativaMensual: '/analytics/finanzas/comparativa-mensual/', // Nuevo endpoint

    // Análisis de productos
    productosTop: '/analytics/finanzas/productos-top/', // Nuevo endpoint
    ventasPorCategoria: '/analytics/finanzas/ventas-por-categoria/', // Nuevo endpoint

    // Otros análisis
    ventasPorCanal: '/analytics/finanzas/ventas-por-canal/', // Nuevo endpoint
    clientesTop: '/analytics/finanzas/clientes-top/', // Nuevo endpoint

    // Métricas avanzadas
    metricasAvanzadas: '/analytics/finanzas/metricas-avanzadas/', // Nuevo endpoint
    ticketSegmentado: '/analytics/finanzas/ticket-segmentado/', // Nuevo endpoint
    ventasDiaSemana: '/analytics/finanzas/ventas-dia-semana/', // Nuevo endpoint
    clientesNuevosRecurrentes: '/analytics/finanzas/clientes-nuevos-recurrentes/', // Nuevo endpoint
    heatmapVentas: '/analytics/finanzas/heatmap-ventas/', // Nuevo endpoint
    proyeccion: '/analytics/finanzas/proyeccion/', // Nuevo endpoint
    comparativaMom: '/analytics/finanzas/mom/', // Nuevo endpoint
    alertas: '/analytics/finanzas/alertas/', // Nuevo endpoint

    // Análisis financiero profundo
    utilidadBruta: '/analytics/finanzas/utilidad-bruta/',
    gastosOperativos: '/analytics/finanzas/gastos-operativos/', // Nuevo endpoint
    utilidadNeta: '/analytics/finanzas/utilidad-neta/', // Nuevo endpoint
    roi: '/analytics/finanzas/roi/', // Nuevo endpoint
    puntoEquilibrio: '/analytics/finanzas/punto-equilibrio/', // Nuevo endpoint
    productosRentables: '/analytics/finanzas/productos-rentables/',
    flujoCaja: '/analytics/finanzas/flujo-caja/', // Nuevo endpoint

    // Exportación
    exportarExcel: '/analytics/finanzas/exportar/excel/', // Nuevo endpoint
    exportarCsv: '/analytics/finanzas/exportar/csv/', // Nuevo endpoint
    exportarPdf: '/analytics/finanzas/exportar/pdf/', // Nuevo endpoint
    
    // Endpoint Consolidado (Opcional, si quieres cargar todo en una llamada)
    consolidado: '/analytics/dashboard/finanzas/', 
  },

  // =========================================================
  // === DASHBOARD INVENTARIO (CONSOLIDADO + Desagregados) ===
  // =========================================================
  dashboardInventario: {
    dashboard: '/dashboard/inventario/', 
    consolidado: '/dashboard/inventario/', // Alias para compatibilidad

    // KPIs y métricas generales
    kpisGenerales: '/inventario/kpis-generales/', // Asumiendo que existe
    
    // Alertas de stock
    productosStockBajo: '/inventario/productos-stock-bajo/', // Asumiendo que existe
    productosProximosVencer: '/inventario/productos-proximos-vencer/', // Asumiendo que existe
    productosVencidos: '/inventario/productos-vencidos/', // Asumiendo que existe
    insumosStockBajo: '/inventario/insumos-stock-bajo/', // Asumiendo que existe

    // Órdenes de compra
    ordenesPendientes: '/inventario/ordenes-pendientes/', // Asumiendo que existe
    comprasPorProveedor: '/inventario/compras-por-proveedor/', // Asumiendo que existe

    // Movimientos y análisis
    movimientosInventario: '/inventario/movimientos-inventario/', // Asumiendo que existe
    productosMasMovimiento: '/inventario/productos-mas-movimiento/', // Asumiendo que existe

    // Distribución y valorización
    stockPorCategoria: '/inventario/stock-por-categoria/', // Asumiendo que existe
    valorizacionPorCategoria: '/inventario/valorizacion-por-categoria/', // Asumiendo que existe

    // Rotación
    rotacionInventario: '/inventario/rotacion-inventario/', // Asumiendo que existe

    // Alertas
    resumenAlertas: '/inventario/resumen-alertas/', // Asumiendo que existe
    alertasActivas: '/inventario/alertas-activas/', // Asumiendo que existe
  },

  // === POS / VENTAS === (Se mantienen igual)
  ventas: {
    list: '/pos/api/ventas/',
    detail: (id) => `/pos/api/ventas/${id}/`,
    create: '/pos/api/vender/',
  },

  // === CLIENTES === (Se mantienen igual)
  clientes: {
    list: '/pos/api/clientes/',
    detail: (rut) => `/pos/api/clientes/${rut}/`,
    create: '/pos/api/clientes/',
    update: (id) => `/pos/api/clientes/${id}/`,
  },

  // === PRODUCTOS / INVENTARIO (Gestión) === (Se mantienen igual)
  productos: {
    list: '/pos/api/productos/',
    detail: (id) => `/pos/api/productos/${id}/`,
    create: '/pos/api/productos/',
    update: (id) => `/pos/api/productos/${id}/`,
    delete: (id) => `/pos/api/productos/${id}/`,
  },
  
  // === LOTES === (Se mantienen igual)
  lotes: {
    byProduct: (productId) => `/pos/api/productos/${productId}/lotes/`,
  },

  // === PEDIDOS === (Se mantienen igual)
  pedidos: {
    list: '/pedidos/',
    detail: (id) => `/pedidos/${id}/`,
    activos: '/pedidos/activos/',
  },

  // === MOVIMIENTOS INVENTARIO === (Se mantienen igual)
  movimientos: {
    list: '/pos/api/movimientos/',
  },
};