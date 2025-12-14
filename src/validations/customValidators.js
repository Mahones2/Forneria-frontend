/**
 * Validadores Personalizados para Formik+Yup
 * Funciones de validación reutilizables para formatos específicos
 */

/**
 * Valida formato de RUT chileno (XX.XXX.XXX-X)
 * @param {string} value - RUT a validar
 * @returns {boolean} - true si el formato es válido
 */
export const validateRut = (value) => {
  if (!value) return true; // Permitir vacío si no es required

  // Formato: XX.XXX.XXX-X o XXXXXXXX-X
  const rutRegex = /^(\d{1,2}\.?\d{3}\.?\d{3})-?[\dkK]$/;
  return rutRegex.test(value);
};

/**
 * Valida dígito verificador de RUT chileno
 * @param {string} rut - RUT completo con dígito verificador
 * @returns {boolean} - true si el dígito verificador es correcto
 */
export const validateRutDigit = (rut) => {
  if (!rut) return true;

  // Limpiar el RUT
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
  const cuerpo = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();

  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalculado;

  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();

  return dv === dvCalculado;
};

/**
 * Valida formato de teléfono chileno
 * Acepta: +56912345678, 912345678, +56 9 1234 5678
 * @param {string} value - Teléfono a validar
 * @returns {boolean} - true si el formato es válido
 */
export const validateChileanPhone = (value) => {
  if (!value) return true; // Permitir vacío si no es required

  // Limpiar espacios y guiones
  const cleanPhone = value.replace(/\s/g, '').replace(/-/g, '');

  // Formatos válidos:
  // +56912345678 (con código país)
  // 912345678 (celular)
  // 2XXXXXXX (fijo Santiago con 8 dígitos)
  const phoneRegex = /^(\+?56)?([2-9]\d{8})$/;

  return phoneRegex.test(cleanPhone);
};

/**
 * Formatea RUT agregando puntos y guión
 * @param {string} rut - RUT sin formato
 * @returns {string} - RUT formateado
 */
export const formatRut = (rut) => {
  if (!rut) return '';

  // Limpiar el RUT
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');

  // Separar cuerpo y dígito verificador
  const cuerpo = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Agregar puntos al cuerpo
  let formatted = '';
  let count = 0;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    if (count === 3) {
      formatted = '.' + formatted;
      count = 0;
    }
    formatted = cuerpo[i] + formatted;
    count++;
  }

  return formatted + '-' + dv;
};

/**
 * Valida que un número sea positivo
 * @param {number} value - Número a validar
 * @returns {boolean} - true si es mayor a 0
 */
export const isPositiveNumber = (value) => {
  return value > 0;
};

/**
 * Valida que una fecha sea futura
 * @param {string|Date} value - Fecha a validar
 * @returns {boolean} - true si la fecha es futura
 */
export const isFutureDate = (value) => {
  if (!value) return true;

  const inputDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Resetear hora para comparar solo fechas

  return inputDate >= today;
};

/**
 * Valida que username no contenga espacios
 * @param {string} value - Username a validar
 * @returns {boolean} - true si no tiene espacios
 */
export const noSpaces = (value) => {
  if (!value) return true;
  return !/\s/.test(value);
};

/**
 * Valida que solo contenga letras, números y espacios
 * @param {string} value - String a validar
 * @returns {boolean} - true si solo tiene caracteres permitidos
 */
export const alphanumericWithSpaces = (value) => {
  if (!value) return true;
  return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(value);
};

/**
 * Valida que solo contenga letras y espacios
 * @param {string} value - String a validar
 * @returns {boolean} - true si solo tiene letras y espacios
 */
export const lettersWithSpaces = (value) => {
  if (!value) return true;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value);
};

/**
 * Valida código de barras (puede ser numérico)
 * @param {string} value - Código de barras
 * @returns {boolean} - true si es válido
 */
export const validateBarcode = (value) => {
  if (!value) return true;
  // Código de barras típicamente es numérico y entre 8-13 dígitos
  return /^\d{8,13}$/.test(value);
};
