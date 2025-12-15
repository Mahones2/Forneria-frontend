import { useState, useEffect } from "react";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Swal from 'sweetalert2'

// Helper para formato de moneda (se mantiene)
const formatCurrency = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "N/A";
    return numericValue.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0, 
    });
};

// Mapeo de estados para la etiqueta visual (se mantiene)
const ESTADO_DISPLAY = {
    'pendiente': { text: 'Pendiente', variant: 'warning' },
    'pagado': { text: 'Pagado', variant: 'info' },
    'en_camino': { text: 'En Camino', variant: 'primary' },
    'entregado': { text: 'Entregado', variant: 'success' },
    'cancelado': { text: 'Cancelado', variant: 'danger' },
};


export default function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const authToken = localStorage.getItem("access");

    // ESTADOS PARA EL MODAL
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState(null);

    // --- NUEVO: ESTADOS DE PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50); // Cantidad de ventas por página

    // FUNCIÓN PARA ABRIR EL MODAL
    const handleOpenModal = (venta) => {
        setSelectedVenta(venta);
        setIsModalOpen(true);
    };

    // FUNCIÓN PARA CERRAR EL MODAL
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedVenta(null);
    };

    async function loadVentas() {
        if (!authToken) {
            setError("No estás autenticado.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        const config = { 
            headers: { 
                Authorization: `Bearer ${authToken}` 
            } 
        };

        try {
            const { data } = await client.get("/pos/api/ventas/", config);
            // Ordenamos por ID descendente (opcional, para ver las nuevas primero)
            // Si el backend ya lo hace, puedes quitar el .sort
            setVentas(data.sort((a, b) => b.id - a.id)); 

        } catch (err) {
            console.error("Error al cargar ventas:", err.response?.data || err);
            setError("Error de conexión o del servidor al cargar el historial de ventas.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadVentas();
    }, []);

    // --- LÓGICA DE CORTE PARA PAGINACIÓN ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ventas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ventas.length / itemsPerPage);

    // Cambiar de página
    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    if (loading) return <Loader />;
    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error,
            confirmButtonColor: '#d33'
        });

        return null; 
    }


    return (
        <div className="container mt-4">
            <h2 className="mb-4 text-primary fw-bold">Historial de Ventas</h2>
            
            {ventas.length === 0 ? (
                <div className="alert alert-info">No hay ventas registradas en el historial.</div>
            ) : (
                <>
                    {/* Contenedor responsivo con scroll horizontal si es necesario */}
                    <div className="table-responsive shadow-sm rounded bg-white">
                        <table className="table table-striped table-hover align-middle mb-0 text-nowrap">
                            <thead className="table-primary">
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha y Hora</th> 
                                    <th>Cliente</th>
                                    <th className="text-end">Total</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Usamos currentItems en lugar de ventas */}
                                {currentItems.map((venta) => {
                                    const estadoInfo = ESTADO_DISPLAY[venta.estado] || { text: 'Desconocido', variant: 'secondary' };
                                    
                                    const fechaHora = new Date(venta.fecha).toLocaleString("es-CL", { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    });

                                    return (
                                        <tr key={venta.id}>
                                            <td className="fw-bold">#{venta.id}</td>
                                            <td>{fechaHora}</td> 
                                            <td>{venta.cliente_nombre || 'Consumidor Final'} <br/> 
                                                <small className="text-muted" style={{fontSize: '0.75rem'}}>Vendida por: {venta.vendedor_nombre || 'N/A'}</small>
                                            </td> 
                                            <td className="text-end fw-bold text-success">{formatCurrency(venta.total)}</td>
                                            <td>
                                                <span className={`badge bg-${estadoInfo.variant}`}>{estadoInfo.text}</span>
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => handleOpenModal(venta)} 
                                                    className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                >
                                                    Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* --- CONTROLES DE PAGINACIÓN --- */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center justify-content-md-end align-items-center mt-3 gap-2">
                            <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <i className="bi bi-chevron-left"></i> Anterior
                            </button>
                            
                            <span className="text-muted small mx-2">
                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                            </span>

                            <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}

            {isModalOpen && selectedVenta && (
                <DetalleVentaModal 
                    venta={selectedVenta} 
                    onClose={handleCloseModal} 
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}


function DetalleVentaModal({ venta, onClose, formatCurrency }) {
    // Cálculo del vuelto total 
    const vueltoTotal = venta.pagos?.reduce((sum, pago) => sum + (parseFloat(pago.vuelto) || 0), 0) || 0;
    
    const pagosRegistrados = venta.pagos || [];
    const productosVendidos = venta.detalles || []; 

    // Formatear la fecha y hora para el encabezado del modal
    const fechaHora = new Date(venta.fecha).toLocaleString("es-CL", { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    // Preparación de datos del cliente (Adaptación aquí)
    const clienteNombreDisplay = venta.cliente_nombre || 'Consumidor Final';
    const clienteRutDisplay = venta.cliente_rut; 
    const clienteEmailDisplay = venta.cliente_email; 

    return (
        // Estructura básica de un modal Bootstrap. 
        <div 
            className="modal fade show" 
            style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
            tabIndex="-1" 
            role="dialog"
            onClick={onClose} 
        >
            <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document" onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">Detalle Completo Venta #{venta.id}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <h4>Información General y Cliente</h4>
                                <ul className="list-unstyled">
                                    <li><strong>Fecha/Hora:</strong> {fechaHora}</li>
                                    
                                    <li className="fw-bold mt-2">Cliente: {clienteNombreDisplay}</li>
                                    
                                    {clienteRutDisplay && (
                                        <li><strong>RUT:</strong> {clienteRutDisplay}</li>
                                    )}
                                    {clienteEmailDisplay && (
                                        <li><strong>Email:</strong> {clienteEmailDisplay}</li>
                                    )}
                                    
                                    <li><strong>Vendedor:</strong> {venta.vendedor_nombre || 'N/A'}</li>
                                    <li><strong>Canal:</strong> {venta.canal_venta === 'pos' ? 'Punto de Venta' : 'E-commerce'}</li>
                                </ul>
                            </div>
                            <div className="col-md-6">
                                <h4>Detalles de Totales</h4>
                                <table className="table table-sm table-borderless">
                                    <tbody>
                                        <tr>
                                            <td>Neto:</td>
                                            <td className="text-end">{formatCurrency(venta.neto)}</td>
                                        </tr>
                                        <tr>
                                            <td>IVA (19%):</td>
                                            <td className="text-end">{formatCurrency(venta.iva)}</td>
                                        </tr>
                                        <tr>
                                            <td>Costo de Envío:</td>
                                            <td className="text-end">{formatCurrency(venta.costo_envio || 0)}</td>
                                        </tr>
                                        <tr className="fw-bold table-primary">
                                            <td>TOTAL VENTA:</td>
                                            <td className="text-end">{formatCurrency(venta.total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <hr />

                        <h4 className="mt-4 mb-3">Productos Vendidos ({productosVendidos.length})</h4>
                        {productosVendidos.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-bordered table-striped table-sm text-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th className="text-center">Cant.</th>
                                            <th className="text-end">Precio Unitario</th>
                                            <th className="text-end">Subtotal</th>
                                           
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosVendidos.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.producto_nombre || 'N/A'}</td>
                                                <td className="text-center">{item.cantidad}</td>
                                                <td className="text-end">{formatCurrency(item.precio_unitario)}</td>
                                            
                                                <td className="text-end fw-bold">{formatCurrency(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="alert alert-warning">No hay productos detallados en esta venta.</div>
                        )}

                        <hr />

                        <h4 className="mt-4">Pagos Registrados ({pagosRegistrados.length})</h4>
                        {pagosRegistrados.length > 0 ? (
                            <ul className="list-group list-group-flush">
                                {pagosRegistrados.map((pago, index) => (
                                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="fw-bold me-2">{pago.metodo}</span>
                                            {pago.referencia_externa && <small className="text-muted">({pago.referencia_externa})</small>}
                                        </div>
                                        <span className="fw-bold text-success">{formatCurrency(pago.monto)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="alert alert-info">Esta venta no tiene pagos registrados.</div>
                        )}

                        {vueltoTotal > 0 && (
                            <div className="alert alert-success mt-3">
                                Vuelto total entregado: <strong>{formatCurrency(vueltoTotal)}</strong>
                            </div>
                        )}
                        
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}