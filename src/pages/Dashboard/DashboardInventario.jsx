import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function DashboardInventario() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockBajo, setStockBajo] = useState([]);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Cargar productos
      const productosRes = await client.get("/pos/productos/");
      setProductos(productosRes.data.results || productosRes.data);

      // Cargar categorías
      const categoriasRes = await client.get("/pos/categorias/");
      setCategorias(categoriasRes.data.results || categoriasRes.data);

      // Filtrar productos con stock bajo
      const bajo = (productosRes.data.results || productosRes.data).filter(
        (p) => p.stock_actual < p.stock_minimo
      );
      setStockBajo(bajo);
    } catch (err) {
      console.error("Error cargando dashboard inventario:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // Calcular KPIs
  const totalProductos = productos.length;
  const stockTotal = productos.reduce((sum, p) => sum + (p.stock_actual || 0), 0);
  const valorInventario = productos.reduce(
    (sum, p) => sum + (p.stock_actual || 0) * (p.precio_venta || 0),
    0
  );
  const productosConStockBajo = stockBajo.length;

  // Datos para gráfico de stock por categoría
  const stockPorCategoria = categorias.map((cat) => {
    const productosCategoria = productos.filter(
      (p) => p.categoria === cat.id || p.categoria?.id === cat.id
    );
    return {
      categoria: cat.nombre,
      stock: productosCategoria.reduce((sum, p) => sum + (p.stock_actual || 0), 0),
      valor: productosCategoria.reduce(
        (sum, p) => sum + (p.stock_actual || 0) * (p.precio_venta || 0),
        0
      ),
    };
  });

  const categoriaChartData = {
    labels: stockPorCategoria.map((c) => c.categoria),
    datasets: [
      {
        label: "Stock por Categoría",
        data: stockPorCategoria.map((c) => c.stock),
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
  };

  // Top productos con más stock
  const topProductosStock = [...productos]
    .sort((a, b) => (b.stock_actual || 0) - (a.stock_actual || 0))
    .slice(0, 10);

  const topStockChartData = {
    labels: topProductosStock.map((p) => p.nombre),
    datasets: [
      {
        label: "Unidades en Stock",
        data: topProductosStock.map((p) => p.stock_actual || 0),
        backgroundColor: "#2d6cdf",
      },
    ],
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Dashboard de Inventario</h2>
          <p className="text-muted mb-0">Control de stock y productos</p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={loadDashboard}>
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card border-primary">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Total Productos</h6>
                  <h3 className="mb-1">{totalProductos}</h3>
                  <small className="text-muted">En el sistema</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-success">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Stock Total</h6>
                  <h3 className="mb-1">{stockTotal.toFixed(0)}</h3>
                  <small className="text-muted">Unidades</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-info">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Valor Inventario</h6>
                  <h3 className="mb-1">
                    ${parseInt(valorInventario).toLocaleString("es-CL")}
                  </h3>
                  <small className="text-muted">Precio de venta</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-danger">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Stock Bajo</h6>
                  <h3 className="mb-1">{productosConStockBajo}</h3>
                  <small className="text-muted">Productos</small>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas de Stock Bajo */}
          {productosConStockBajo > 0 && (
            <div className="alert alert-warning mb-4">
              <h5>
                <i className="bi bi-exclamation-triangle"></i> Productos con
                Stock Bajo
              </h5>
              <ul className="mb-0">
                {stockBajo.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <strong>{p.nombre}</strong>: {p.stock_actual} unidades
                    (Mínimo: {p.stock_minimo})
                  </li>
                ))}
              </ul>
              {stockBajo.length > 5 && (
                <Link to="/inventario" className="alert-link">
                  Ver todos los productos con stock bajo →
                </Link>
              )}
            </div>
          )}

          {/* Gráficos */}
          <div className="row mb-4">
            {/* Stock por Categoría */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Stock por Categoría</h5>
                </div>
                <div className="card-body">
                  <Doughnut
                    data={categoriaChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "bottom" },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Top 10 Productos con Más Stock */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0">Top 10 Productos con Más Stock</h5>
                </div>
                <div className="card-body">
                  <Bar
                    data={topStockChartData}
                    options={{
                      responsive: true,
                      indexAxis: "y",
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Productos con Stock Bajo */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Productos Bajo Stock</h5>
            </div>
            <div className="card-body">
              {stockBajo.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Stock Actual</th>
                        <th>Stock Mínimo</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockBajo.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.nombre}</strong>
                          </td>
                          <td>
                            <span className="badge bg-danger">
                              {p.stock_actual}
                            </span>
                          </td>
                          <td>{p.stock_minimo}</td>
                          <td>{p.categoria?.nombre || "N/A"}</td>
                          <td>
                            ${parseInt(p.precio_venta || 0).toLocaleString("es-CL")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">
                  ✓ Todos los productos tienen stock adecuado
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
