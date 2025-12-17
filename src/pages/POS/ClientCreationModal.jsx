import React, { useState, useMemo } from 'react';
import { Formik, Form, Field } from 'formik';
import { clienteSchema } from '../../validations/schemas';
import FormError from '../../components/UI/FormError';

// Componente Modal para la creación de un nuevo Cliente
function ClientCreationModal({ isOpen, onClose, initialRut, onCreate }) {
    const [formError, setFormError] = useState(null);

    // Valores iniciales que incluyen el RUT pre-cargado
    const initialValues = useMemo(() => ({
        rut: initialRut || '',
        nombre: '',
        correo: '',
        telefono: '',
        direccion: '',
        es_empresa: false,
    }), [initialRut]);

    // Manejador de envío del formulario
    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        setFormError(null);

        // Llama a la función onCreate (pasada desde POS.jsx)
        const success = await onCreate(values);

        if (success) {
            // Si la creación fue exitosa, cerramos el modal y reseteamos
            resetForm();
            onClose();
        } else {
            setFormError("Fallo al registrar el cliente. Revise la consola.");
        }

        setSubmitting(false);
    };

    // Si el modal no está abierto, no renderiza nada
    if (!isOpen) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        <h5 className="modal-title" style={{ color: 'var(--primary-color)' }}>
                            Registrar Nuevo Cliente
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={clienteSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ isSubmitting, errors, touched, isValid, dirty }) => (
                            <Form>
                                <div className="modal-body">
                                    {formError && <div className="alert alert-danger">{formError}</div>}

                                    <div className="row g-3">
                                        {/* Campo RUT */}
                                        <div className="col-md-4">
                                            <label htmlFor="rut" className="form-label fw-semibold">
                                                RUT <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                type="text"
                                                name="rut"
                                                className={`form-control ${errors.rut && touched.rut ? 'is-invalid' : ''}`}
                                                placeholder="12.345.678-9"
                                                disabled={isSubmitting}
                                            />
                                            <FormError name="rut" />
                                        </div>

                                        {/* Campo Nombre */}
                                        <div className="col-md-8">
                                            <label htmlFor="nombre" className="form-label fw-semibold">
                                                Nombre/Razón Social <span className="text-danger">*</span>
                                            </label>
                                            <Field
                                                type="text"
                                                name="nombre"
                                                className={`form-control ${errors.nombre && touched.nombre ? 'is-invalid' : ''}`}
                                                placeholder="Juan Pérez"
                                                disabled={isSubmitting}
                                            />
                                            <FormError name="nombre" />
                                        </div>

                                        {/* Campo Email */}
                                        <div className="col-md-6">
                                            <label htmlFor="correo" className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                                            <Field
                                                type="email"
                                                name="correo"
                                                className={`form-control ${errors.correo && touched.correo ? 'is-invalid' : ''}`}
                                                placeholder="ejemplo@correo.com"
                                                disabled={isSubmitting}
                                            />
                                            <FormError name="correo" />
                                        </div>

                                        {/* Campo Teléfono */}
                                        <div className="col-md-6">
                                            <label htmlFor="telefono" className="form-label fw-semibold">Teléfono <span className="text-danger">*</span></label>
                                            <Field
                                                type="tel"
                                                name="telefono"
                                                pattern="^(\+?56)?(9\d{8})$"
                                                className={`form-control ${errors.telefono && touched.telefono ? 'is-invalid' : ''}`}
                                                placeholder="912345678"
                                                disabled={isSubmitting}
                                                title="Formato chileno: +56912345678 o 912345678"
                                            />
                                            <FormError name="telefono" />
                                        </div>

                                        {/* Campo Dirección */}
                                        <div className="col-12">
                                            <label htmlFor="direccion" className="form-label fw-semibold">Dirección</label>
                                            <Field
                                                type="text"
                                                name="direccion"
                                                className={`form-control ${errors.direccion && touched.direccion ? 'is-invalid' : ''}`}
                                                placeholder="Calle 123, Comuna"
                                                disabled={isSubmitting}
                                            />
                                            <FormError name="direccion" />
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
                                        disabled={isSubmitting || !isValid || !dirty}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Registrando...
                                            </>
                                        ) : 'Guardar Cliente y Seleccionar'}
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

export default ClientCreationModal;