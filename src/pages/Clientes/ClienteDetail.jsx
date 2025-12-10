import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Table from "../../components/UI/Table";
import Pagination from "../../components/UI/Pagination";

export default function ClienteDetail() {
  const { rut } = useParams(); // obtenemos el rut desde la URL
  const [cliente, setCliente] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await client.get(`/pos/clientes/${rut}/`, { params: { page } });
      setCliente(data.cliente);
      setVentas(data.ventas.results || data.ventas); // según cómo devuelvas la API
      setTotalPages(data.ventas.total_pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [rut, page]);

  const columns = [
    { key: "folio_documento", label: "Folio" },
    {
      key: "fecha",
      label: "Fecha",
      render: (row) => new Date(row.fecha).toLocaleString(),
    },
    {
      key: "total",
      label: "Total",
      render: (row) => `$${row.total.toLocaleString("es-CL")}`,
    },
    {
      key: "monto_pagado",
      label: "Pagado",
      render: (row) =>
        row.monto_pagado ? `$${row.monto_pagado.toLocaleString("es-CL")}` : "-",
    },
    {
      key: "vuelto",
      label: "Vuelto",
      render: (row) =>
        row.vuelto ? `$${row.vuelto.toLocaleString("es-CL")}` : "-",
    },
    { key: "canal_venta", label: "Canal" },
  ];

  return (
    <div className="container py-4">
      {loading ? (
        <Loader />
      ) : (
        <>
          <h2>
            Cliente: {cliente?.nombre || "(sin nombre)"}{" "}
            <small className="text-muted">({cliente?.rut})</small>
          </h2>
          <p>Correo: {cliente?.correo || "-"}</p>

          <div className="mb-3">
            <button
              className="btn btn-outline-primary"
              onClick={() => alert("Exportar CSV aún no implementado")}
            >
              Exportar compras (CSV)
            </button>
            <Link to="/clientes" className="btn btn-secondary ms-2">
              Volver a clientes
            </Link>
          </div>

          <h4>Compras (más recientes)</h4>
          <Table columns={columns} data={ventas} />

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}
    </div>
  );
}
