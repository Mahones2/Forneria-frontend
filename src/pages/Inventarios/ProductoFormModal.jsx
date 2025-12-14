import { useState, useMemo } from "react";
import { Formik, Form, Field } from "formik";
import client from "../../api/client";
import Swal from 'sweetalert2';
import { productoSchema } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function ProductoFormModal({ show, onClose, productToEdit, categorias, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const isEditing = !!productToEdit;

    // Valores iniciales dinámicos según modo create/edit
    const initialValues = useMemo(() => {
        if (isEditing && productToEdit) {
            return {
                nombre: productToEdit.nombre || "",
                codigo_barra: productToEdit.codigo_barra || "",
                categoria: productToEdit.categoria || "",
                marca: productToEdit.marca || "",
                descripcion: productToEdit.descripcion || "",
                precio_venta: productToEdit.precio_venta || "",
                costo_unitario: productToEdit.costo_unitario || "",
                stock_minimo_global: productToEdit.stock_minimo_global || 5,
                tipo: productToEdit.tipo || "",
                presentacion: productToEdit.presentacion || "",
            };
        }
        return {
            nombre: "",
            codigo_barra: "",
            categoria: "",
            marca: "",
            descripcion: "",
            precio_venta: "",
            costo_unitario: "",
            stock_minimo_global: 5,
            tipo: "",
            presentacion: "",
        };
    }, [isEditing, productToEdit]);

    const handleSubmit = async (values, { setSubmitting }) => {
        const config = { headers: { Authorization: `Bearer ${authToken}` } };

        try {
            // Los schemas de Yup ya hacen la transformación de tipos
            const payload = {
                ...values,
                // Asegurar que valores vacíos sean null para campos opcionales
                codigo_barra: values.codigo_barra || null,
                marca: values.marca || null,
                descripcion: values.descripcion || null,
                costo_unitario: values.costo_unitario || null,
                tipo: values.tipo || null,
                presentacion: values.presentacion || null,
            };

            if (isEditing) {
                await client.put(`/pos/api/productos/${productToEdit.id}/`, payload, config);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Producto actualizado',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                await client.post(`/pos/api/productos/`, payload, config);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Producto creado',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error al guardar producto',
                text: err.response?.data?.detail || 'Error desconocido',
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        <h5 className="modal-title" style={{ color: 'var(--primary-color)' }}>
                            {isEditing ? "Editar Producto" : "Nuevo Producto"}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={productoSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ isSubmitting, errors, touched }) => (
                            <Form>
                                <div className="modal-body">
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                Nombre <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="nombre"
                                                type="text"
                                                className={`form-control ${errors.nombre && touched.nombre ? 'is-invalid' : ''}`}
                                                placeholder="Pan integral"
                                            />
                                            <FormError name="nombre" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Código de Barras</label>
                                            <Field
                                                name="codigo_barra"
                                                type="text"
                                                className={`form-control ${errors.codigo_barra && touched.codigo_barra ? 'is-invalid' : ''}`}
                                                placeholder="1234567890123"
                                            />
                                            <FormError name="codigo_barra" />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                Categoría <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                as="select"
                                                name="categoria"
                                                className={`form-select ${errors.categoria && touched.categoria ? 'is-invalid' : ''}`}
                                            >
                                                <option value="">Seleccione...</option>
                                                {categorias.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </Field>
                                            <FormError name="categoria" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                Precio Venta <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="precio_venta"
                                                type="number"
                                                step="0.01"
                                                className={`form-control ${errors.precio_venta && touched.precio_venta ? 'is-invalid' : ''}`}
                                                placeholder="0.00"
                                            />
                                            <FormError name="precio_venta" />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Marca</label>
                                            <Field
                                                name="marca"
                                                type="text"
                                                className={`form-control ${errors.marca && touched.marca ? 'is-invalid' : ''}`}
                                                placeholder="Marca del producto"
                                            />
                                            <FormError name="marca" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">
                                                Stock Mínimo (Alerta) <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                name="stock_minimo_global"
                                                type="number"
                                                className={`form-control ${errors.stock_minimo_global && touched.stock_minimo_global ? 'is-invalid' : ''}`}
                                                placeholder="5"
                                            />
                                            <FormError name="stock_minimo_global" />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Descripción</label>
                                            <Field
                                                name="descripcion"
                                                as="textarea"
                                                rows="2"
                                                className={`form-control ${errors.descripcion && touched.descripcion ? 'is-invalid' : ''}`}
                                                placeholder="Descripción del producto..."
                                            />
                                            <FormError name="descripcion" />
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