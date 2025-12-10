import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";

export default function ProductoPage({ mode = "form" }) {
  // mode: "form" | "delete"
  const { productoId } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    precio_venta: 0,
    stock_total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (productoId) {
      client.get(`/pos/productos/${productoId}/`).then(({ data }) => {
        setProducto(data);
        setForm({
          nombre: data.nombre,
          categoria: data.categoria_nombre,
          precio_venta: data.precio_venta,
          stock_total: data.stock_total,
        });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [productoId]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (productoId) {
        await client.put(`/pos/productos/${productoId}/`, form);
      } else {
        await client.post(`/pos/productos/`, form);
      }
      setSaved(true);
      setTimeout(() => navigate("/inventario"), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    try {
      await client.delete(`/pos/productos/${productoId}/`);
      setDeleted(true);
      setTimeout(() => navigate("/inventario"), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="container py-4" style={{ maxWidth: "700px" }}>
      {mode === "form" && (
        <>
          <h2>{productoId ? "Editar producto" : "Crear producto"}</h2>
          {saved && (
            <div className="alert alert-success mb-3">
              Producto guardado: {form.nombre}
            </div>
          )}
          <form onSubmit={handleSave}>
            <div className="mb-2">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Categoría</label>
              <input
                className="form-control"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Precio venta</label>
              <input
                type="number"
                className="form-control"
                value={form.precio_venta}
                onChange={(e) =>
                  setForm({ ...form, precio_venta: e.target.value })
                }
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Stock total</label>
              <input
                type="number"
                className="form-control"
                value={form.stock_total}
                onChange={(e) =>
                  setForm({ ...form, stock_total: e.target.value })
                }
              />
            </div>
            <button className="btn btn-primary me-2" type="submit">
              Guardar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/inventario")}
            >
              Volver
            </button>
          </form>
        </>
      )}

      {mode === "delete" && (
        <>
          {deleted ? (
            <div className="alert alert-danger mb-3">Producto eliminado.</div>
          ) : (
            <>
              <h2>Eliminar producto: {producto?.nombre}</h2>
              <p>¿Estás seguro que deseas eliminar este producto?</p>
              <form onSubmit={handleDelete}>
                <button className="btn btn-danger me-2" type="submit">
                  Eliminar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/inventario")}
                >
                  Cancelar
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
