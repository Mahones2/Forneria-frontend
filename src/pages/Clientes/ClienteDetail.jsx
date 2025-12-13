import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Table from "../../components/UI/Table";
import Pagination from "../../components/UI/Pagination";
import Swal from 'sweetalert2'

export default function ClienteDetail() {
  const { rut } = useParams();
  const [authToken] = useState(() => localStorage.getItem("access") || null);

  const [cliente, setCliente] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVenta, setSelectedVenta] = useState(null);

  async function loadData() {
    if (!authToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${authToken}` }, params: { page } };
      const { data } = await client.get(`/pos/api/clientes/${rut}/`, config);
      setCliente(data.cliente || data);
      const ventasData = data.ventas || data.compras || [];
      if (Array.isArray(ventasData)) {
        setVentas(ventasData);
        setTotalPages(1);
      } else {
        setVentas(ventasData.results || []);
        setTotalPages(ventasData.total_pages || 1);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [rut, page, authToken]);

  const handleVerBoleta = async (ventaId) => {
    try {
        const config = { headers: { Authorization: `Bearer ${authToken}` } };
        const { data } = await client.get(`/pos/api/ventas/${ventaId}/`, config);
        setSelectedVenta(data);
    } catch (error) { 
      Swal.fire({
        icon: 'error',
        title: 'Error cargando boleta',
        text: 'No se pudo obtener la información de la venta.',
        confirmButtonColor: '#d33'
      });
     }
  };

  const columns = [
    { key: "folio_documento", label: "Folio" },
    { key: "fecha", label: "Fecha", render: (r) => new Date(r.fecha).toLocaleString("es-CL") },
    { key: "total", label: "Total", render: (r) => `$${parseFloat(r.total).toLocaleString("es-CL")}` },
    { key: "estado", label: "Estado" },
    { 
        key: "acciones", label: "Acciones", 
        render: (row) => <button className="btn btn-sm btn-outline-info" onClick={() => handleVerBoleta(row.id)}>🧾 Ver</button>
    },
  ];

  return (
    <div className="container py-4">
      {/* MODAL BOLETA */}
      {selectedVenta && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header bg-light">
                        <h5 className="modal-title">Boleta #{selectedVenta.folio_documento}</h5>
                        <button className="btn-close" onClick={() => setSelectedVenta(null)}></button>
                    </div>
                    <div className="modal-body font-monospace small">
                        <div className="text-center">
                            <h5>MI NEGOCIO</h5>
                            <p>{new Date(selectedVenta.fecha).toLocaleString("es-CL")}</p>
                        </div>
                        <hr />
                        <table className="table table-sm table-borderless">
                            <tbody>
                                {selectedVenta.detalles?.map((d, i) => (
                                    <tr key={i}><td>{d.producto_nombre}</td><td className="text-end">${parseFloat(d.subtotal).toLocaleString("es-CL")}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <hr />
                        <h5 className="text-end">Total: ${parseFloat(selectedVenta.total).toLocaleString("es-CL")}</h5>
                    </div>
                    <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedVenta(null)}>Cerrar</button></div>
                </div>
            </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <>
          <h2>{cliente?.nombre} <small>({cliente?.rut})</small></h2>
          <p>Correo: {cliente?.correo}</p>
          <div className="mb-3"><Link to="/clientes" className="btn btn-secondary">Volver</Link></div>
          <Table columns={columns} data={ventas} />
          {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}