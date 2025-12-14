/**
 * Componente FormField
 * Wrapper para Field de Formik con label, error y estilos consistentes
 * Integra Bootstrap con el tema cafetería
 */

import { Field } from 'formik';
import FormError from './FormError';

export default function FormField({
  name,
  label,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  as = 'input',
  children, // Para <option> en <select>
  ...props
}) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label fw-semibold" style={{ color: 'var(--text-dark)' }}>
          {label}
          {required && <span style={{ color: 'var(--danger-color)' }}> *</span>}
        </label>
      )}

      <Field
        id={name}
        name={name}
        type={type}
        placeholder={placeholder || label}
        disabled={disabled}
        className={`form-control ${className}`}
        as={as}
        {...props}
      >
        {children}
      </Field>

      <FormError name={name} />
    </div>
  );
}
