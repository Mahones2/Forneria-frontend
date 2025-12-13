import { useEffect, useState, useCallback, useMemo } from "react";
import client from "../../api/client";
import LoteModal from "./LoteModal";
import Swal from 'sweetalert2'

export default function LoteManager({ producto, authToken, onUpdateStock }) {
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchLote, setSearchLote] = useState("");
    
    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingLote, setEditingLote] = useState(null);

    // --- Cargar Lotes ---
    const fetchLotes = useCallback(async () => {
        if (!producto?.id || !authToken) return;
        
        setIsLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${authToken}` } };
            const res = await client.get(`/pos/api/lotes/?producto=${producto.id}`, config);
            setLotes(res.data);
        } catch (err) {
            console.error("Error cargando lotes:", err);
        } finally {
            setIsLoading(false);
        }
    }, [producto, authToken]);

    useEffect(() => {
        fetchLotes();
    }, [fetchLotes]);

    // --- Borrar Lote ---
    const handleDelete = async (loteId) => {
        if (!window.confirm("¿Eliminar este lote permanentemente?")) return;
        
        try {
            const config = { headers: { Authorization: `Bearer ${authToken}` } };
            await client.delete(`/pos/api/lotes/${loteId}/`, config);
            await fetchLotes();
            onUpdateStock(); 
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al eliminar lote',
                confirmButtonColor: '#d33'
            });

        }
    };

    // --- Filtrado Local ---
    const filteredLotes = useMemo(() => {
        if (!searchLote) return lotes;
        const lower = searchLote.toLowerCase();
        return lotes.filter(l => 
            l.numero_lote.toLowerCase().includes(lower) || 
            (l.fecha_caducidad && l.fecha_caducidad.includes(lower))
        );
    }, [lotes, searchLote]);

    return (
        <div className="card shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                <div>
                    <h5 className="mb-0 fw-bold text-dark">Lotes: {producto.nombre}</h5>
                    <small className="text-muted">SKU: {producto.codigo_barra}</small>
                </div>
                <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => { setEditingLote(null); setShowModal(true); }}
                >
                    + Agregar Lote
                </button>
            </div>

            <div className="card-body">
                <input 
                    type="text" 
                    className="form-control mb-3"
                    placeholder="Buscar lote por número o vencimiento..."
                    value={searchLote}
                    onChange={e => setSearchLote(e.target.value)}
                />

                {isLoading ? <div className="text-center">Cargando lotes...</div> : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>N° Lote</th>
                                    <th>Vencimiento</th>
                                    <th>Stock</th>
                                    <th>Estado</th>
                                    <th className="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLotes.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center text-muted py-4">No hay lotes registrados</td></tr>
                                ) : (
                                    filteredLotes.map(lote => (
                                        <tr key={lote.id}>
                                            <td className="fw-bold">{lote.numero_lote}</td>
                                            <td>{lote.fecha_caducidad}</td>
                                            <td><span className="badge bg-secondary">{lote.stock_actual}</span></td>
                                            <td>
                                                {lote.esta_vencido ? 
                                                    <span className="badge bg-danger">Vencido</span> : 
                                                    <span className="badge bg-success">Vigente</span>
                                                }
                                            </td>
                                            <td className="text-end">
                                                <div className="btn-group" role="group">
                                                    <button 
                                                        className="btn btn-sm btn-outline-primary"
                                                        title="Editar"
                                                        onClick={() => { setEditingLote(lote); setShowModal(true); }}
                                                    >
                                                        {/* SVG LAPIZ */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Eliminar"
                                                        onClick={() => handleDelete(lote.id)}
                                                    >
                                                        {/* SVG BASURERO */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <LoteModal 
                show={showModal}
                onClose={() => setShowModal(false)}
                loteToEdit={editingLote}
                productoId={producto.id}
                onSuccess={() => { setShowModal(false); fetchLotes(); onUpdateStock(); }}
            />
        </div>
    );
}