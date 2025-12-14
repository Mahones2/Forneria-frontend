/**
 * Componente FormError
 * Muestra mensajes de error de validación de Formik de forma consistente
 * Usa los colores del tema cafetería
 */

import { ErrorMessage } from 'formik';

export default function FormError({ name, className = '' }) {
  return (
    <ErrorMessage name={name}>
      {(msg) => (
        <div
          className={`small mt-1 ${className}`}
          style={{
            color: 'var(--danger-color)',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          {msg}
        </div>
      )}
    </ErrorMessage>
  );
}
