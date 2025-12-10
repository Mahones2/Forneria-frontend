import { useState, useEffect } from "react";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import SearchBar from "../../components/UI/SearchBar";
import Table from "../../components/UI/Table";
import Pagination from "../../components/UI/Pagination";
import Badge from "../../components/UI/Badge";
import { Link } from "react-router-dom";

export default function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // filtros
  const [filters, setFilters] = useState({ rut: "", nombre: "" });

  async function loadClientes() {
    setLoading(true);
    try {
      const { data } = await client.get("/pos/clientes/", {
        params: { page, rut: filters.rut, nombre: filters.nombre },
      });
      setClientes(data.results || data); // si usas paginación DRF
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientes();
  }, [page, filters]);

  function handleSearchRut(rut) {
    setFilters((f) => ({ ...f, rut }));
    setPage(1);
  }

  function handleSearchNombre(nombre) {
    setFilters((f) => ({ ...f, nombre }));
    setPage(1);
  }

  const columns = [
    { key: "rut", label: "RUT" },
    {
      key: "nombre",
      label: "Nombre",
      render: (row) => (
        <Link to={`/clientes/${row.rut}`} className="text-decoration-none">
          {row.nombre}
        </Link>
      ),
    },
    {
      key: "correo",
      label: "Correo",
      render: (row) => (
        <>
          {row.correo}
          {row.rut && (
            <div>
              <Link to={`/clientes/${row.rut}`}>Ver ficha y compras</Link>
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="container py-4">
      <h2>Clientes</h2>
      <p>Listado de clientes</p>

      {/* Filtros */}
      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <SearchBar placeholder="Buscar por RUT" onSearch={handleSearchRut} />
        </div>
        <div className="col-md-4">
          <SearchBar placeholder="Buscar por Nombre" onSearch={handleSearchNombre} />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <Loader />
      ) : error ? (
        <div className="alert alert-danger">Error cargando clientes</div>
      ) : (
        <Table columns={columns} data={clientes} />
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Badge de cantidad */}
      <div className="mt-3">
        <Badge
          text={`Total: ${clientes.length} clientes en esta página`}
          variant="info"
        />
      </div>
    </div>
  );
}
