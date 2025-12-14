# Guía de Pruebas - Frontend (React + Yup)

## 📋 Tabla de Contenidos
- [Configuración](#configuración)
- [Ejecutar Pruebas](#ejecutar-pruebas)
- [Estructura de Pruebas](#estructura-de-pruebas)
- [Cobertura de Pruebas](#cobertura-de-pruebas)

## ⚙️ Configuración

### Instalar dependencias de pruebas:

```bash
cd C:\Users\saemm\OneDrive\Documentos\GitHub\Forneria-frontend2
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Archivos de configuración:

```
.
├── vitest.config.js           # Configuración Vitest
├── src/
│   ├── setupTests.js          # Setup global para pruebas
│   └── validations/
│       ├── schemas.js         # Schemas Yup
│       └── schemas.test.js    # Pruebas de schemas
```

### Agregar scripts a package.json:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 🚀 Ejecutar Pruebas

### Ejecutar todas las pruebas:
```bash
npm test
```

### Ejecutar en modo watch (se re-ejecutan al cambiar archivos):
```bash
npm test -- --watch
```

### Ejecutar con interfaz UI:
```bash
npm run test:ui
```

### Ejecutar pruebas específicas:
```bash
# Solo pruebas de schemas
npm test schemas.test.js

# Ejecutar una suite específica
npm test -- -t "loginSchema"
```

### Generar reporte de cobertura:
```bash
npm run test:coverage
```

## 📊 Estructura de Pruebas

### schemas.test.js (6 schemas principales)

#### ✅ loginSchema
- `debe validar correctamente un login válido`
- `debe rechazar username con menos de 3 caracteres`
- `debe rechazar username con espacios`
- `debe rechazar password con menos de 6 caracteres`
- `debe rechazar campos vacíos`

**Cobertura:** Username (min 3, sin espacios), Password (min 6)

#### ✅ clienteSchema
- `debe validar correctamente un cliente válido`
- `debe rechazar RUT en formato inválido`
- `debe aceptar RUT sin puntos pero con guión`
- `debe rechazar email inválido`
- `debe rechazar teléfono en formato inválido`
- `debe aceptar teléfono con prefijo +56`
- `debe rechazar nombre vacío`

**Cobertura:** RUT chileno, Email, Teléfono chileno, Nombre requerido

#### ✅ productoSchema
- `debe validar correctamente un producto válido`
- `debe rechazar nombre con menos de 3 caracteres`
- `debe rechazar precio de venta cero`
- `debe rechazar precio de venta negativo`
- `debe rechazar stock mínimo negativo`
- `debe rechazar categoría vacía`
- `debe transformar precio_venta string a number`

**Cobertura:** Nombre (min 3), Precio > 0, Stock >= 0, Categoría requerida, Transformación tipos

#### ✅ loteSchema
- `debe validar correctamente un lote válido`
- `debe rechazar fecha de caducidad pasada`
- `debe rechazar fecha de caducidad anterior a elaboración` (Cross-field)
- `debe rechazar precio de costo cero`
- `debe rechazar precio de costo negativo`
- `debe rechazar stock inicial menor a 1`
- `debe rechazar stock inicial mayor a 9999`
- `debe transformar precio_costo_unitario string a number`

**Cobertura:** Fechas futuras, Cross-field validation, Precio > 0, Stock 1-9999, Transformación tipos

#### ✅ empleadoSchema
- `debe validar correctamente un empleado válido`
- `debe rechazar username con espacios`
- `debe rechazar username con menos de 3 caracteres`
- `debe rechazar password con menos de 6 caracteres`
- `debe rechazar passwords que no coinciden` (Cross-field)
- `debe rechazar nombre completo vacío`

**Cobertura:** Username (min 3, sin espacios), Password (min 6), Password match

#### ✅ pagoSchema
- `debe validar correctamente un pago en efectivo válido`
- `debe validar correctamente un pago con tarjeta`
- `debe rechazar monto cero`
- `debe rechazar monto negativo`
- `debe transformar monto string a number`

**Cobertura:** Monto > 0, Transformación tipos

## 📈 Cobertura de Pruebas

### Validaciones Yup Cubiertas:

✅ **Validadores Básicos**
- `.string()`, `.number()`, `.date()`
- `.required()` - Campos requeridos
- `.min()`, `.max()` - Rangos numéricos
- `.email()` - Formato email
- `.oneOf()` - Valores permitidos

✅ **Validadores Custom**
- `validateRut` - RUT chileno
- `validateChileanPhone` - Teléfono chileno
- `noSpaces` - Sin espacios
- `isPositiveNumber` - Números positivos
- `isFutureDate` - Fechas futuras
- `dateAfter` - Fecha posterior a otra

✅ **Transformaciones**
- String → Number para precios
- String → Number para stock
- Manejo de valores vacíos

✅ **Cross-field Validation**
- `fecha_caducidad > fecha_elaboracion` (Lote)
- `password === password2` (Empleado)

## 🎯 Resultados Esperados

Al ejecutar `npm test`, deberías ver:

```
 ✓ src/validations/schemas.test.js (35)
   ✓ loginSchema (5)
   ✓ clienteSchema (7)
   ✓ productoSchema (7)
   ✓ loteSchema (8)
   ✓ empleadoSchema (6)
   ✓ pagoSchema (5)

 Test Files  1 passed (1)
      Tests  38 passed (38)
   Start at  14:30:00
   Duration  1.23s (transform 45ms, setup 0ms, collect 234ms, tests 890ms)
```

## 🐛 Troubleshooting

### Error: "Cannot find module 'vitest'"
**Solución:** Instala Vitest:
```bash
npm install --save-dev vitest
```

### Error: "ReferenceError: expect is not defined"
**Solución:** Asegúrate de que vitest.config.js tiene `globals: true`

### Error: "Cannot find module '@testing-library/jest-dom/vitest'"
**Solución:** Instala la dependencia:
```bash
npm install --save-dev @testing-library/jest-dom
```

### Las pruebas pasan pero con warnings de validación
**Solución:** Esto es normal, estamos probando casos inválidos intencionalmente

## 📝 Agregar Nuevas Pruebas

Para agregar nuevas pruebas de schemas:

1. Edita `src/validations/schemas.test.js`
2. Crea una nueva suite de pruebas:

```javascript
describe('nuevoSchema', () => {
  it('debe validar correctamente datos válidos', async () => {
    const validData = {
      campo1: 'valor válido',
      campo2: 123
    };

    await expect(nuevoSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar datos inválidos', async () => {
    const invalidData = {
      campo1: '',
      campo2: -1
    };

    await expect(nuevoSchema.validate(invalidData)).rejects.toThrow(/error esperado/i);
  });
});
```

3. Ejecuta solo esa suite:
```bash
npm test -- -t "nuevoSchema"
```

## 🔍 Modo Watch Interactivo

Vitest tiene un modo watch interactivo muy útil:

```bash
npm test -- --watch
```

Comandos disponibles en modo watch:
- `a` - Ejecutar todas las pruebas
- `f` - Ejecutar solo pruebas fallidas
- `u` - Actualizar snapshots
- `p` - Filtrar por nombre de archivo
- `t` - Filtrar por nombre de test
- `q` - Salir

## 📊 Reporte de Cobertura

Para generar un reporte de cobertura completo:

```bash
npm run test:coverage
```

Esto generará un reporte en `coverage/` con:
- **Líneas cubiertas:** Qué líneas de código se ejecutaron
- **Funciones cubiertas:** Qué funciones se probaron
- **Branches cubiertas:** Qué rutas de decisión se probaron

Abre `coverage/index.html` en el navegador para ver el reporte visual.

## 🎨 Pruebas de Componentes (Próximo paso)

Para probar componentes React con Formik:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../pages/Login/Login';

describe('Login Component', () => {
  it('debe mostrar error si username es muy corto', async () => {
    render(<Login />);

    const usernameInput = screen.getByPlaceholderText('Usuario');
    await userEvent.type(usernameInput, 'ab');

    await waitFor(() => {
      expect(screen.getByText(/mínimo 3/i)).toBeInTheDocument();
    });
  });
});
```

## 📚 Recursos Adicionales

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Yup Validation](https://github.com/jquense/yup)
- [Testing Formik Forms](https://formik.org/docs/guides/testing)
