import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Table from "../../components/UI/Table";
import Badge from "../../components/UI/Badge";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 1. Obtener el token de localStorage al iniciar
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("access") || null);

  async function loadProductos() {
    // Verificar si existe el token antes de continuar
    const token = authToken || localStorage.getItem("access");

    if (!token) {
      setError("No estás autenticado. Por favor, inicia sesión.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // 2. Crear la configuración con el token Bearer
    const config = { 
      headers: { 
        Authorization: `Bearer ${token}` 
      } 
    };

    try {
      // 3. Usar la configuración en la petición GET
      const { data } = await client.get("/pos/productos/", config);
      setProductos(data);
    } catch (err) {
      console.error("Error cargando productos:", err.response?.data || err);
      // Mensaje de error más descriptivo si la autorización falla
      if (err.response && err.response.status === 401) {
          setError("Acceso denegado. El token de sesión es inválido o ha expirado.");
      } else {
          setError("Error de conexión o del servidor al cargar productos.");
      }
      
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductos();
    // La dependencia en authToken asegura que recargue si el token cambia o se establece.
  }, [authToken]);

  // Las columnas permanecen igual
  const columns = [
    {
      key: "nombre",
      label: "Nombre",
      render: (row) => (
        <>
          <span className="fw-bold">{row.nombre}</span>
          <br />
          {/* Rutas de frontend */}
          <Link to={`/inventario/editar/${row.id}`} className="text-decoration-none me-2">Editar</Link>
          |
          <Link to={`/inventario/eliminar/${row.id}`} className="text-decoration-none ms-2">Eliminar</Link>
        </>
      ),
    },
    {
      key: "categoria_nombre",
      label: "Categoría",
    },
    {
      key: "precio_venta",
      label: "Precio",
      // Convertir a float antes de formatear
      render: (row) => `$${parseFloat(row.precio_venta || 0).toLocaleString("es-CL")}`,
    },
    {
      key: "stock_fisico",
      label: "Stock total",
      render: (row) => (
        <Badge
          text={row.stock_fisico}
          variant={
            row.stock_fisico > 10
              ? "success"
              : row.stock_fisico > 0
              ? "warning"
              : "danger"
          }
        />
      ),
    },
  ];

  return (
    <div className="container py-4">
      <h2>Inventario</h2>
      <p>Productos y stock</p>

      <div className="mb-3">
        <Link className="btn btn-primary" to="/inventario/crear">
          Crear producto +
        </Link>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        // Mostrar error si la carga falló
        <div className="alert alert-danger">
           {error}
          {/* Si no hay token, sugerir la acción de iniciar sesión */}
          {!authToken && <p className="mt-2 mb-0">Por favor, navega a la página de Login para obtener un token válido.</p>}
        </div>
      ) : (
        <Table columns={columns} data={productos} />
      )}
    </div>
  );
}