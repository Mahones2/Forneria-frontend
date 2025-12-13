import { useEffect, useState } from "react";
import client from "../../api/client";
import Swal from 'sweetalert2'

export default function ProductoFormModal({ show, onClose, productToEdit, categorias, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const isEditing = !!productToEdit;
    const [isProcessing, setIsProcessing] = useState(false);

    const initialForm = {
        nombre: "",
        codigo_barra: "",
        categoria: "", // ID
        marca: "",
        descripcion: "",
        precio_venta: "",
        stock_minimo_global: 5
    };

    const [form, setForm] = useState(initialForm);

    // Cargar datos al abrir (Crear o Editar)
    useEffect(() => {
        if (show && isEditing) {
            setForm({
                nombre: productToEdit.nombre,
                codigo_barra: productToEdit.codigo_barra || "",
                categoria: productToEdit.categoria, // Asume que el backend devuelve el ID aquí
                marca: productToEdit.marca || "",
                descripcion: productToEdit.descripcion || "",
                precio_venta: productToEdit.precio_venta,
                stock_minimo_global: productToEdit.stock_minimo_global || 5
            });
        } else if (show && !isEditing) {
            setForm(initialForm);
        }
    }, [show, isEditing, productToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        const config = { headers: { Authorization: `Bearer ${authToken}` } };

        try {
            // Convertir tipos
            const payload = {
                ...form,
                precio_venta: parseFloat(form.precio_venta),
                stock_minimo_global: parseInt(form.stock_minimo_global),
                // Asegurar que si categoria es string vacio sea null o validar
                categoria: form.categoria ? parseInt(form.categoria) : null
            };

            if (isEditing) {
                await client.put(`/pos/api/productos/${productToEdit.id}/`, payload, config);
            } else {
                await client.post(`/pos/api/productos/`, payload, config);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Error al guardar producto',
            showConfirmButton: false,
            timer: 2000
        });

        } finally {
            setIsProcessing(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEditing ? "Editar Producto" : "Nuevo Producto"}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Nombre *</label>
                                    <input className="form-control" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Código Barra</label>
                                    <input className="form-control" value={form.codigo_barra} onChange={e => setForm({...form, codigo_barra: e.target.value})} />
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Categoría *</label>
                                    <select className="form-select" required value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                                        <option value="">Seleccione...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Precio Venta *</label>
                                    <input type="number" step="0.01" className="form-control" required value={form.precio_venta} onChange={e => setForm({...form, precio_venta: e.target.value})} />
                                </div>
                            </div>
                             <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Marca</label>
                                    <input className="form-control" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Stock Mínimo (Alerta)</label>
                                    <input type="number" className="form-control" value={form.stock_minimo_global} onChange={e => setForm({...form, stock_minimo_global: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                                {isProcessing ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}