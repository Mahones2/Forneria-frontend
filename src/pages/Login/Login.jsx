import { useState } from "react";
import { Formik, Form, Field } from "formik";
import { useAuth } from "../../components/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, initialValues } from "../../validations/schemas";
import FormError from "../../components/UI/FormError";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleSubmit(values, { setSubmitting }) {
    try {
      setError("");
      await login(values);
      navigate("/pos");
    } catch (err) {
      setError(err.response?.data?.detail || "Credenciales inválidas. Por favor, inténtelo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1509042239860-f550ce710b93')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="card shadow-lg p-4" style={{ maxWidth: 400, width: "100%", backdropFilter: "blur(6px)" }}>
        <h2 className="card-title text-center mb-4" style={{ color: 'var(--primary-color)' }}>
          Iniciar Sesión
        </h2>

        {error && <div className="alert alert-danger text-center">{error}</div>}

        <Formik
          initialValues={initialValues.login}
          validationSchema={loginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <div className="mb-3">
                <Field
                  name="username"
                  type="text"
                  className={`form-control ${errors.username && touched.username ? 'is-invalid' : ''}`}
                  placeholder="Usuario"
                />
                <FormError name="username" />
              </div>

              <div className="mb-4">
                <Field
                  name="password"
                  type="password"
                  className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                  placeholder="Contraseña"
                />
                <FormError name="password" />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando...' : 'Entrar'}
              </button>
            </Form>
          )}
        </Formik>

        {/* Enlace para volver al Landing */}
        <div className="text-center mt-3">
          <Link to="/" className="text-decoration-none" style={{ color: 'var(--secondary-color)' }}>
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
