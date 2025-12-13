import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import client from "../../api/client";
import Loader from "../../components/UI/Loader";
import Swal from 'sweetalert2'
// --- Helpers para formato ---
const formatCurrency = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "N/A";
    
    return numericValue.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0, 
    });
};

// Mapeo de estados de Django a etiquetas de Bootstrap y texto legible
const ESTADO_DISPLAY = {
    'pendiente': { text: 'Pendiente de Pago', variant: 'warning' },
    'pagado': { text: 'Pagado / En Preparación', variant: 'info' },
    'en_camino': { text: 'En Camino', variant: 'primary' },
    'entregado': { text: 'Entregado', variant: 'success' },
    'cancelado': { text: 'Cancelado', variant: 'danger' },
};

// Opciones de estado para el selector (debe coincidir con ESTADO_CHOICES de Django)
const ESTADO_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente de Pago' },
    { value: 'pagado', label: 'Pagado / En Preparación' },
    { value: 'en_camino', label: 'En Camino' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelar Venta' },
];


export default function DetalleVenta() {
    // 1. Obtener ID de la URL y token
    const { id } = useParams(); // Asegúrate de que la ruta sea /ventas/detalle/:id
    const [venta, setVenta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const authToken = localStorage.getItem("access");

    const config = {
        headers: {
            Authorization: `Bearer ${authToken}`
        }
    };

    // --- Carga de la Venta Específica ---
    async function loadVenta() {
        if (!authToken) {
            setError("No estás autenticado. Por favor, inicia sesión.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // RUTA AJUSTADA: GET para un detalle específico
            const { data } = await client.get(`/pos/api/ventas/${id}/`, config);
            setVenta(data);
        } catch (err) {
            console.error(`Error al cargar Venta #${id}:`, err.response?.data || err);
            setError(`Error al cargar la venta. ${err.response?.status === 404 ? 'Venta no encontrada.' : 'Problema de conexión/API.'}`);
        } finally {
            setLoading(false);
        }
    }

    // --- Actualización del Estado de la Venta (PATCH) ---
    async function handleUpdateEstado(nuevoEstado) {
        if (!authToken || !venta) return;

        setIsUpdating(true);
        setError(null);

        try {
            // Solo enviamos el campo 'estado'
            await client.patch(`/pos/api/ventas/${id}/`, { 
                estado: nuevoEstado 
            }, config);
            
            // 4. Actualizar el estado localmente para reflejar el cambio
            setVenta(prev => ({ ...prev, estado: nuevoEstado }));
            Swal.fire({
                icon: 'success',
                title: `Venta #${id}`,
                text: `Estado actualizado a ${ESTADO_DISPLAY[nuevoEstado].text}`,
                timer: 2000,
                showConfirmButton: false
            });


            
        } catch (err) {
            console.error("Error al actualizar estado:", err.response?.data || err);
            setError(`Error actualizando estado: ${err.response?.data?.estado || 'Error desconocido'}`);
        } finally {
            setIsUpdating(false);
        }
    }

    useEffect(() => {
        if (id) {
            loadVenta();
        }
    }, [id]);

    // --- Renderizado ---

    if (loading) return <Loader />;
    if (error) return <div className="alert alert-danger container mt-4">{error}</div>;
    if (!venta) return <div className="container mt-4">Venta no encontrada o no válida.</div>;

    const estadoInfo = ESTADO_DISPLAY[venta.estado] || ESTADO_DISPLAY.pendiente;

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Detalle de Venta #{venta.id} </h2>
                <span className={`badge bg-${estadoInfo.variant} fs-5`}>{estadoInfo.text}</span>
            </div>
            
            <hr />

            <div className="card mb-4 shadow-sm">
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <p><strong>Fecha:</strong> {new Date(venta.fecha).toLocaleString("es-CL")}</p>
                            {/* NOTA: Estos campos (cliente__nombre, empleado__nombre) deben ser incluidos por el Serializer */}
                            <p><strong>Cliente:</strong> {venta.cliente_nombre || 'Consumidor Final'}</p>
                            <p><strong>Canal:</strong> {venta.canal_venta === 'pos' ? 'Punto de Venta' : 'E-commerce'}</p>
                        </div>
                        <div className="col-md-6">
                            <p><strong>Total (NETO):</strong> {formatCurrency(venta.neto)}</p>
                            <p><strong>IVA:</strong> {formatCurrency(venta.iva)}</p>
                            <p className="fs-4 text-primary"><strong>TOTAL:</strong> {formatCurrency(venta.total)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Sección de Gestión de Pedido (Cambio de Estado) --- */}
            <div className="card border-info mb-4">
                <div className="card-header bg-info text-white">
                    Gestión del Estado de la Orden
                </div>
                <div className="card-body">
                    <p className="mb-3">Estado actual: <span className={`fw-bold text-${estadoInfo.variant}`}>{estadoInfo.text}</span></p>

                    <div className="d-flex gap-2 align-items-center">
                        <select
                            className="form-select w-auto"
                            value={venta.estado}
                            onChange={(e) => handleUpdateEstado(e.target.value)}
                            disabled={isUpdating}
                        >
                            <option value="" disabled>Seleccionar nuevo estado</option>
                            {ESTADO_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <button 
                            className="btn btn-primary"
                            onClick={() => handleUpdateEstado(venta.estado)} // Vuelve a enviar el estado seleccionado
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Actualizando...' : 'Confirmar Cambio'}
                        </button>
                    </div>
                    {error && <div className="text-danger mt-2">{error}</div>}
                </div>
            </div>

            {/* Faltaría aquí la sección para listar los Detalles de Venta (ítems vendidos) */}

        </div>
    );
}