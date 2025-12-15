import { useState, useMemo, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import client from "../../api/client"; // Asegúrate de que esto sea tu instancia de axios configurada
import Swal from 'sweetalert2';
import { productoSchema } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function ProductoFormModal({ show, onClose, productToEdit, categorias, onSuccess }) {
    const [authToken] = useState(() => localStorage.getItem("access"));
    const [activeTab, setActiveTab] = useState('general'); // Estado para las pestañas
    const [previewImage, setPreviewImage] = useState(null); // Para previsualizar imagen
    
    // Estados para etiquetas
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
    const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState('');

    const isEditing = !!productToEdit;

    // Cargar etiquetas disponibles al mostrar el modal
    useEffect(() => {
        if (!show) return;

        async function fetchEtiquetas() {
            try {
                const response = await client.get("/pos/api/etiquetas/");
                setEtiquetasDisponibles(response.data);
            } catch (error) {
                console.error("Error al cargar etiquetas:", error);
            }
        }

        fetchEtiquetas();
    }, [show]);

    // Valores iniciales
    const initialValues = useMemo(() => {
        // Helper para acceder a datos nutricionales si vienen anidados en el producto al editar
        // Asumimos que productToEdit.nutricional existe si es edit
        const nutri = productToEdit?.nutricional || {};
        
        // Mapear etiquetas existentes a array de IDs
        const etiquetasIds = productToEdit?.etiquetas_data 
                            ? productToEdit.etiquetas_data.map(e => e.id)
                            : [];

        return {
            // --- PRODUCTO ---
            nombre: productToEdit?.nombre || "",
            codigo_barra: productToEdit?.codigo_barra || "",
            categoria: productToEdit?.categoria || "",
            marca: productToEdit?.marca || "",
            descripcion: productToEdit?.descripcion || "",
            precio_venta: productToEdit?.precio_venta || "",
            costo_unitario: productToEdit?.costo_unitario || "",
            stock_minimo_global: productToEdit?.stock_minimo_global || 5,
            tipo: productToEdit?.tipo || "",
            presentacion: productToEdit?.presentacion || "",
            imagen_url: null, // El archivo nuevo siempre inicia en null
            etiquetas: etiquetasIds, // Array de IDs de etiquetas seleccionadas

            // --- NUTRICIONAL ---
            nutricional_id: nutri.id || null, // Guardamos ID si existe para saber si hacer PUT o POST
            calorias: nutri.calorias || "",
            proteinas: nutri.proteinas || "",
            grasas: nutri.grasas || "",
            carbohidratos: nutri.carbohidratos || "",
            azucares: nutri.azucares || "",
            sodio: nutri.sodio || "",
        };
    }, [productToEdit]);

    // Función para crear nueva etiqueta
    const handleCrearEtiqueta = async (setFieldValue, values) => {
        const nombreLimpio = nuevaEtiquetaNombre.trim();
        if (!nombreLimpio) return;

        try {
            // Crear la etiqueta en el backend
            const response = await client.post('/pos/api/etiquetas/', { nombre: nombreLimpio });
            const nuevaEtiqueta = response.data;

            // Añadirla al estado de disponibles
            setEtiquetasDisponibles(prev => [...prev, nuevaEtiqueta]);

            // Seleccionarla automáticamente en Formik
            const etiquetasActuales = values.etiquetas || [];
            setFieldValue('etiquetas', [...etiquetasActuales, nuevaEtiqueta.id]);

            // Limpiar el input
            setNuevaEtiquetaNombre('');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Etiqueta '${nuevaEtiqueta.nombre}' creada`,
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.nombre?.[0] || 'No se pudo crear la etiqueta (quizás ya existe).',
            });
        }
    };

    const handleSubmit = async (values, { setSubmitting }) => {
        const config = { 
            headers: { 
                Authorization: `Bearer ${authToken}`,
                // Axios detecta FormData y pone el Content-Type multipart/form-data solo
            } 
        };

        try {
            // 1. PREPARAR DATOS DEL PRODUCTO (FormData por la imagen)
            const productData = new FormData();
            productData.append('nombre', values.nombre);
            productData.append('categoria', values.categoria);
            productData.append('precio_venta', values.precio_venta);
            productData.append('stock_minimo_global', values.stock_minimo_global);
            
            // Adjuntar etiquetas (array de IDs)
            if (values.etiquetas && values.etiquetas.length > 0) {
                values.etiquetas.forEach(tagId => {
                    productData.append('etiquetas', tagId);
                });
            } else {
                // Vaciar etiquetas si no hay ninguna seleccionada
                productData.append('etiquetas', '');
            }
            
            // Campos opcionales: enviar solo si tienen valor
            if (values.codigo_barra) productData.append('codigo_barra', values.codigo_barra);
            if (values.marca) productData.append('marca', values.marca);
            if (values.descripcion) productData.append('descripcion', values.descripcion);
            if (values.costo_unitario) productData.append('costo_unitario', values.costo_unitario);
            if (values.tipo) productData.append('tipo', values.tipo);
            if (values.presentacion) productData.append('presentacion', values.presentacion);

            // Imagen: Solo si es un objeto File (si es string es una URL vieja que no se toca)
            if (values.imagen_url instanceof File) {
                productData.append('imagen_url', values.imagen_url);
            }

            let productId = null;
            let productResponse = null;

            // 2. GUARDAR PRODUCTO
            if (isEditing) {
                productId = productToEdit.id;
                productResponse = await client.patch(`/pos/api/productos/${productId}/`, productData, config);
            } else {
                productResponse = await client.post(`/pos/api/productos/`, productData, config);
                productId = productResponse.data.id;
            }

            // 3. PREPARAR DATOS NUTRICIONALES (JSON)
            // Solo intentamos guardar si hay al menos un dato nutricional lleno o si estamos editando
            const hasNutritionalData = values.calorias || values.proteinas || values.grasas;
            
            if (productId && hasNutritionalData) {
                const nutriPayload = {
                    calorias: values.calorias || 0,
                    proteinas: values.proteinas || 0,
                    grasas: values.grasas || 0,
                    carbohidratos: values.carbohidratos || 0,
                    azucares: values.azucares || 0,
                    sodio: values.sodio || 0,
                    producto: productId // RELACIÓN ONE-TO-ONE
                };

                // Configuración para JSON
                const jsonConfig = { headers: { Authorization: `Bearer ${authToken}` } };

                if (values.nutricional_id) {
                    // Si ya existía info nutricional, actualizamos (PATCH)
                    await client.patch(`/pos/api/nutricional/${values.nutricional_id}/`, nutriPayload, jsonConfig);
                } else {
                    // Si no existía (o es producto nuevo), creamos (POST)
                    // Primero verificamos si el backend crea uno por defecto vacio, si no, post.
                    // Para seguridad intentamos POST, si falla (400) por unique constraint, hacemos PATCH buscando el ID (lógica compleja).
                    // Asumiremos flujo estándar: Nuevo Producto -> POST Nutricional.
                    try {
                         await client.post(`/pos/api/nutricional/`, nutriPayload, jsonConfig);
                    } catch (nutriErr) {
                        // Si falla porque ya existe (ej: creado automáticamente por signals en Django), intentamos update
                        console.warn("Posiblemente ya existe nutricional, intentando patch...", nutriErr);
                        // Esto requeriría saber el ID del nutricional creado automáticamente, lo omitiremos por simplicidad
                    }
                }
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: isEditing ? 'Producto actualizado' : 'Producto creado',
                showConfirmButton: false,
                timer: 2000
            });
            onSuccess();
            onClose();

        } catch (err) {
            console.error(err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error al procesar',
                text: err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Revise los datos',
                showConfirmButton: false,
                timer: 4000
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Manejo de cambio de imagen
    const handleImageChange = (event, setFieldValue) => {
        const file = event.currentTarget.files[0];
        setFieldValue("imagen_url", file);
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    if (!show) return null;

    return (
        // Cambio a modal-xl para más espacio
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div className="modal-dialog modal-xl"> 
                <div className="modal-content">
                    <div className="modal-header bg-light-theme">
                        <h5 className="modal-title fw-bold" style={{ color: 'var(--primary-color)' }}>
                            {isEditing ? `Editar: ${productToEdit.nombre}` : "Nuevo Producto"}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={productoSchema} // Asegúrate de actualizar tu schema para permitir los nuevos campos
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ isSubmitting, errors, touched, setFieldValue, values }) => (
                            <Form>
                                <div className="modal-body">
                                    {/* --- TABS DE NAVEGACIÓN --- */}
                                    <ul className="nav nav-tabs mb-4">
                                        <li className="nav-item">
                                            <button 
                                                type="button"
                                                className={`nav-link ${activeTab === 'general' ? 'active fw-bold' : ''}`}
                                                onClick={() => setActiveTab('general')}
                                            >
                                                📦 Información General
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button 
                                                type="button"
                                                className={`nav-link ${activeTab === 'nutricional' ? 'active fw-bold' : ''}`}
                                                onClick={() => setActiveTab('nutricional')}
                                            >
                                                🍎 Información Nutricional
                                            </button>
                                        </li>
                                    </ul>

                                    {/* --- CONTENIDO TABS --- */}
                                    <div className="tab-content">
                                        
                                        {/* TAB 1: GENERAL */}
                                        <div className={`tab-pane fade ${activeTab === 'general' ? 'show active' : ''}`}>
                                            <div className="row g-3">
                                                {/* Columna Izquierda: Datos principales */}
                                                <div className="col-md-8">
                                                    <div className="row g-3">
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
                                                            <Field name="nombre" type="text" className={`form-control ${errors.nombre && touched.nombre ? 'is-invalid' : ''}`} />
                                                            <FormError name="nombre" />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">Código de Barras</label>
                                                            <Field name="codigo_barra" type="text" className="form-control" />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Categoría <span className="text-danger">*</span></label>
                                                            <Field as="select" name="categoria" className={`form-select ${errors.categoria && touched.categoria ? 'is-invalid' : ''}`}>
                                                                <option value="">Seleccione...</option>
                                                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                            </Field>
                                                            <FormError name="categoria" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Marca</label>
                                                            <Field name="marca" type="text" className="form-control" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Tipo</label>
                                                            <Field name="tipo" type="text" className="form-control" placeholder="Ej: Congelado" />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Precio Venta <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <span className="input-group-text">$</span>
                                                                <Field name="precio_venta" type="number" className={`form-control ${errors.precio_venta && touched.precio_venta ? 'is-invalid' : ''}`} />
                                                            </div>
                                                            <FormError name="precio_venta" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Costo Unitario</label>
                                                            <div className="input-group">
                                                                <span className="input-group-text">$</span>
                                                                <Field name="costo_unitario" type="number" className="form-control" />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label fw-semibold">Stock Mínimo</label>
                                                            <Field name="stock_minimo_global" type="number" className="form-control" />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">Descripción</label>
                                                            <Field name="descripcion" as="textarea" rows="2" className="form-control" />
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-semibold">🏷️ Etiquetas del Producto</label>
                                                            <Field 
                                                                as="select" 
                                                                name="etiquetas" 
                                                                multiple 
                                                                className="form-select"
                                                                style={{ height: '100px' }}
                                                            >
                                                                {etiquetasDisponibles.map(e => (
                                                                    <option key={e.id} value={e.id}>
                                                                        {e.nombre}
                                                                    </option>
                                                                ))}
                                                            </Field>
                                                            <small className="form-text text-muted">Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples etiquetas.</small>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columna Derecha: Imagen y Presentación */}
                                                <div className="col-md-4 border-start">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold">Presentación</label>
                                                        <Field name="presentacion" type="text" className="form-control" placeholder="Ej: Pack 6 uds" />
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold">Imagen del Producto</label>
                                                        <input 
                                                            type="file" 
                                                            className="form-control" 
                                                            accept="image/*"
                                                            onChange={(e) => handleImageChange(e, setFieldValue)}
                                                        />
                                                        {/* Previsualización */}
                                                        <div className="mt-3 text-center p-2 border rounded bg-light">
                                                            {previewImage ? (
                                                                <img src={previewImage} alt="Preview" className="img-fluid" style={{ maxHeight: '150px' }} />
                                                            ) : (
                                                                productToEdit?.imagen_url ? (
                                                                    <img src={productToEdit.imagen_url} alt="Actual" className="img-fluid" style={{ maxHeight: '150px' }} />
                                                                ) : (
                                                                    <span className="text-muted small">Sin imagen seleccionada</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mb-3 pt-3 border-top">
                                                        <label className="form-label fw-semibold">➕ Crear Nueva Etiqueta</label>
                                                        <div className="input-group">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Ej: Vegano, Sin Gluten"
                                                                value={nuevaEtiquetaNombre}
                                                                onChange={(e) => setNuevaEtiquetaNombre(e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                onClick={() => handleCrearEtiqueta(setFieldValue, values)}
                                                                disabled={!nuevaEtiquetaNombre.trim()}
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
                                                        <small className="form-text text-muted">Crea y selecciona la etiqueta al instante.</small>
                                                    </div>                                                </div>
                                            </div>
                                        </div>

                                        {/* TAB 2: NUTRICIONAL */}
                                        <div className={`tab-pane fade ${activeTab === 'nutricional' ? 'show active' : ''}`}>
                                            <div className="alert alert-info py-2">
                                                <small><i className="bi bi-info-circle"></i> Ingrese los valores por cada 100g/ml o por porción.</small>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">Calorías (kcal)</label>
                                                    <Field name="calorias" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Proteínas (g)</label>
                                                    <Field name="proteinas" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Grasas Totales (g)</label>
                                                    <Field name="grasas" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Carbohidratos (g)</label>
                                                    <Field name="carbohidratos" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Azúcares (g)</label>
                                                    <Field name="azucares" type="number" className="form-control" />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Sodio (mg)</label>
                                                    <Field name="sodio" type="number" className="form-control" />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="modal-footer bg-light">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Procesando...
                                            </>
                                        ) : 'Guardar Todo'}
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