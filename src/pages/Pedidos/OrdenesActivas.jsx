import React, { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../../api/client';
import Loader from '../../components/UI/Loader'; // Asumiendo que usas un Loader
// ... otras importaciones
import Swal from 'sweetalert2'

export default function OrdenesActivas() {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [authToken] = useState(() => localStorage.getItem("access") || null);

    const config = useMemo(() => ({
        headers: { Authorization: `Bearer ${authToken}` }
    }), [authToken]);

    const loadPedidos = useCallback(async () => {
        if (!authToken) {
            setError("No autenticado.");
            setLoading(false); 
            return;
        }

        setLoading(true);
        setError(null);

        try {
            
            const { data } = await client.get("/pedidos/", config); 
            
            setPedidos(data);
        } catch (err) {
            console.error("Error al cargar pedidos:", err.response?.data || err);
            // Esto asegura que el error se muestre y la carga termine, previniendo el "spinner infinito"
            setError("Error al cargar las órdenes. Por favor, revisa la configuración del API."); 
        } finally {
            // Asegura que el estado de carga siempre se desactiva
            setLoading(false); 
        }
    }, [authToken, config]);

    // Llama a la función de carga al montar el componente
    useEffect(() => {
        loadPedidos();
    }, [loadPedidos]);

    
    // --- Renderizado ---

    if (loading) {
        return <Loader />; 
    }

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: error,
            showCancelButton: true,
            confirmButtonText: 'Reintentar Carga',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                loadPedidos();
            }
        });

        return null; // evita que el componente siga renderizando
    }

    if (pedidos.length === 0) {
        return (
            <div className="alert alert-info">
                No hay órdenes activas para mostrar.
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <h2>Órdenes Activas</h2>
            <button className="btn btn-sm btn-outline-secondary mb-3" onClick={loadPedidos}>
                Recargar Órdenes
            </button>
            
            <div className="row">
                {pedidos.map(pedido => (
                    <div key={pedido.id} className="col-md-4 mb-4">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title">Pedido #{pedido.id}</h5>
                                <p className="card-text">
                                    **Total:** ${pedido.total.toFixed(2)}<br/>
                                    **Estado:** {pedido.estado}<br/>
                                    **Mesa/Cliente:** {pedido.cliente_nombre || 'N/A'}
                                </p>
                                {/* Añade más detalles o botones de acción aquí */}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}