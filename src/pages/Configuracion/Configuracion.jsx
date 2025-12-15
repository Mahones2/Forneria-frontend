import { useEffect, useState, useCallback } from "react";
import { Formik, Form, Field } from "formik";
import client from "../../api/client";
import Swal from 'sweetalert2';
import { empleadoSchema } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function Configuracion() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ nombre_completo: "", username: "" });

  // Initial values para Formik
  const initialValues = {
    nombre_completo: "",
    username: "",
    password: "",
    password2: "",
    cargo: "Vendedor",
  };

  const authToken = localStorage.getItem("access");
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const loadEmpleados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get("/pos/api/empleados/", { headers });
      setEmpleados(data || []);
    } catch (err) {
      console.error("Error cargando empleados:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar los empleados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpleados();
  }, [loadEmpleados]);

  function abrirEditar(emp) {
    setEditTarget(emp);
    setEditForm({ nombre_completo: emp.nombre_completo || "", username: emp.username || "" });
  }

  async function guardarEdicion() {
    if (!editTarget) return;
    try {
      await client.patch(`/pos/api/empleados/${editTarget.id}/`, {
        nombre_completo: editForm.nombre_completo,
        username: editForm.username,
      }, { headers });
      setEditTarget(null);
      await loadEmpleados();
      Swal.fire({ icon: 'success', title: 'Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (err) {
      console.error("Error al editar empleado:", err);
      Swal.fire('Error', err.response?.data?.detail || "No se pudo actualizar.", 'error');
    }
  }

  async function handleSubmit(values, { setSubmitting, resetForm }) {
    setError(null);
    try {
      const payload = {
        nombre_completo: values.nombre_completo,
        username: values.username,
        password: values.password,
        cargo: values.cargo,
      };

      await client.post("/pos/api/empleados/", payload, { headers });

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: 'Empleado creado exitosamente', showConfirmButton: false, timer: 2000
      });

      resetForm();
      await loadEmpleados();
    } catch (err) {
      console.error("Error al crear empleado:", err);
      const errorMsg = err.response?.data?.detail ||
                      (typeof err.response?.data === 'object' ? JSON.stringify(err.response?.data) : null) ||
                      "No se pudo crear el empleado.";
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error', text: errorMsg, timer: 3000 });
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  async function eliminarEmpleado(id) {
    const result = await Swal.fire({
        title: '¿Eliminar empleado?', text: "Esta acción no se puede deshacer",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
    });

    if (!result.isConfirmed) return;

    try {
      await client.delete(`/pos/api/empleados/${id}/`, { headers });
      await loadEmpleados();
      Swal.fire('Eliminado', 'El empleado ha sido eliminado.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo eliminar el empleado.', 'error');
    }
  }

  async function cambiarCargo(id, nuevoCargo) {
    try {
      await client.patch(`/pos/api/empleados/${id}/`, { cargo: nuevoCargo }, { headers });
      await loadEmpleados();
      Swal.fire({ icon: 'success', title: 'Cargo actualizado', toast: true, position: 'top-end', timer: 1000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'No se pudo actualizar el cargo.', 'error');
    }
  }

  async function resetearPassword(id) {
    const { value: nueva } = await Swal.fire({
        title: 'Resetear Contraseña',
        input: 'password',
        inputLabel: 'Ingrese la nueva contraseña (mín. 6 caracteres)',
        inputPlaceholder: 'Nueva contraseña',
        showCancelButton: true
    });

    if (!nueva) return;
    if (nueva.length < 6) {
      Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }
    try {
      await client.post(`/pos/api/empleados/${id}/reset_password/`, { password: nueva }, { headers });
      Swal.fire('Éxito', 'Contraseña actualizada correctamente.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo actualizar la contraseña.', 'error');
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary m-0"><i className="bi bi-people-fill me-2"></i>Gestión de Empleados</h2>
      </div>

      {error && (
        <div className="alert alert-danger shadow-sm d-flex justify-content-between align-items-center mb-4">
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={loadEmpleados}>Reintentar</button>
        </div>
      )}

      <div className="row g-4">
        {/* COLUMNA 1: FORMULARIO DE CREACIÓN */}
        <div className="col-lg-5 col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
              <h5 className="m-0 fw-bold text-dark"><i className="bi bi-person-plus me-2"></i>Nuevo Empleado</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowForm((s) => !s)}>
                {showForm ? <i className="bi bi-chevron-up"></i> : <i className="bi bi-chevron-down"></i>}
              </button>
            </div>
            {showForm && (
              <div className="card-body">
                <Formik
                  initialValues={initialValues}
                  validationSchema={empleadoSchema}
                  onSubmit={handleSubmit}
                >
                  {({ isSubmitting, errors, touched }) => (
                    <Form>
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Nombre completo</label>
                        <Field name="nombre_completo" type="text" className={`form-control ${errors.nombre_completo && touched.nombre_completo ? 'is-invalid' : ''}`} placeholder="Ej. Ana Pérez" />
                        <FormError name="nombre_completo" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Usuario</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-person"></i></span>
                            <Field name="username" type="text" className={`form-control ${errors.username && touched.username ? 'is-invalid' : ''}`} placeholder="Usuario único" />
                        </div>
                        <FormError name="username" />
                      </div>

                      <div className="row g-2 mb-3">
                          <div className="col-6">
                            <label className="form-label small fw-bold text-muted">Contraseña</label>
                            <Field name="password" type="password" className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`} placeholder="******" />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-bold text-muted">Confirmar</label>
                            <Field name="password2" type="password" className={`form-control ${errors.password2 && touched.password2 ? 'is-invalid' : ''}`} placeholder="******" />
                          </div>
                          <div className="col-12"><FormError name="password" /><FormError name="password2" /></div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-bold text-muted">Cargo</label>
                        <Field as="select" name="cargo" className={`form-select ${errors.cargo && touched.cargo ? 'is-invalid' : ''}`}>
                          <option value="Vendedor">Vendedor</option>
                          <option value="Administrador">Administrador</option>
                        </Field>
                        <FormError name="cargo" />
                      </div>

                      <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : 'Crear Empleado'}
                      </button>
                    </Form>
                  )}
                </Formik>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: LISTADO DE EMPLEADOS */}
        <div className="col-lg-7 col-xl-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="m-0 fw-bold text-dark"><i className="bi bi-list-ul me-2"></i>Personal</h5>
              <span className="badge bg-primary rounded-pill">{empleados.length}</span>
            </div>
            
            <div className="card-body p-0 overflow-auto" style={{maxHeight: '600px'}}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : empleados.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 mb-2"></i>
                    <p>No hay empleados registrados.</p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {empleados.map((emp) => (
                    <li key={emp.id} className="list-group-item p-3">
                      {/* DISEÑO RESPONSIVO: Flex Column en movil, Flex Row en pantallas grandes */}
                      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-start align-items-xl-center gap-3">
                        
                        {/* Info Empleado */}
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{width:'40px', height:'40px'}}>
                                {emp.nombre_completo.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="fw-bold text-dark">{emp.nombre_completo}</div>
                                <div className="small text-muted d-flex align-items-center gap-2">
                                    <span><i className="bi bi-person-badge me-1"></i>@{emp.username}</span>
                                    <span className="badge bg-light text-dark border">{emp.cargo}</span>
                                </div>
                            </div>
                        </div>

                        {/* Controles: Se ajustan al ancho en movil */}
                        <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-xl-auto mt-2 mt-xl-0">
                            
                            <select
                              className="form-select form-select-sm"
                              style={{minWidth: '130px', maxWidth: '100%'}}
                              value={emp.cargo}
                              onChange={(e) => cambiarCargo(emp.id, e.target.value)}
                            >
                              <option value="Vendedor">Vendedor</option>
                              <option value="Administrador">Admin</option>
                            </select>

                            <div className="btn-group w-100 w-sm-auto">
                                <button className="btn btn-sm btn-outline-secondary" title="Editar Nombre" onClick={() => abrirEditar(emp)}>
                                    <i className="bi bi-pencil-square"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-secondary" title="Resetear Clave" onClick={() => resetearPassword(emp.id)}>
                                    <i className="bi bi-key"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" title="Eliminar" onClick={() => eliminarEmpleado(emp.id)}>
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN SIMPLE */}
      {editTarget && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Editar Empleado</h5>
                <button type="button" className="btn-close" onClick={() => setEditTarget(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Nombre completo</label>
                  <input className="form-control" value={editForm.nombre_completo} onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Usuario</label>
                  <input className="form-control" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={guardarEdicion}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}