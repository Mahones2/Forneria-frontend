import React, { useState, useEffect, useCallback } from "react"; // Nota: React ya incluye useState, useEffect
import Loader from "../../components/UI/Loader"; 
import { Line, Bar, Doughnut } from "react-chartjs-2";

// ==========================================================
// 1. CORRECCIÓN: ELIMINAR client y endpoints
// 2. CORRECCIÓN: IMPORTAR SOLO DESDE EL SERVICIO
// ==========================================================
import { 
    getDashboardInventario, // Función que llama al endpoint consolidado '/dashboard/inventario/'
    // Opcional: Mantener si planeas usar los endpoints individuales para filtros o secciones específicas
    // getInventarioKPIs, 
    // getProductosStockBajo, 
    // getLotesVencimiento,
    // ...
} from '../../services/analyticsService'; 

import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const colors = {
  primary: '#0d6efd',
  success: '#198754',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#0dcaf0',
  purple: '#6f42c1',
  orange: '#fd7e14',
  teal: '#20c997',
};

export default function DashboardInventario() {
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Estados de datos
  const [kpis, setKpis] = useState(null);
  const [productosStockBajo, setProductosStockBajo] = useState([]);
  const [productosVencer, setProductosVencer] = useState([]);
  const [productosVencidos, setProductosVencidos] = useState(null);
  const [insumosStockBajo, setInsumosStockBajo] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState(null);
  const [comprasProveedor, setComprasProveedor] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [productosMasMovimiento, setProductosMasMovimiento] = useState([]);
  const [stockCategoria, setStockCategoria] = useState(null);
  const [valorizacion, setValorizacion] = useState(null);
  const [rotacion, setRotacion] = useState(null);
  const [alertas, setAlertas] = useState([]);
  
  // 3. CORRECCIÓN: Usar useCallback para estabilidad y la función de servicio
  const loadDashboard = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      // ❌ Código Antiguo: const dashboardResponse = await client.get(endpoints.dashboardInventario.dashboard, { params });
      
      // ✅ Código Corregido: Llamada directa al servicio
      const dashboardResponse = await getDashboardInventario(params); 
      // Si Axios está en el servicio, la respuesta es el objeto completo, usamos .data
      const data = dashboardResponse.data;

      // Setear KPIs
      setKpis(data.kpis || {});
      
      // Productos con stock bajo
      setProductosStockBajo(Array.isArray(data.productos_bajo_stock) ? data.productos_bajo_stock : []);
      
      // Productos próximos a vencer
      setProductosVencer(Array.isArray(data.productos_vencer) ? data.productos_vencer : []);
      
      // Productos vencidos
      // Nota: Asumo que el backend devuelve un objeto si hay datos o un objeto vacío si no.
      setProductosVencidos(data.productos_vencidos || null);
      
      // Insumos bajo stock (Asumo que esta data viene también en el endpoint consolidado)
      setInsumosStockBajo(Array.isArray(data.insumos_bajo_stock) ? data.insumos_bajo_stock : []);

      // Órdenes pendientes
      setOrdenesPendientes(data.ordenes_pendientes || null);

      // Compras por proveedor
      setComprasProveedor(data.compras_proveedor || null);
      
      // Movimientos de inventario
      setMovimientos(data.movimientos || null);
      
      // Productos con más movimiento
      setProductosMasMovimiento(Array.isArray(data.productos_movimiento) ? data.productos_movimiento : []);

      // Stock por categoría para el gráfico
      setStockCategoria(data.stock_categoria || null);

      // Valorización (tabla)
      setValorizacion(data.valorizacion || null);
      // Rotación (KPIs de rotación)
      setRotacion(data.rotacion || null);
      
      // Generar alertas basadas en los datos (la lógica de alertas se mantiene)
      const alertasLocal = [];
      
      if (data.productos_vencidos?.cantidad_lotes > 0) {
        alertasLocal.push({
          tipo: 'danger',
          titulo: 'Productos Vencidos',
          mensaje: `Hay ${data.productos_vencidos.cantidad_lotes} lotes vencidos con valor de $${Math.round(data.productos_vencidos.total_valor_perdido || 0).toLocaleString("es-CL")}`
        });
      }
      
      if (data.productos_vencer && data.productos_vencer.length > 0) {
        alertasLocal.push({
          tipo: 'warning',
          titulo: 'Productos Próximos a Vencer',
          mensaje: `Hay ${data.productos_vencer.length} lotes que vencen en los próximos 7 días`
        });
      }
      
      if (data.kpis?.productos_bajo_stock > 0) {
        alertasLocal.push({
          tipo: 'warning',
          titulo: 'Stock Bajo',
          mensaje: `${data.kpis.productos_bajo_stock} productos tienen stock bajo el mínimo`
        });
      }
      
      setAlertas(alertasLocal);

    } catch (err) {
      console.error("Error cargando dashboard inventario:", err);
    } finally {
      setLoading(false);
    }
  }, []); // Dependencias vacías, ya que loadDashboard no usa variables fuera del scope que cambien

  // 4. CORRECCIÓN: Usar loadDashboard como dependencia
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFiltrar = (e) => {
    e.preventDefault();
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    loadDashboard(params);
  };

  const handleResetFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    loadDashboard();
  };

  const formatCurrency = (value) => `$${Math.round(value).toLocaleString("es-CL")}`;

  // Configuración de gráficos (se mantiene intacta)
  const movimientosChartData = movimientos ? {
    labels: movimientos.labels || [],
    datasets: [
      {
        label: "Entradas",
        data: movimientos.entradas || [],
        borderColor: colors.success,
        backgroundColor: colors.success + '30',
        fill: true,
        tension: 0.4,
      },
      {
        label: "Salidas",
        data: movimientos.salidas || [],
        borderColor: colors.danger,
        backgroundColor: colors.danger + '30',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const stockCategoriaChartData = stockCategoria ? {
    labels: stockCategoria.labels || [],
    datasets: [{
      data: stockCategoria.valores || [],
      backgroundColor: [colors.primary, colors.success, colors.warning, colors.danger, colors.info, colors.purple, colors.teal, colors.orange],
    }],
  } : null;

  const comprasProveedorChartData = comprasProveedor ? {
    labels: comprasProveedor.labels || [],
    datasets: [{
      label: "Total Compras",
      data: comprasProveedor.totales || [],
      backgroundColor: colors.primary,
    }],
  } : null;

  // Gráfico de Stock Actual vs Stock Mínimo (top 10 productos con stock bajo)
  const stockBajoChartData = productosStockBajo.length > 0 ? {
    labels: productosStockBajo.slice(0, 10).map(p => p.producto_nombre?.substring(0, 20) || 'Sin nombre'),
    datasets: [
      {
        label: "Stock Actual",
        data: productosStockBajo.slice(0, 10).map(p => p.stock_actual || 0),
        backgroundColor: colors.warning,
      },
      {
        label: "Stock Mínimo",
        data: productosStockBajo.slice(0, 10).map(p => p.stock_minimo || 0),
        backgroundColor: colors.danger + '80',
      },
    ],
  } : null;

  // Gráfico de productos próximos a vencer (agrupados por días restantes)
  const productosVencerChartData = productosVencer.length > 0 ? (() => {
    const grupos = { '0-2 días': 0, '3-4 días': 0, '5-7 días': 0 };
    productosVencer.forEach(p => {
      // Usamos dias_restantes en lugar de dias_para_vencer, asumiendo que el backend envía el campo correcto
      const dias = p.dias_restantes || p.dias_para_vencer; 
      if (dias <= 2) grupos['0-2 días']++;
      else if (dias <= 4) grupos['3-4 días']++;
      else grupos['5-7 días']++;
    });
    return {
      labels: Object.keys(grupos),
      datasets: [{
        data: Object.values(grupos),
        backgroundColor: [colors.danger, colors.warning, colors.info],
      }],
    };
  })() : null;

  // Gráfico de KPIs principales (barras horizontales)
  const kpisChartData = kpis ? {
    labels: ['Total Productos', 'Stock Bajo', 'Valor Total', 'Productos Activos'],
    datasets: [{
      label: 'Métricas',
      data: [
        kpis.total_productos || 0,
        kpis.productos_bajo_stock || 0,
        (kpis.valor_total_inventario || 0) / 1000, // Dividido por 1000 para mejor escala
        kpis.productos_activos || 0,
      ],
      backgroundColor: [colors.primary, colors.warning, colors.success, colors.info],
    }],
  } : null;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Dashboard de Inventario</h2>
          <p className="text-muted mb-0">Control de stock y productos</p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => loadDashboard({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })}>
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>

      {alertas.length > 0 && (
        <div className="mb-4">
          {alertas.map((alerta, idx) => (
            <div key={idx} className={`alert alert-${alerta.tipo} alert-dismissible fade show`}>
              <strong>{alerta.titulo}:</strong> {alerta.mensaje}
              <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
            </div>
          ))}
        </div>
      )}

      {/* FILTROS */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleFiltrar} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Fecha Inicio</label>
              <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Fecha Fin</label>
              <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div className="col-md-4 d-flex align-items-end gap-2">
              <button type="submit" className="btn btn-primary">Aplicar Filtros</button>
              <button type="button" className="btn btn-secondary" onClick={handleResetFiltros}>Resetear</button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (<Loader />) : (
        <>
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#metricas">
                <i className="bi bi-graph-up"></i> Métricas y KPIs
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link" data-bs-toggle="tab" data-bs-target="#graficos">
                <i className="bi bi-bar-chart-line"></i> Gráficos y Análisis
              </button>
            </li>
          </ul>

          <div className="tab-content">
            <div className="tab-pane fade show active" id="metricas">
              {kpis && (
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-primary">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Total Productos</h6>
                        <h3 className="mb-1">{kpis.total_productos}</h3>
                        <small className="text-muted">{kpis.total_lotes} lotes activos</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-success">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Stock Total</h6>
                        <h3 className="mb-1">{kpis.stock_total_unidades}</h3>
                        <small className="text-muted">unidades</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-info">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Valor Inventario</h6>
                        <h3 className="mb-1">{formatCurrency(kpis.valor_inventario)}</h3>
                        <small className="text-muted">Precio de venta</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className={`card border-${kpis.utilidad_potencial >= 0 ? 'success' : 'danger'}`}>
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Utilidad Potencial</h6>
                        <h3 className={`mb-1 ${kpis.utilidad_potencial >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(kpis.utilidad_potencial)}</h3>
                        <small className="text-muted">Valor - Costo</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="card bg-danger text-white">
                    <div className="card-body">
                      <h6 className="text-white-50 mb-2">Productos Bajo Stock</h6>
                      <h3 className="mb-1">{kpis?.productos_bajo_stock || 0}</h3>
                      <small className="text-white-50">Requieren reposición</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-warning text-dark">
                    <div className="card-body">
                      <h6 className="mb-2">Insumos Bajo Stock</h6>
                      <h3 className="mb-1">{kpis?.insumos_bajo_stock || 0}</h3>
                      <small>Necesitan compra</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-info text-white">
                    <div className="card-body">
                      <h6 className="text-white-50 mb-2">Órdenes Pendientes</h6>
                      <h3 className="mb-1">{ordenesPendientes?.cantidad_ordenes || 0}</h3>
                      <small className="text-white-50">{formatCurrency(ordenesPendientes?.total_pendiente || 0)}</small>
                    </div>
                  </div>
                </div>
              </div>

              {rotacion && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0"><i className="bi bi-arrow-repeat"></i> Rotación de Inventario</h5></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Rotación Anual</p>
                        <h4>{rotacion.rotacion_anual?.toFixed(2)}</h4>
                        <small className="text-muted">veces/año</small>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Días de Inventario</p>
                        <h4>{rotacion.dias_inventario?.toFixed(0)}</h4>
                        <small className="text-muted">días promedio</small>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Costo de Ventas</p>
                        <h4>{formatCurrency(rotacion.costo_ventas)}</h4>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Inventario Promedio</p>
                        <h4>{formatCurrency(rotacion.inventario_promedio)}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {productosStockBajo.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Productos con Stock Bajo</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Producto</th><th>Categoría</th><th>Lote</th><th className="text-end">Stock Actual</th><th className="text-end">Stock Mínimo</th><th className="text-end">Faltante</th></tr>
                        </thead>
                        <tbody>
                          {productosStockBajo.map((p, idx) => (
                            <tr key={idx}>
                              <td><strong>{p.producto_nombre}</strong></td>
                              <td><span className="badge bg-secondary">{p.categoria}</span></td>
                              <td>{p.numero_lote}</td>
                              <td className="text-end text-danger"><strong>{p.stock_actual}</strong></td>
                              <td className="text-end">{p.stock_minimo}</td>
                              <td className="text-end text-warning">{p.diferencia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {productosVencer.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-warning"><h5 className="mb-0">Productos Próximos a Vencer (7 días)</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Producto</th><th>Lote</th><th>Fecha Caducidad</th><th className="text-end">Días Restantes</th><th className="text-end">Stock</th><th className="text-end">Valor en Riesgo</th></tr>
                        </thead>
                        <tbody>
                          {productosVencer.map((p, idx) => (
                            <tr key={idx}>
                              <td><strong>{p.producto_nombre}</strong></td>
                              <td>{p.numero_lote}</td>
                              <td>{p.fecha_caducidad}</td>
                              <td className="text-end">
                                <span className={`badge ${p.dias_restantes <= 3 ? 'bg-danger' : 'bg-warning'}`}>{p.dias_restantes} días</span>
                              </td>
                              <td className="text-end">{p.stock_actual}</td>
                              <td className="text-end text-danger">{formatCurrency(p.valor_riesgo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {productosVencidos?.cantidad_lotes > 0 && (
                <div className="card mb-4 border-danger">
                  <div className="card-header bg-danger text-white"><h5 className="mb-0">Productos Vencidos - Valor Perdido: {formatCurrency(productosVencidos.total_valor_perdido)}</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Producto</th><th>Lote</th><th>Fecha Caducidad</th><th className="text-end">Días Vencido</th><th className="text-end">Stock</th><th className="text-end">Valor Perdido</th></tr>
                        </thead>
                        <tbody>
                          {productosVencidos.productos && Array.isArray(productosVencidos.productos) && productosVencidos.productos.map((p, idx) => (
                            <tr key={idx}>
                              <td><strong>{p.producto_nombre}</strong></td>
                              <td>{p.numero_lote}</td>
                              <td>{p.fecha_caducidad}</td>
                              <td className="text-end text-danger">{p.dias_vencido} días</td>
                              <td className="text-end">{p.stock_actual}</td>
                              <td className="text-end text-danger"><strong>{formatCurrency(p.valor_perdido)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {insumosStockBajo.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Insumos con Stock Bajo</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Insumo</th><th>Proveedor</th><th>Unidad</th><th className="text-end">Stock Actual</th><th className="text-end">Stock Mínimo</th><th className="text-end">Faltante</th></tr>
                        </thead>
                        <tbody>
                          {insumosStockBajo.map((i, idx) => (
                            <tr key={idx}>
                              <td><strong>{i.nombre}</strong></td>
                              <td>{i.proveedor}</td>
                              <td>{i.unidad_medida}</td>
                              <td className="text-end text-danger"><strong>{i.stock_actual?.toFixed(2)}</strong></td>
                              <td className="text-end">{i.stock_minimo?.toFixed(2)}</td>
                              <td className="text-end text-warning">{i.diferencia?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* GRÁFICOS */}
            <div className="tab-pane fade" id="graficos">
              {movimientosChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Movimientos de Inventario (Entradas vs Salidas)</h5></div>
                  <div className="card-body">
                    <Line data={movimientosChartData} options={{
                      responsive: true, plugins: { legend: { position: 'top' }},
                      scales: { y: { beginAtZero: true }}
                    }} height={80} />
                  </div>
                </div>
              )}

              <div className="row mb-4">
                {stockCategoriaChartData && (
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Stock por Categoría</h5></div>
                      <div className="card-body"><Doughnut data={stockCategoriaChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }}}} height={200} /></div>
                    </div>
                  </div>
                )}
                {comprasProveedorChartData && (
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Compras por Proveedor</h5></div>
                      <div className="card-body"><Bar data={comprasProveedorChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }}, scales: { y: { beginAtZero: true }}}} height={200} /></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nuevos gráficos */}
              <div className="row mb-4">
                {productosVencerChartData && (
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Productos Próximos a Vencer</h5></div>
                      <div className="card-body"><Doughnut data={productosVencerChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }}}} height={200} /></div>
                    </div>
                  </div>
                )}
                {kpisChartData && (
                  <div className="col-md-8">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Métricas Principales</h5></div>
                      <div className="card-body">
                        <Bar data={kpisChartData} options={{ 
                          indexAxis: 'y',
                          responsive: true, 
                          maintainAspectRatio: false, 
                          plugins: { legend: { display: false }}, 
                          scales: { x: { beginAtZero: true }}
                        }} height={200} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {stockBajoChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Top 10 Productos con Stock Bajo - Comparación Stock Actual vs Mínimo</h5></div>
                  <div className="card-body">
                    <Bar data={stockBajoChartData} options={{
                      responsive: true, 
                      plugins: { legend: { position: 'top' }},
                      scales: { y: { beginAtZero: true }}
                    }} height={80} />
                  </div>
                </div>
              )}

              {valorizacion && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Valorización por Categoría</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>Categoría</th><th className="text-end">Costo Total</th><th className="text-end">Precio Venta</th><th className="text-end">Utilidad Potencial</th><th className="text-end">Margen %</th></tr>
                        </thead>
                        <tbody>
                          {valorizacion.categorias?.map((cat, idx) => (
                            <tr key={idx}>
                              <td><strong>{cat.categoria}</strong></td>
                              <td className="text-end">{formatCurrency(cat.costo)}</td>
                              <td className="text-end">{formatCurrency(cat.precio_venta)}</td>
                              <td className={`text-end ${cat.utilidad_potencial >= 0 ? 'text-success' : 'text-danger'}`}><strong>{formatCurrency(cat.utilidad_potencial)}</strong></td>
                              <td className="text-end">
                                <span className={`badge ${cat.margen_pct >= 50 ? 'bg-success' : cat.margen_pct >= 30 ? 'bg-primary' : 'bg-warning'}`}>{cat.margen_pct}%</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="table-active">
                            <td><strong>TOTAL</strong></td>
                            <td className="text-end"><strong>{formatCurrency(valorizacion.total_costo)}</strong></td>
                            <td className="text-end"><strong>{formatCurrency(valorizacion.total_precio)}</strong></td>
                            <td className="text-end text-success"><strong>{formatCurrency(valorizacion.total_utilidad_potencial)}</strong></td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {productosMasMovimiento.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Top 10 Productos con Más Movimiento</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr><th>#</th><th>Producto</th><th>Categoría</th><th className="text-end">Total Movimientos</th></tr>
                        </thead>
                        <tbody>
                          {productosMasMovimiento.map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td><strong>{p.nombre}</strong></td>
                              <td><span className="badge bg-secondary">{p.categoria}</span></td>
                              <td className="text-end"><strong>{p.total_movimientos}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}