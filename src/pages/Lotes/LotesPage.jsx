import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Table from "../../components/UI/Table";

export default function LotesPage() {
  const { productoId } = useParams();
  const [producto, setProducto] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // modos: "list" | "form" | "delete"
  const [mode, setMode] = useState("list");
  const [selectedLote, setSelectedLote] = useState(null);
  const [form, setForm] = useState({
    numero_lote: "",
    fecha_elaboracion: "",
    fecha_caducidad: "",
    stock_actual: 0,
  });

  async function loadLotes() {
    setLoading(true);
    try {
      const { data } = await client.get(`/pos/productos/${productoId}/lotes/`);
      setProducto(data.producto);
      setLotes(data.lotes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLotes();
  }, [productoId]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (selectedLote) {
        await client.put(`/lotes/${selectedLote.id}/`, form);
      } else {
        await client.post(`/pos/productos/${productoId}/lotes/`, form);
      }
      setMode("list");
      setSelectedLote(null);
      loadLotes();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await client.delete(`/lotes/${selectedLote.id}/`);
      setMode("list");
      setSelectedLote(null);
      loadLotes();
    } catch (err) {
      console.error(err);
    }
  }

  const columns = [
    { key: "numero_lote", label: "Lote" },
    { key: "fecha_elaboracion", label: "Elaboración" },
    { key: "fecha_caducidad", label: "Caducidad" },
    { key: "stock_actual", label: "Stock actual" },
    {
      key: "acciones",
      label: "Acciones",
      render: (row) => (
        <>
          <button
            className="btn btn-link p-0 me-2"
            onClick={() => {
              setSelectedLote(row);
              setForm(row);
              setMode("form");
            }}
          >
            Editar
          </button>
          <button
            className="btn btn-link text-danger p-0"
            onClick={() => {
              setSelectedLote(row);
              setMode("delete");
            }}
          >
            Eliminar
          </button>
        </>
      ),
    },
  ];

  return (
    <div className="container py-4" style={{ maxWidth: "900px" }}>
      <h2>Lotes para {producto?.nombre}</h2>

      {mode === "list" && (
        <>
          <div className="mb-3">
            <button
              className="btn btn-primary me-2"
              onClick={() => {
                setSelectedLote(null);
                setForm({
                  numero_lote: "",
                  fecha_elaboracion: "",
                  fecha_caducidad: "",
                  stock_actual: 0,
                });
                setMode("form");
              }}
            >
              Crear lote
            </button>
            <a className="btn btn-secondary" href="/inventario">
              Volver al inventario
            </a>
          </div>
          {loading ? <Loader /> : <Table columns={columns} data={lotes} />}
        </>
      )}

      {mode === "form" && (
        <div style={{ maxWidth: "700px" }}>
          <h2>{selectedLote ? "Editar lote" : "Crear lote"}</h2>
          <form onSubmit={handleSave}>
            <div className="mb-2">
              <label className="form-label">Número de lote</label>
              <input
                className="form-control"
                value={form.numero_lote}
                onChange={(e) =>
                  setForm({ ...form, numero_lote: e.target.value })
                }
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Fecha elaboración</label>
              <input
                type="date"
                className="form-control"
                value={form.fecha_elaboracion}
                onChange={(e) =>
                  setForm({ ...form, fecha_elaboracion: e.target.value })
                }
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Fecha caducidad</label>
              <input
                type="date"
                className="form-control"
                value={form.fecha_caducidad}
                onChange={(e) =>
                  setForm({ ...form, fecha_caducidad: e.target.value })
                }
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Stock actual</label>
              <input
                type="number"
                className="form-control"
                value={form.stock_actual}
                onChange={(e) =>
                  setForm({ ...form, stock_actual: e.target.value })
                }
              />
            </div>
            <button className="btn btn-primary me-2" type="submit">
              Guardar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMode("list")}
            >
              Volver
            </button>
          </form>
        </div>
      )}

      {mode === "delete" && (
        <div style={{ maxWidth: "700px" }}>
          <h2>Eliminar lote: {selectedLote?.numero_lote}</h2>
          <p>¿Estás seguro que deseas eliminar este lote?</p>
          <button
            className="btn btn-danger me-2"
            onClick={handleDeleteConfirm}
          >
            Eliminar
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setMode("list")}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
