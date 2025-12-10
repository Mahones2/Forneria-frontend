import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Navegación con Link
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Badge from "../../components/UI/Badge"; // Componente Badge de UI

export default function OrdenesActivas() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken] = useState(() => localStorage.getItem("access") || null);

  // Helper para formato de moneda
  const formatCurrency = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "$ 0";
    return numericValue.toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    });
  };

  async function loadPedidos() {
    const token = authToken || localStorage.getItem("access");

    if (!token) {
      setError("No estás autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      // ⚠️ Ruta que trae pedidos pendientes/activos
      const { data } = await client.get("/pedidos/", config);
      setPedidos(data);
    } catch (err) {
      console.error("Error al cargar pedidos:", err.response?.data || err);
      setError("Error al conectar con el servidor. No se pudo cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPedidos();
  }, [authToken]);

  // Configuración visual según estado
  function getEstadoConfig(estado) {
    switch (estado) {
      case "Pendiente":
        return { variant: "warning", progress: 20, text: "Pendiente" };
      case "Preparación":
        return { variant: "info", progress: 40, text: "Preparando" };
      case "En Camino":
        return { variant: "primary", progress: 70, text: "En Camino" };
      case "Entregado":
        return { variant: "success", progress: 100, text: "Entregado" };
      default:
        return { variant: "secondary", progress: 0, text: estado || "Desconocido" };
    }
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-center">Gestión de Pedidos Activos</h2>

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="alert alert-danger">
          <strong>Error al cargar:</strong> {error}
        </div>
      ) : (
        <div className="row">
          {pedidos.length > 0 ? (
            pedidos.map((pedido) => {
              const { variant, progress, text } = getEstadoConfig(pedido.estado);
              return (
                <div className="col-md-4" key={pedido.id}>
                  <div className="card shadow-sm mb-4">
                    <div className={`card-header bg-${variant} text-white`}>
                      Pedido #{pedido.id}
                    </div>
                    <div className="card-body">
                      <p>
                        <strong>Cliente:</strong> {pedido.cliente_nombre || "N/A"}
                      </p>
                      <p>
                        <strong>Total:</strong> {formatCurrency(pedido.total)}
                      </p>
                      <p>
                        <strong>Estado:</strong>{" "}
                        <Badge text={text} variant={variant} />
                      </p>
                      <div className="progress mt-2 mb-3">
                        <div
                          className={`progress-bar bg-${variant}`}
                          role="progressbar"
                          style={{ width: `${progress}%` }}
                        >
                          {text}
                        </div>
                      </div>

                      {/* Botón clave para gestión */}
                      <Link
                        to={`/pedidos/gestion/${pedido.id}`}
                        className="btn btn-primary w-100"
                      >
                        Gestionar Estado
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted">
              No hay pedidos activos para gestionar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
