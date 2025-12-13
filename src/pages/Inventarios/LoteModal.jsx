import { useEffect, useState } from "react";
import client from "../../api/client";
import Swal from 'sweetalert2'

export default function LoteModal({ show, onClose, loteToEdit, productoId, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const isEditing = !!loteToEdit;
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        numero_lote: "",
        fecha_elaboracion: new Date().toISOString().split('T')[0],
        fecha_caducidad: "",
        precio_costo_unitario: "",
        stock_inicial: "",
    });

    // Cargar datos al editar
    useEffect(() => {
        if (show && loteToEdit) {
            setFormData({
                numero_lote: loteToEdit.numero_lote,
                fecha_elaboracion: loteToEdit.fecha_elaboracion,
                fecha_caducidad: loteToEdit.fecha_caducidad,
                precio_costo_unitario: loteToEdit.precio_costo_unitario,
                stock_inicial: loteToEdit.stock_inicial,
            });
        } else if (show && !loteToEdit) {
            // Resetear al crear
            setFormData({
                numero_lote: "",
                fecha_elaboracion: new Date().toISOString().split('T')[0],
                fecha_caducidad: "",
                precio_costo_unitario: "",
                stock_inicial: "",
            });
        }
    }, [show, loteToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!authToken) return;
        setIsProcessing(true);

        const config = { headers: { Authorization: `Bearer ${authToken}` } };
        
        // Preparar Payload
        const payload = {
            ...formData,
            producto: productoId, // ID vital para la relación en Django
            precio_costo_unitario: parseFloat(formData.precio_costo_unitario),
            stock_inicial: parseInt(formData.stock_inicial),
        };

        try {
            if (isEditing) {
                await client.put(`/pos/api/lotes/${loteToEdit.id}/`, payload, config);
            } else {
                await client.post(`/pos/api/lotes/`, payload, config);
            }
            onSuccess(); // Notificar éxito
        } catch (err) {
            console.error("Error guardando lote:", err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error al guardar',
                text: JSON.stringify(err.response?.data || "Error desconocido"),
                showConfirmButton: false,
                timer: 3000
            });


        } finally {
            setIsProcessing(false);
        }
    };

    if (!show) return null;

    // Estilos inline simples para simular modal (o usa Bootstrap classes como 'modal show d-block')
    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEditing ? "Editar Lote" : "Nuevo Lote"}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Número de Lote</label>
                                <input 
                                    className="form-control" 
                                    required
                                    value={formData.numero_lote}
                                    onChange={e => setFormData({...formData, numero_lote: e.target.value})}
                                />
                            </div>
                            <div className="row mb-3">
                                <div className="col">
                                    <label className="form-label">Elaboración</label>
                                    <input type="date" className="form-control" 
                                        value={formData.fecha_elaboracion}
                                        onChange={e => setFormData({...formData, fecha_elaboracion: e.target.value})}
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Caducidad</label>
                                    <input type="date" className="form-control" required
                                        value={formData.fecha_caducidad}
                                        onChange={e => setFormData({...formData, fecha_caducidad: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col">
                                    <label className="form-label">Costo Unitario ($)</label>
                                    <input type="number" step="0.01" className="form-control" required
                                        value={formData.precio_costo_unitario}
                                        onChange={e => setFormData({...formData, precio_costo_unitario: e.target.value})}
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Stock Inicial</label>
                                    <input type="number" className="form-control" required
                                        value={formData.stock_inicial}
                                        onChange={e => setFormData({...formData, stock_inicial: e.target.value})}
                                        disabled={isEditing} // Generalmente no se edita el inicial para no romper historial
                                    />
                                    {isEditing && <small className="text-muted">No editable en edición</small>}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                                {isProcessing ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}