import { useState, useMemo } from "react";
import { Formik, Form, Field } from "formik";
import client from "../../api/client";
import Swal from 'sweetalert2';
import { loteSchema } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function LoteModal({ show, onClose, loteToEdit, productoId, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const isEditing = !!loteToEdit;

    // Valores iniciales dinámicos según modo create/edit
    const initialValues = useMemo(() => {
        if (isEditing && loteToEdit) {
            return {
                numero_lote: loteToEdit.numero_lote || "",
                fecha_elaboracion: loteToEdit.fecha_elaboracion || "",
                fecha_caducidad: loteToEdit.fecha_caducidad || "",
                precio_costo_unitario: loteToEdit.precio_costo_unitario || "",
                stock_inicial: loteToEdit.stock_inicial || "",
                ubicacion: loteToEdit.ubicacion || "",
            };
        }
        return {
            numero_lote: "",
            fecha_elaboracion: new Date().toISOString().split('T')[0],
            fecha_caducidad: "",
            precio_costo_unitario: "",
            stock_inicial: "",
            ubicacion: "",
        };
    }, [isEditing, loteToEdit]);

    const handleSubmit = async (values, { setSubmitting }) => {
        if (!authToken) return;

        const config = { headers: { Authorization: `Bearer ${authToken}` } };

        // Preparar Payload
        const payload = {
            ...values,
            producto: productoId, // ID vital para la relación en Django
            numero_lote: values.numero_lote || null,
            fecha_elaboracion: values.fecha_elaboracion || null,
            ubicacion: values.ubicacion || null,
        };

        try {
            if (isEditing) {
                await client.put(`/pos/api/lotes/${loteToEdit.id}/`, payload, config);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Lote actualizado',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                await client.post(`/pos/api/lotes/`, payload, config);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Lote creado',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
            onSuccess();
        } catch (err) {
            console.error("Error guardando lote:", err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error al guardar',
                text: err.response?.data?.detail || JSON.stringify(err.response?.data) || "Error desconocido",
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        <h5 className="modal-title" style={{ color: 'var(--primary-color)' }}>
                            {isEditing ? "Editar Lote" : "Nuevo Lote"}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={loteSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ isSubmitting, errors, touched }) => (
                            <Form>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Número de Lote</label>
                                        <Field
                                            name="numero_lote"
                                            type="text"
                                            className={`form-control ${errors.numero_lote && touched.numero_lote ? 'is-invalid' : ''}`}
                                            placeholder="Ej: LOTE-2025-001"
                                        />
                                        <FormError name="numero_lote" />
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col">
                                            <label className="form-label fw-semibold">Fecha Elaboración</label>
                                            <Field
                                                name="fecha_elaboracion"
                                                type="date"
                                                className={`form-control ${errors.fecha_elaboracion && touched.fecha_elaboracion ? 'is-invalid' : ''}`}
                                            />
                                            <FormError name="fecha_elaboracion" />
                                        </div>
                                        <div className="col">
                                            <label className="form-label fw-semibold">
                                                Fecha Caducidad <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="fecha_caducidad"
                                                type="date"
                                                className={`form-control ${errors.fecha_caducidad && touched.fecha_caducidad ? 'is-invalid' : ''}`}
                                            />
                                            <FormError name="fecha_caducidad" />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col">
                                            <label className="form-label fw-semibold">
                                                Costo Unitario ($) <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="precio_costo_unitario"
                                                type="number"
                                                step="0.01"
                                                className={`form-control ${errors.precio_costo_unitario && touched.precio_costo_unitario ? 'is-invalid' : ''}`}
                                                placeholder="0.00"
                                            />
                                            <FormError name="precio_costo_unitario" />
                                        </div>
                                        <div className="col">
                                            <label className="form-label fw-semibold">
                                                Stock Inicial <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="stock_inicial"
                                                type="number"
                                                className={`form-control ${errors.stock_inicial && touched.stock_inicial ? 'is-invalid' : ''}`}
                                                placeholder="100"
                                                disabled={isEditing}
                                            />
                                            <FormError name="stock_inicial" />
                                            {isEditing && (
                                                <small className="text-muted">No editable en edición</small>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Guardando...
                                            </>
                                        ) : 'Guardar'}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    );
}