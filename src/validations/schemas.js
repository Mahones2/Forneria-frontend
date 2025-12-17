/**
 * Esquemas de Validación Yup para todos los formularios
 * Tema Fornería - Sistema de gestión de panadería
 */

import * as Yup from 'yup';
import {
  validateRut,
  validateRutDigit,
  validateChileanPhone,
  isPositiveNumber,
  isFutureDate,
  noSpaces,
  alphanumericWithSpaces,
  lettersWithSpaces,
  validateBarcode
} from './customValidators';

// ==========================================
// MENSAJES DE ERROR PERSONALIZADOS
// ==========================================

const messages = {
  required: 'Este campo es obligatorio',
  email: 'Debe ser un email válido',
  minLength: (min) => `Debe tener al menos ${min} caracteres`,
  maxLength: (max) => `Debe tener máximo ${max} caracteres`,
  minValue: (min) => `Debe ser mayor o igual a ${min}`,
  maxValue: (max) => `Debe ser menor o igual a ${max}`,
  positive: 'Debe ser mayor a 0',
  integer: 'Debe ser un número entero',
  noSpaces: 'No debe contener espacios',
  alphanumeric: 'Solo letras, números y espacios',
  letters: 'Solo letras y espacios',
  rutFormat: 'Formato de RUT inválido (ej: 12.345.678-9)',
  rutDigit: 'Dígito verificador de RUT inválido',
  phoneFormat: 'Formato de teléfono inválido (ej: 912345678)',
  barcodeFormat: 'Código de barras debe tener entre 8-13 dígitos',
  passwordMatch: 'Las contraseñas no coinciden',
  futureDate: 'La fecha debe ser futura o actual',
  dateAfter: (field) => `Debe ser posterior a ${field}`,
};

// ==========================================
// SCHEMA: LOGIN
// ==========================================

export const loginSchema = Yup.object({
  username: Yup.string()
    .min(3, messages.minLength(3))
    .max(150, messages.maxLength(150))
    .test('no-spaces', messages.noSpaces, noSpaces)
    .required(messages.required),

  password: Yup.string()
    .min(6, messages.minLength(6))
    .required(messages.required),
});

// ==========================================
// SCHEMA: CLIENTE
// ==========================================

export const clienteSchema = Yup.object({
  rut: Yup.string()
    .test('rut-format', messages.rutFormat, validateRut)
    .test('rut-digit', messages.rutDigit, validateRutDigit)
    .nullable(),

  nombre: Yup.string()
    .min(2, messages.minLength(2))
    .max(150, messages.maxLength(150))
    .test('letters-only', messages.letters, lettersWithSpaces)
    .required(messages.required),

  correo: Yup.string()
    .email(messages.email)
    .max(100, messages.maxLength(100))
    .required(messages.required),

  telefono: Yup.string()
    .test('phone-format', messages.phoneFormat, validateChileanPhone)
    .matches(/^(\+?56)?(9\d{8})$/, messages.phoneFormat)
    .required(messages.required),

  direccion: Yup.string()
    .max(250, messages.maxLength(250))
    .nullable(),

  es_empresa: Yup.boolean()
    .default(false),
});

// ==========================================
// SCHEMA: PRODUCTO
// ==========================================

export const productoSchema = Yup.object({
  nombre: Yup.string()
    .min(3, messages.minLength(3))
    .max(100, messages.maxLength(100))
    .test('alphanumeric', messages.alphanumeric, alphanumericWithSpaces)
    .required(messages.required),

  codigo_barra: Yup.string()
    .test('barcode-format', messages.barcodeFormat, validateBarcode)
    .max(50, messages.maxLength(50))
    .nullable(),

  descripcion: Yup.string()
    .max(300, messages.maxLength(300))
    .nullable(),

  marca: Yup.string()
    .max(100, messages.maxLength(100))
    .nullable(),

  categoria: Yup.number()
    .integer(messages.integer)
    .positive(messages.positive)
    .required(messages.required),

  precio_venta: Yup.number()
    .min(0.01, messages.positive)
    .max(999999.99, messages.maxValue(999999.99))
    .test('is-positive', messages.positive, isPositiveNumber)
    .transform((value, originalValue) => {
      // Convertir string vacío a undefined
      return originalValue === '' ? undefined : value;
    })
    .required(messages.required),

  costo_unitario: Yup.number()
    .min(0, messages.minValue(0))
    .max(999999.99, messages.maxValue(999999.99))
    .transform((value, originalValue) => {
      return originalValue === '' ? undefined : value;
    })
    .nullable(),

  stock_minimo_global: Yup.number()
    .integer(messages.integer)
    .min(0, messages.minValue(0))
    .max(9999, messages.maxValue(9999))
    .transform((value, originalValue) => {
      return originalValue === '' ? undefined : value;
    })
    .required(messages.required),

  tipo: Yup.string()
    .max(100, messages.maxLength(100))
    .nullable(),

  presentacion: Yup.string()
    .max(100, messages.maxLength(100))
    .nullable(),
});

// ==========================================
// SCHEMA: LOTE
// ==========================================

export const loteSchema = Yup.object({
  numero_lote: Yup.string()
    .max(50, messages.maxLength(50))
    .nullable(),

  fecha_elaboracion: Yup.date()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    }),

  fecha_caducidad: Yup.date()
    .required(messages.required)
    .test('is-future', messages.futureDate, isFutureDate)
    .when('fecha_elaboracion', (fechaElaboracion, schema) => {
      if (fechaElaboracion && fechaElaboracion[0]) {
        return schema.min(
          fechaElaboracion[0],
          messages.dateAfter('fecha de elaboración')
        );
      }
      return schema;
    }),

  precio_costo_unitario: Yup.number()
    .min(0.01, messages.positive)
    .max(999999.99, messages.maxValue(999999.99))
    .test('is-positive', messages.positive, isPositiveNumber)
    .transform((value, originalValue) => {
      return originalValue === '' ? undefined : value;
    })
    .required(messages.required),

  stock_inicial: Yup.number()
    .integer(messages.integer)
    .min(1, messages.minValue(1))
    .max(9999, messages.maxValue(9999))
    .transform((value, originalValue) => {
      return originalValue === '' ? undefined : value;
    })
    .required(messages.required),

  ubicacion: Yup.number()
    .integer(messages.integer)
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    }),
});

// ==========================================
// SCHEMA: EMPLEADO (CREACIÓN)
// ==========================================

export const empleadoSchema = Yup.object({
  nombre_completo: Yup.string()
    .min(3, messages.minLength(3))
    .max(150, messages.maxLength(150))
    .test('letters-only', messages.letters, lettersWithSpaces)
    .required(messages.required),

  username: Yup.string()
    .min(3, messages.minLength(3))
    .max(150, messages.maxLength(150))
    .test('no-spaces', messages.noSpaces, noSpaces)
    .required(messages.required),

  password: Yup.string()
    .min(6, messages.minLength(6))
    .max(128, messages.maxLength(128))
    .required(messages.required),

  password2: Yup.string()
    .oneOf([Yup.ref('password'), null], messages.passwordMatch)
    .required(messages.required),

  cargo: Yup.string()
    .oneOf(['Administrador', 'Vendedor'], 'Cargo inválido')
    .required(messages.required),
});

// ==========================================
// SCHEMA: EMPLEADO (EDICIÓN - sin password)
// ==========================================

export const empleadoEditSchema = Yup.object({
  nombre_completo: Yup.string()
    .min(3, messages.minLength(3))
    .max(150, messages.maxLength(150))
    .test('letters-only', messages.letters, lettersWithSpaces)
    .required(messages.required),

  username: Yup.string()
    .min(3, messages.minLength(3))
    .max(150, messages.maxLength(150))
    .test('no-spaces', messages.noSpaces, noSpaces)
    .required(messages.required),
});

// ==========================================
// SCHEMA: PAGO
// ==========================================

export const pagoSchema = Yup.object({
  metodo: Yup.string()
    .oneOf(['EFE', 'DEB', 'CRE', 'TRA'], 'Método de pago inválido')
    .required(messages.required),

  monto: Yup.number()
    .min(0.01, messages.positive)
    .max(999999999.99, messages.maxValue(999999999.99))
    .test('is-positive', messages.positive, isPositiveNumber)
    .transform((value, originalValue) => {
      return originalValue === '' ? undefined : value;
    })
    .required(messages.required),

  monto_recibido: Yup.number()
    .when('metodo', {
      is: 'EFE',
      then: (schema) => schema
        .min(Yup.ref('monto'), 'El monto recibido debe ser mayor o igual al total')
        .required('Requerido para pagos en efectivo'),
      otherwise: (schema) => schema.nullable(),
    })
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    }),

  referencia_externa: Yup.string()
    .max(100, messages.maxLength(100))
    .nullable(),
});

// ==========================================
// SCHEMA: FILTROS (BÚSQUEDA/FILTRADO)
// ==========================================

export const filtroClienteSchema = Yup.object({
  rut: Yup.string()
    .test('rut-format', messages.rutFormat, validateRut)
    .nullable(),

  nombre: Yup.string()
    .max(150, messages.maxLength(150))
    .nullable(),
});

export const filtroProductoSchema = Yup.object({
  buscar: Yup.string()
    .max(100, messages.maxLength(100))
    .nullable(),

  categoriaFilter: Yup.number()
    .integer(messages.integer)
    .nullable(),
});

// ==========================================
// HELPER: Valores Iniciales para Formularios
// ==========================================

export const initialValues = {
  login: {
    username: '',
    password: '',
  },

  cliente: {
    rut: '',
    nombre: '',
    correo: '',
    telefono: '',
    direccion: '',
    es_empresa: false,
  },

  producto: {
    nombre: '',
    codigo_barra: '',
    descripcion: '',
    marca: '',
    categoria: '',
    precio_venta: '',
    costo_unitario: '',
    stock_minimo_global: 5,
    tipo: '',
    presentacion: '',
  },

  lote: {
    numero_lote: '',
    fecha_elaboracion: '',
    fecha_caducidad: '',
    precio_costo_unitario: '',
    stock_inicial: '',
    ubicacion: '',
  },

  empleado: {
    nombre_completo: '',
    username: '',
    password: '',
    password2: '',
    cargo: 'Vendedor',
  },

  empleadoEdit: {
    nombre_completo: '',
    username: '',
  },

  pago: {
    metodo: 'EFE',
    monto: '',
    monto_recibido: '',
    referencia_externa: '',
  },
};

// ==========================================
// EXPORT ALL
// ==========================================

export default {
  loginSchema,
  clienteSchema,
  productoSchema,
  loteSchema,
  empleadoSchema,
  empleadoEditSchema,
  pagoSchema,
  filtroClienteSchema,
  filtroProductoSchema,
  initialValues,
};
