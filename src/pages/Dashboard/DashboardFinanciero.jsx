import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import endpoints from "../../api/endpoints";
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
} from "chart.js";

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function DashboardFinanciero() {
  const [kpisHoy, setKpisHoy] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [ventasDiarias, setVentasDiarias] = useState(null);
  const [productosTop, setProductosTop] = useState([]);
  const [ventasPorCategoria, setVentasPorCategoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  async function loadDashboard(params = {}) {
    setLoading(true);
    try {
      // Cargar KPIs del día
      const kpisResponse = await client.get(endpoints.analytics.kpisHoy);
      setKpisHoy(kpisResponse.data);

      // Cargar resumen del periodo
      const resumenResponse = await client.get(endpoints.analytics.resumen, { params });
      setResumen(resumenResponse.data);

      // Cargar ventas diarias
      const ventasResponse = await client.get(endpoints.analytics.ventasDiarias, { params });
      setVentasDiarias(ventasResponse.data);

      // Cargar top productos
      const productosResponse = await client.get(endpoints.analytics.productosTop, { params });
      setProductosTop(Array.isArray(productosResponse.data) ? productosResponse.data : []);

      // Cargar ventas por categoría
      const categoriasResponse = await client.get(endpoints.analytics.ventasPorCategoria, { params });
      setVentasPorCategoria(Array.isArray(categoriasResponse.data) ? categoriasResponse.data : []);

    } catch (err) {
      console.error("Error cargando dashboard:", err);
      // Reiniciar estados en caso de error
      setProductosTop([]);
      setVentasPorCategoria([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

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

  // Datos para gráficos
  const ventasDiariasData = ventasDiarias ? {
    labels: ventasDiarias.labels || [],
    datasets: [
      {
        label: "Total diario (CLP)",
        data: ventasDiarias.totales || [],
        borderColor: "#2d6cdf",
        backgroundColor: "rgba(45,108,223,0.08)",
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
    ],
  } : null;

  const categoriasData = (ventasPorCategoria && Array.isArray(ventasPorCategoria)) ? {
    labels: ventasPorCategoria.map((c) => c.categoria),
    datasets: [
      {
        label: "Ingresos por categoría",
        data: ventasPorCategoria.map((c) => c.total_ingresos),
        backgroundColor: [
          "#2d6cdf",
          "#28a745",
          "#ffc107",
          "#dc3545",
          "#17a2b8",
          "#6c757d",
        ],
      },
    ],
  } : null;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Dashboard Financiero</h2>
          <p className="text-muted mb-0">Analytics y métricas de ventas</p>
        </div>
        <button 
          className="btn btn-sm btn-primary" 
          onClick={() => loadDashboard({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })}
        >
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>

      {/* Filtros de Fecha */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleFiltrar} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Fecha Inicio</label>
              <input
                type="date"
                className="form-control"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Fecha Fin</label>
              <input
                type="date"
                className="form-control"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-flex align-items-end gap-2">
              <button type="submit" className="btn btn-primary">
                Aplicar Filtros
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFiltros}
              >
                Resetear
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* KPIs del día */}
          {kpisHoy && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card border-primary">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Ventas Hoy</h6>
                    <h3 className="mb-1">
                      ${parseInt(kpisHoy.ventas_hoy || 0).toLocaleString("es-CL")}
                    </h3>
                    <small className="text-muted">
                      {kpisHoy.cantidad_hoy || 0} transacciones
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-success">
                  <div className="card-body">
                    <h6 className="text-muted mb-2">Ticket Promedio</h6>
                    <h3 className="mb-1">
                      ${parseInt(kpisHoy.ticket_promedio || 0).toLocaleString("es-CL")}
                    </h3>
                    <small className="text-muted">Hoy</small>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <Link to="/inventario" className="text-decoration-none">
                  <div className="card border-warning">
                    <div className="card-body">
                      <h6 className="text-muted mb-2">Inventario</h6>
                      <h3 className="mb-1">Ver productos</h3>
                      <small className="text-muted">Ir a inventario</small>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-md-3">
                <Link to="/clientes" className="text-decoration-none">
                  <div className="card border-info">
                    <div className="card-body">
                      <h6 className="text-muted mb-2">Clientes</h6>
                      <h3 className="mb-1">Ver clientes</h3>
                      <small className="text-muted">Gestionar clientes</small>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Resumen del Periodo */}
          {resumen && (
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">Resumen del Periodo</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <h6 className="text-muted">Total Ventas</h6>
                    <h4>${parseInt(resumen.total_ventas || 0).toLocaleString("es-CL")}</h4>
                  </div>
                  <div className="col-md-3">
                    <h6 className="text-muted">Transacciones</h6>
                    <h4>{resumen.cantidad_transacciones || 0}</h4>
                  </div>
                  <div className="col-md-3">
                    <h6 className="text-muted">Ticket Promedio</h6>
                    <h4>${parseInt(resumen.ticket_promedio || 0).toLocaleString("es-CL")}</h4>
                  </div>
                  <div className="col-md-3">
                    <h6 className="text-muted">Total Descuentos</h6>
                    <h4>${parseInt(resumen.total_descuentos || 0).toLocaleString("es-CL")}</h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de Ventas Diarias */}
          {ventasDiariasData && (
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">Ventas Diarias</h5>
              </div>
              <div className="card-body">
                <Line
                  data={ventasDiariasData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true },
                      tooltip: { mode: "index", intersect: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `$${value.toLocaleString("es-CL")}`,
                        },
                      },
                    },
                  }}
                  height={80}
                />
              </div>
            </div>
          )}

          {/* Top Productos y Categorías */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Top Productos</h5>
                </div>
                <div className="card-body">
                  {productosTop && productosTop.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Ingresos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosTop.slice(0, 5).map((p, idx) => (
                            <tr key={idx}>
                              <td>{p.nombre}</td>
                              <td>{p.cantidad_vendida}</td>
                              <td>${parseInt(p.ingresos_totales).toLocaleString("es-CL")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted">No hay datos disponibles</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Ventas por Categoría</h5>
                </div>
                <div className="card-body">
                  {categoriasData ? (
                    <Doughnut
                      data={categoriasData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: "bottom" },
                        },
                      }}
                    />
                  ) : (
                    <p className="text-muted">No hay datos disponibles</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
