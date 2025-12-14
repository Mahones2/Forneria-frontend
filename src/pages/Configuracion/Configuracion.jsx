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
      setError(
        err.response?.data?.detail ||
          "No se pudieron cargar los empleados."
      );
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
    } catch (err) {
      console.error("Error al editar empleado:", err);
      alert(err.response?.data?.detail || "No se pudo actualizar el empleado.");
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
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Empleado creado exitosamente',
        showConfirmButton: false,
        timer: 2000
      });

      resetForm();
      await loadEmpleados();
    } catch (err) {
      console.error("Error al crear empleado:", err);
      const errorMsg = err.response?.data?.detail ||
                      (typeof err.response?.data === 'object' ? JSON.stringify(err.response?.data) : null) ||
                      "No se pudo crear el empleado. Verifique los datos.";

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Error al crear empleado',
        text: errorMsg,
        showConfirmButton: false,
        timer: 3000
      });

      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  async function eliminarEmpleado(id) {
    if (!confirm("¿Seguro que desea eliminar este empleado?")) return;
    try {
      await client.delete(`/pos/api/empleados/${id}/`, { headers });
      await loadEmpleados();
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
      alert("No se pudo eliminar el empleado.");
    }
  }

  async function cambiarCargo(id, nuevoCargo) {
    try {
      await client.patch(`/pos/api/empleados/${id}/`, { cargo: nuevoCargo }, { headers });
      await loadEmpleados();
    } catch (err) {
      console.error("Error al cambiar cargo:", err);
      alert("No se pudo actualizar el cargo.");
    }
  }

  async function resetearPassword(id) {
    const nueva = prompt("Nueva contraseña (mínimo 6 caracteres):");
    if (!nueva) return;
    if (nueva.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      // Endpoint de reseteo de contraseña asumido
      await client.post(`/pos/api/empleados/${id}/reset_password/`, { password: nueva }, { headers });
      alert("Contraseña actualizada.");
    } catch (err) {
      console.error("Error al actualizar contraseña:", err);
      alert("No se pudo actualizar la contraseña.");
    }
  }

  return (
    <div className="container">
      <h2 className="mt-2 mb-4">Empleados</h2>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>
            <strong>Ocurrió un problema</strong>
            <div>{error}</div>
          </div>
          <button className="btn btn-danger" onClick={loadEmpleados}>Reintentar</button>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-light-theme d-flex justify-content-between align-items-center">
              <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Crear nuevo empleado</span>
              <button className="btn btn-sm btn-warning" onClick={() => setShowForm((s) => !s)}>
                {showForm ? "Ocultar" : "Mostrar"}
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
                        <label className="form-label fw-semibold">
                          Nombre completo <span className="text-danger">*</span>
                        </label>
                        <Field
                          name="nombre_completo"
                          type="text"
                          className={`form-control ${errors.nombre_completo && touched.nombre_completo ? 'is-invalid' : ''}`}
                          placeholder="Ej. Ana Pérez García"
                        />
                        <FormError name="nombre_completo" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Usuario <span className="text-danger">*</span>
                        </label>
                        <Field
                          name="username"
                          type="text"
                          className={`form-control ${errors.username && touched.username ? 'is-invalid' : ''}`}
                          placeholder="Nombre de usuario único"
                        />
                        <FormError name="username" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Contraseña <span className="text-danger">*</span>
                        </label>
                        <Field
                          name="password"
                          type="password"
                          className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <FormError name="password" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Confirmar contraseña <span className="text-danger">*</span>
                        </label>
                        <Field
                          name="password2"
                          type="password"
                          className={`form-control ${errors.password2 && touched.password2 ? 'is-invalid' : ''}`}
                          placeholder="Repite la contraseña"
                        />
                        <FormError name="password2" />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Cargo <span className="text-danger">*</span>
                        </label>
                        <Field
                          as="select"
                          name="cargo"
                          className={`form-select ${errors.cargo && touched.cargo ? 'is-invalid' : ''}`}
                        >
                          <option value="Vendedor">Vendedor</option>
                          <option value="Administrador">Administrador</option>
                        </Field>
                        <FormError name="cargo" />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Creando...
                          </>
                        ) : 'Crear empleado'}
                      </button>
                    </Form>
                  )}
                </Formik>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-light-theme d-flex justify-content-between align-items-center">
              <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Empleados registrados</span>
              <span className="badge bg-warning text-dark">{empleados.length}</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : empleados.length === 0 ? (
                <div className="alert alert-info">No hay empleados registrados.</div>
              ) : (
                <>
                  <ul className="list-group">
                    {empleados.map((emp) => (
                      <li key={emp.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold">{emp.nombre_completo}</div>
                            <small className="text-muted">@{emp.username}</small>
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              title="Editar nombre/usuario"
                              onClick={() => abrirEditar(emp)}
                            >
                              ✏️ Editar
                            </button>
                            <select
                              className="form-select form-select-sm w-auto"
                              value={emp.cargo}
                              onChange={(e) => cambiarCargo(emp.id, e.target.value)}
                            >
                              <option value="Vendedor">Vendedor</option>
                              <option value="Administrador">Administrador</option>
                            </select>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              title="Resetear contraseña"
                              onClick={() => resetearPassword(emp.id)}
                            >
                              🔒 Reset
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar"
                              onClick={() => eliminarEmpleado(emp.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {editTarget && (
                    <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="modal-dialog" role="document">
                        <div className="modal-content">
                          <div className="modal-header bg-light-theme">
                            <h5 className="modal-title" style={{ color: 'var(--primary-color)' }}>Editar empleado</h5>
                            <button type="button" className="btn-close" onClick={() => setEditTarget(null)} aria-label="Close"></button>
                          </div>
                          <div className="modal-body">
                            <div className="mb-3">
                              <label className="form-label">Nombre completo</label>
                              <input className="form-control" value={editForm.nombre_completo} onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })} />
                            </div>
                            <div className="mb-3">
                              <label className="form-label">Usuario</label>
                              <input className="form-control" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
                            </div>
                          </div>
                          <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
                            <button type="button" className="btn btn-primary" onClick={guardarEdicion}>Guardar cambios</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}