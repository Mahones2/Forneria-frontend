import { useState, useEffect, useCallback } from "react";
import { getDashboardFinanciero } from "../../services/analyticsService";
import Loader from "../../components/UI/Loader";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

const colors = {
  primary: "#0d6efd",
  success: "#198754",
  danger: "#dc3545",
  warning: "#ffc107",
  info: "#0dcaf0",
  purple: "#6f42c1",
  orange: "#fd7e14",
  teal: "#20c997",
  pink: "#d63384",
};

export default function DashboardFinanciero() {
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Estado único para datos consolidados
  const [dashboardData, setDashboardData] = useState({comparativaMom: [],});

  // Setters para claridad
  const setKpisHoy = (data) =>
    setDashboardData((prev) => ({ ...prev, kpisHoy: data }));
  const setResumen = (data) =>
    setDashboardData((prev) => ({ ...prev, resumen: data }));
  const setVentasDiarias = (data) =>
    setDashboardData((prev) => ({ ...prev, ventasDiarias: data }));
  const setProductosTop = (data) =>
    setDashboardData((prev) => ({ ...prev, productosTop: data }));
  const setVentasPorCategoria = (data) =>
    setDashboardData((prev) => ({ ...prev, ventasPorCategoria: data }));
  const setMetricasAvanzadas = (data) =>
    setDashboardData((prev) => ({ ...prev, metricasAvanzadas: data }));
  const setComparativaMom = (data) =>
    setDashboardData((prev) => ({ ...prev, comparativaMom: data }));

  // Desestructuración de datos
  
  const kpisHoy = dashboardData?.kpisHoy || [];
  const resumen = dashboardData?.resumen || [];
  const ventasDiarias = dashboardData?.ventasDiarias || [];
  const productosTop = dashboardData?.productosTop || [];
  const ventasPorCategoria = dashboardData?.ventasPorCategoria || [];
  const metricasAvanzadas = dashboardData?.metricasAvanzadas || [];
  const comparativaMom = dashboardData?.comparativaMom || [];
  const ventasDiaSemana = dashboardData?.ventasDiaSemana || [];
  const ventasPorHora = dashboardData?.ventasPorHora || [];
  const ventasPorCanal = dashboardData?.ventasPorCanal || [];
  const clientesNuevosRecurrentes = dashboardData?.clientesNuevosRecurrentes || [];
  const clientesTop = dashboardData?.clientesTop || [];
  const proyeccion = dashboardData?.proyeccion || [];
  const alertas = dashboardData?.alertas || [];
  const utilidadBruta = dashboardData?.utilidadBruta || [];
  const gastosOperativos = dashboardData?.gastosOperativos || [];
  const utilidadNeta = dashboardData?.utilidadNeta || [];
  const roi = dashboardData?.roi || [];
  const puntoEquilibrio = dashboardData?.puntoEquilibrio || [];
  const productosRentables = dashboardData?.productosRentables || [];
  const flujoCaja = dashboardData?.flujoCaja || [];

  // === FUNCIÓN DE CARGA CORREGIDA ===
  const loadDashboard = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const data = await getDashboardFinanciero(params);
      setDashboardData(data);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const momChartData = {
    // Labels del eje X (ej: Enero, Febrero, Marzo)
    labels: comparativaMom.map(item => item.mes_nombre),
    datasets: [
        {
            label: 'Ventas Mensuales',
            // Datos del eje Y (ventas)
            data: comparativaMom.map(item => item.ventas_totales),
            backgroundColor: colors.primary,
        }
    ]
};

  const diaSemanaChartData = {
      // Labels del eje X (ej: Lunes, Martes)
      labels: ventasDiaSemana?.map(item => item.dia) || [], 
      datasets: [
          {
              label: 'Ventas por Día de la Semana',
              // Datos del eje Y (ventas)
              data: ventasDiaSemana?.map(item => item.ventas) || [],
              backgroundColor: [
                  colors.primary, colors.success, colors.danger, 
                  colors.warning, colors.info, colors.purple, colors.orange
              ],
              // Si es una gráfica de barras o dona
          }
      ]
  };

  const netasIvaChartData = {
      // Labels del eje X (ej: las fechas)
      labels: ventasDiarias.map(item => item.fecha), // Usamos ventasDiarias
      datasets: [
          {
              label: 'Ventas Netas',
              // Asumiendo que la data tiene la clave 'netas'
              data: ventasDiarias.map(item => item.netas), 
              borderColor: colors.primary,
              backgroundColor: colors.primary + '30', 
              fill: true,
              tension: 0.4, // Suavidad de la línea
          },
          {
              label: 'IVA',
              // Asumiendo que la data tiene la clave 'iva'
              data: ventasDiarias.map(item => item.iva), 
              borderColor: colors.success,
              backgroundColor: colors.success + '30',
              fill: true,
              tension: 0.4,
          }
      ]
  };

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

  const formatCurrency = (value) =>
    `$${Math.round(value).toLocaleString("es-CL")}`;

  // ============ CONFIGURACIÓN DE GRÁFICOS ============

  // Ejemplo: Ventas Diarias + Proyección
  const ventasDiariasChartData = ventasDiarias
    ? proyeccion
      ? {
          labels: [
            ...(ventasDiarias.labels || []),
            ...(proyeccion.proyecciones?.map((p) => p.fecha) || []),
          ],
          datasets: [
            {
              label: "Ventas Reales",
              data: [
                ...(ventasDiarias.totales || []),
                ...Array(proyeccion.proyecciones?.length || 0).fill(null),
              ],
              borderColor: colors.primary,
              backgroundColor: colors.primary + "30",
              fill: true,
              tension: 0.4,
            },
            {
              label: "Proyección",
              data: [
                ...Array(ventasDiarias.totales?.length || 0).fill(null),
                ...(proyeccion.proyecciones?.map((p) => p.proyeccion) || []),
              ],
              borderColor: colors.warning,
              borderDash: [5, 5],
              tension: 0.4,
            },
          ],
        }
      : {
          labels: ventasDiarias.labels || [],
          datasets: [
            {
              label: "Ventas Diarias",
              data: ventasDiarias.totales || [],
              borderColor: colors.primary,
              backgroundColor: colors.primary + "30",
              fill: true,
              tension: 0.4,
            },
          ],
        }
    : null;

  // ============ RENDERIZADO ============
  if (loading) {
    return <Loader />;
  }
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Dashboard Financiero</h2>
          <p className="text-muted mb-0">Analytics y métricas de ventas</p>
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
                <i className="bi bi-bar-chart-line"></i> Gráficos
              </button>
            </li>
          </ul>

          <div className="tab-content">
            {/* ========== TAB 1: MÉTRICAS Y KPIs ========== */}
            <div className="tab-pane fade show active" id="metricas">

              {/* KPIs del Día */}
              {kpisHoy && (
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-primary">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Ventas Hoy</h6>
                        <h3 className="mb-1">{formatCurrency(kpisHoy.hoy?.total || 0)}</h3>
                        <small className="text-muted">{kpisHoy.hoy?.cantidad || 0} transacciones</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-success">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Ventas Periodo</h6>
                        <h3 className="mb-1">{formatCurrency(resumen?.total_ventas || 0)}</h3>
                        <small className="text-muted">{resumen?.cantidad_transacciones || 0} ventas</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-info">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Ticket Promedio</h6>
                        <h3 className="mb-1">{formatCurrency(resumen?.ticket_promedio || 0)}</h3>
                        <small className="text-muted">Por transacción</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-warning">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Margen Descuento</h6>
                        <h3 className="mb-1">{metricasAvanzadas?.margen_descuento_pct?.toFixed(1) || 0}%</h3>
                        <small className="text-muted">{formatCurrency(metricasAvanzadas?.total_descuentos || 0)}</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Desglose Financiero */}
              {metricasAvanzadas && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Desglose Financiero</h5></div>
                  <div className="card-body">
                    <table className="table table-sm mb-0">
                      <tbody>
                        <tr><td>Ventas Brutas:</td><td className="text-end"><strong>{formatCurrency(metricasAvanzadas.ventas_brutas)}</strong></td></tr>
                        <tr className="text-danger"><td>Descuentos:</td><td className="text-end">- {formatCurrency(metricasAvanzadas.total_descuentos)}</td></tr>
                        <tr><td>Ventas Netas:</td><td className="text-end"><strong>{formatCurrency(metricasAvanzadas.ventas_netas)}</strong></td></tr>
                        <tr><td>IVA (19%):</td><td className="text-end"><strong>{formatCurrency(metricasAvanzadas.total_iva)}</strong></td></tr>
                        <tr className="table-active"><td><strong>Total con IVA:</strong></td><td className="text-end"><strong className="text-success">{formatCurrency(resumen?.total_ventas || 0)}</strong></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Análisis Financiero Profundo */}
              {utilidadBruta && (
                <div className="row mb-4">
                  <div className="col-md-4">
                    <div className="card border-success">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Utilidad Bruta</h6>
                        <h3 className="mb-1 text-success">{formatCurrency(utilidadBruta.utilidad_bruta)}</h3>
                        <small className="text-muted">Margen: {utilidadBruta.margen_bruto_pct?.toFixed(1)}%</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-danger">
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Gastos Operativos</h6>
                        <h3 className="mb-1 text-danger">{formatCurrency(gastosOperativos?.total_gastos || 0)}</h3>
                        <small className="text-muted">{gastosOperativos?.desglose?.length || 0} tipos</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`card border-${utilidadNeta?.utilidad_neta >= 0 ? 'success' : 'danger'}`}>
                      <div className="card-body">
                        <h6 className="text-muted mb-2">Utilidad Neta</h6>
                        <h3 className={`mb-1 ${utilidadNeta?.utilidad_neta >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(utilidadNeta?.utilidad_neta || 0)}
                        </h3>
                        <small className="text-muted">Margen: {utilidadNeta?.margen_neto_pct?.toFixed(1)}%</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ROI */}
              {roi && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Return on Investment (ROI)</h5></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">ROI</p>
                        <h4 className={roi.roi >= 0 ? 'text-success' : 'text-danger'}>{roi.roi?.toFixed(2)}%</h4>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Utilidad Neta</p>
                        <h4>{formatCurrency(roi.utilidad_neta)}</h4>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Inversión Total</p>
                        <h4>{formatCurrency(roi.inversion_total)}</h4>
                      </div>
                      <div className="col-md-3">
                        <p className="mb-1 text-muted">Interpretación</p>
                        <h6 className={roi.roi >= 0 ? 'text-success' : 'text-danger'}>
                          {roi.roi >= 0 ? '✓ Rentable' : '✗ No rentable'}
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Punto de Equilibrio */}
              {puntoEquilibrio && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Punto de Equilibrio</h5></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        <p className="mb-1 text-muted">Transacciones Necesarias</p>
                        <h4>{puntoEquilibrio.transacciones_equilibrio?.toFixed(0)}</h4>
                      </div>
                      <div className="col-md-4">
                        <p className="mb-1 text-muted">Monto Necesario</p>
                        <h4>{formatCurrency(puntoEquilibrio.monto_equilibrio)}</h4>
                      </div>
                      <div className="col-md-4">
                        <p className="mb-1 text-muted">Progreso</p>
                        <h4>{puntoEquilibrio.progreso_pct?.toFixed(1)}%</h4>
                      </div>
                    </div>
                    <div className="progress mt-3" style={{height: '25px'}}>
                      <div
                        className={`progress-bar ${puntoEquilibrio.progreso_pct >= 100 ? 'bg-success' : 'bg-warning'}`}
                        style={{width: `${Math.min(puntoEquilibrio.progreso_pct, 100)}%`}}
                      >
                        {puntoEquilibrio.progreso_pct?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 10 Productos Vendidos */}
              <div className="card mb-4">
                <div className="card-header bg-light"><h5 className="mb-0">Top 10 Productos Más Vendidos</h5></div>
                <div className="card-body">
                  {productosTop.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>#</th><th>Producto</th><th>Categoría</th>
                            <th className="text-end">Cantidad</th><th className="text-end">Ingresos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosTop.slice(0, 10).map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td><td><strong>{p.nombre}</strong></td>
                              <td><span className="badge bg-secondary">{p.categoria || 'Sin categoría'}</span></td>
                              <td className="text-end">{p.cantidad_vendida}</td>
                              <td className="text-end text-success"><strong>{formatCurrency(p.ingresos)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (<p className="text-muted mb-0">No hay datos</p>)}
                </div>
              </div>

              {/* Top 20 Productos Rentables */}
              {productosRentables.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Top 20 Productos Más Rentables</h5></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead className="table-light">
                          <tr>
                            <th>#</th><th>Producto</th>
                            <th className="text-end">Ingresos</th><th className="text-end">Costos</th>
                            <th className="text-end">Utilidad</th><th className="text-end">Margen %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosRentables.slice(0, 20).map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td><td><strong>{p.nombre}</strong></td>
                              <td className="text-end">{formatCurrency(p.ingresos)}</td>
                              <td className="text-end">{formatCurrency(p.costos)}</td>
                              <td className={`text-end ${p.utilidad >= 0 ? 'text-success' : 'text-danger'}`}>
                                <strong>{formatCurrency(p.utilidad)}</strong>
                              </td>
                              <td className="text-end">
                                <span className={`badge ${p.margen_pct >= 50 ? 'bg-success' : p.margen_pct >= 30 ? 'bg-primary' : 'bg-warning'}`}>
                                  {p.margen_pct?.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 5 Clientes */}
              {clientesTop.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Top 5 Clientes</h5></div>
                  <div className="card-body">
                    <table className="table table-sm mb-0">
                      <tbody>
                        {clientesTop.slice(0, 5).map((c, idx) => (
                          <tr key={idx}>
                            <td><strong>{c.nombre}</strong><br /><small className="text-muted">{c.rut}</small></td>
                            <td className="text-end"><strong>{formatCurrency(c.total_compras)}</strong><br /><small className="text-muted">{c.num_compras} compras</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ========== TAB 2: GRÁFICOS ========== */}
            <div className="tab-pane fade" id="graficos">

              {/* Gráfico 1: Ventas Diarias + Proyección */}
              {ventasDiariasChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Ventas Diarias {proyeccion && '+ Proyección'}</h5></div>
                  <div className="card-body">
                    <Line data={ventasDiariasChartData} options={{
                      responsive: true, plugins: { legend: { display: true }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y) }}},
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                    }} height={80} />
                  </div>
                </div>
              )}

              {/* Gráficos 2 y 3: Comparativa MoM y Ventas por Día */}
              <div className="row mb-4">
                {momChartData && (
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Comparativa Mensual (MoM)</h5></div>
                      <div className="card-body">
                        <Bar data={momChartData} options={{
                          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => {
                            const idx = ctx.dataIndex;
                            return ['Ventas: ' + formatCurrency(ctx.parsed.y), 'Variación: ' + comparativaMom[idx].variacion_mom.toFixed(1) + '%'];
                          }}}},
                          scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                        }} height={200} />
                      </div>
                    </div>
                  </div>
                )}
                {diaSemanaChartData && (
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Ventas por Día de Semana</h5></div>
                      <div className="card-body">
                        <Bar data={diaSemanaChartData} options={{
                          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }},
                          scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                        }} height={200} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico 4: Ventas Netas vs IVA */}
              {netasIvaChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Ventas Netas vs IVA</h5></div>
                  <div className="card-body">
                    <Bar data={netasIvaChartData} options={{
                      responsive: true, plugins: { legend: { display: true }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y) }}},
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                    }} height={100} />
                  </div>
                </div>
              )}

              {/* Gráficos 5, 6 y 7: Donuts */}
              <div className="row mb-4">
                {canalChartData && (
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Ventas por Canal</h5></div>
                      <div className="card-body"><Doughnut data={canalChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + formatCurrency(ctx.parsed) }}}}} height={200} /></div>
                    </div>
                  </div>
                )}
                {categoriaChartData && (
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Ventas por Categoría</h5></div>
                      <div className="card-body"><Doughnut data={categoriaChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + formatCurrency(ctx.parsed) }}}}} height={200} /></div>
                    </div>
                  </div>
                )}
                {clientesNuevosChartData && clientesNuevosRecurrentes && (
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-header bg-light"><h5 className="mb-0">Clientes Nuevos vs Recurrentes</h5></div>
                      <div className="card-body"><Doughnut data={clientesNuevosChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => {
                        const valores = [clientesNuevosRecurrentes.nuevos.total_ventas, clientesNuevosRecurrentes.recurrentes.total_ventas];
                        return ctx.label + ': ' + ctx.parsed + ' (' + formatCurrency(valores[ctx.dataIndex]) + ')';
                      }}}}}} height={200} /></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico 8: Ventas por Hora */}
              {horaChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Ventas por Hora del Día</h5></div>
                  <div className="card-body">
                    <Bar data={horaChartData} options={{
                      responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => 'Ventas: ' + formatCurrency(ctx.parsed.y) }}},
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                    }} height={80} />
                  </div>
                </div>
              )}

              {/* Gráfico 9: Flujo de Caja */}
              {flujoCajaChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Flujo de Caja (Ingresos vs Gastos)</h5></div>
                  <div className="card-body">
                    <Line data={flujoCajaChartData} options={{
                      responsive: true, plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y) }}},
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v) }}}
                    }} height={80} />
                  </div>
                </div>
              )}

              {/* Gráfico 10: Gastos Operativos */}
              {gastosChartData && (
                <div className="card mb-4">
                  <div className="card-header bg-light"><h5 className="mb-0">Gastos Operativos por Tipo</h5></div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <Doughnut data={gastosChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + formatCurrency(ctx.parsed) }}}}} height={200} />
                      </div>
                      <div className="col-md-6">
                        <table className="table table-sm">
                          <thead className="table-light">
                            <tr><th>Tipo de Gasto</th><th className="text-end">Total</th></tr>
                          </thead>
                          <tbody>
                            {gastosOperativos.desglose.map((g, idx) => (
                              <tr key={idx}>
                                <td>{g.tipo}</td>
                                <td className="text-end text-danger"><strong>{formatCurrency(g.total)}</strong></td>
                              </tr>
                            ))}
                            <tr className="table-active">
                              <td><strong>TOTAL</strong></td>
                              <td className="text-end"><strong>{formatCurrency(gastosOperativos.total_gastos)}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
