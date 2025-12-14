/**
 * Pruebas para schemas.js
 * Testing de validaciones Yup en el frontend
 *
 * Para ejecutar: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  clienteSchema,
  productoSchema,
  loteSchema,
  empleadoSchema,
  pagoSchema
} from './schemas';

describe('loginSchema', () => {
  it('debe validar correctamente un login válido', async () => {
    const validData = {
      username: 'usuario123',
      password: 'password123'
    };

    await expect(loginSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar username con menos de 3 caracteres', async () => {
    const invalidData = {
      username: 'ab',
      password: 'password123'
    };

    await expect(loginSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 3/i);
  });

  it('debe rechazar username con espacios', async () => {
    const invalidData = {
      username: 'user name',
      password: 'password123'
    };

    await expect(loginSchema.validate(invalidData)).rejects.toThrow(/espacios/i);
  });

  it('debe rechazar password con menos de 6 caracteres', async () => {
    const invalidData = {
      username: 'usuario123',
      password: '12345'
    };

    await expect(loginSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 6/i);
  });

  it('debe rechazar campos vacíos', async () => {
    const invalidData = {
      username: '',
      password: ''
    };

    // Yup valida min() antes de required(), por lo que devuelve el error de min length primero
    await expect(loginSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos/i);
  });
});

describe('clienteSchema', () => {
  it('debe validar correctamente un cliente válido con RUT real', async () => {
    const validData = {
      rut: '11.111.111-1',  // RUT válido con dígito verificador correcto
      nombre: 'Juan Pérez',
      correo: 'juan@correo.com',
      telefono: '912345678',
      direccion: 'Calle 123'
    };

    await expect(clienteSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar RUT en formato inválido', async () => {
    const invalidData = {
      rut: '12345678',  // Sin guión
      nombre: 'Juan Pérez'
    };

    await expect(clienteSchema.validate(invalidData)).rejects.toThrow(/RUT/i);
  });

  it('debe aceptar RUT sin puntos pero con guión válido', async () => {
    const validData = {
      rut: '11111111-1',  // Sin puntos pero válido
      nombre: 'María López'
    };

    await expect(clienteSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar email inválido', async () => {
    const invalidData = {
      rut: '11.111.111-1',
      nombre: 'Pedro González',
      correo: 'email-invalido'
    };

    await expect(clienteSchema.validate(invalidData)).rejects.toThrow(/email/i);
  });

  it('debe rechazar teléfono en formato inválido', async () => {
    const invalidData = {
      rut: '11.111.111-1',
      nombre: 'Ana Torres',
      telefono: '12345'
    };

    await expect(clienteSchema.validate(invalidData)).rejects.toThrow(/teléfono/i);
  });

  it('debe aceptar teléfono con prefijo +56', async () => {
    const validData = {
      rut: '11.111.111-1',
      nombre: 'Carlos Ruiz',
      telefono: '+56912345678'
    };

    await expect(clienteSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar nombre vacío', async () => {
    const invalidData = {
      rut: '11.111.111-1',
      nombre: ''
    };

    // Yup valida min() antes de required(), por lo que devuelve el error de min length primero
    await expect(clienteSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 2/i);
  });
});

describe('productoSchema', () => {
  it('debe validar correctamente un producto válido', async () => {
    const validData = {
      nombre: 'Pan Integral',
      categoria: 1,
      precio_venta: 1500,
      stock_minimo_global: 5
    };

    await expect(productoSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar nombre con menos de 3 caracteres', async () => {
    const invalidData = {
      nombre: 'Pa',
      categoria: 1,
      precio_venta: 1500,
      stock_minimo_global: 5  // Campo requerido
    };

    await expect(productoSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 3/i);
  });

  it('debe rechazar precio de venta cero', async () => {
    const invalidData = {
      nombre: 'Pan Blanco',
      categoria: 1,
      precio_venta: 0,
      stock_minimo_global: 5  // Campo requerido
    };

    await expect(productoSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe rechazar precio de venta negativo', async () => {
    const invalidData = {
      nombre: 'Hallulla',
      categoria: 1,
      precio_venta: -100,
      stock_minimo_global: 5  // Campo requerido
    };

    await expect(productoSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe rechazar stock mínimo negativo', async () => {
    const invalidData = {
      nombre: 'Marraqueta',
      categoria: 1,
      precio_venta: 500,
      stock_minimo_global: -5
    };

    await expect(productoSchema.validate(invalidData)).rejects.toThrow(/Debe ser mayor o igual a 0/i);
  });

  it('debe rechazar categoría vacía', async () => {
    const invalidData = {
      nombre: 'Empanada',
      precio_venta: 1200
    };

    await expect(productoSchema.validate(invalidData)).rejects.toThrow(/obligatorio/i);
  });

  it('debe transformar precio_venta string a number', async () => {
    const data = {
      nombre: 'Completo',
      categoria: 1,
      precio_venta: '2000.50',
      stock_minimo_global: 5
    };

    const result = await productoSchema.validate(data);
    expect(result.precio_venta).toBe(2000.50);
    expect(typeof result.precio_venta).toBe('number');
  });
});

describe('loteSchema', () => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  it('debe validar correctamente un lote válido', async () => {
    const validData = {
      numero_lote: 'LOTE-2025-001',
      fecha_elaboracion: today,
      fecha_caducidad: futureDate,
      precio_costo_unitario: 800,
      stock_inicial: 100
    };

    await expect(loteSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar fecha de caducidad pasada', async () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const invalidData = {
      numero_lote: 'LOTE-2025-002',
      fecha_caducidad: pastDate,
      precio_costo_unitario: 800,
      stock_inicial: 100
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow(/futura/i);
  });

  it('debe rechazar fecha de caducidad anterior a elaboración', async () => {
    const invalidData = {
      numero_lote: 'LOTE-2025-003',
      fecha_elaboracion: futureDate,
      fecha_caducidad: today,  // Anterior a elaboración
      precio_costo_unitario: 800,
      stock_inicial: 100
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow();
  });

  it('debe rechazar precio de costo cero', async () => {
    const invalidData = {
      fecha_caducidad: futureDate,
      precio_costo_unitario: 0,
      stock_inicial: 100
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe rechazar precio de costo negativo', async () => {
    const invalidData = {
      fecha_caducidad: futureDate,
      precio_costo_unitario: -100,
      stock_inicial: 100
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe rechazar stock inicial menor a 1', async () => {
    const invalidData = {
      fecha_caducidad: futureDate,
      precio_costo_unitario: 800,
      stock_inicial: 0
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow(/mayor o igual a 1/i);
  });

  it('debe rechazar stock inicial mayor a 9999', async () => {
    const invalidData = {
      fecha_caducidad: futureDate,
      precio_costo_unitario: 800,
      stock_inicial: 10000
    };

    await expect(loteSchema.validate(invalidData)).rejects.toThrow(/9999/i);
  });

  it('debe transformar precio_costo_unitario string a number', async () => {
    const data = {
      fecha_caducidad: futureDate,
      precio_costo_unitario: '800.50',
      stock_inicial: 100
    };

    const result = await loteSchema.validate(data);
    expect(result.precio_costo_unitario).toBe(800.50);
    expect(typeof result.precio_costo_unitario).toBe('number');
  });
});

describe('empleadoSchema', () => {
  it('debe validar correctamente un empleado válido', async () => {
    const validData = {
      nombre_completo: 'Ana García',
      username: 'ana_garcia',
      password: 'password123',
      password2: 'password123',
      cargo: 'Vendedor'
    };

    await expect(empleadoSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar username con espacios', async () => {
    const invalidData = {
      nombre_completo: 'María López',
      username: 'maria lopez',  // Con espacio
      password: 'password123',
      password2: 'password123',
      cargo: 'Vendedor'
    };

    await expect(empleadoSchema.validate(invalidData)).rejects.toThrow(/espacios/i);
  });

  it('debe rechazar username con menos de 3 caracteres', async () => {
    const invalidData = {
      nombre_completo: 'Pedro González',
      username: 'ab',
      password: 'password123',
      password2: 'password123',
      cargo: 'Vendedor'
    };

    await expect(empleadoSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 3/i);
  });

  it('debe rechazar password con menos de 6 caracteres', async () => {
    const invalidData = {
      nombre_completo: 'Carlos Ruiz',
      username: 'carlos_ruiz',
      password: '12345',
      password2: '12345',
      cargo: 'Vendedor'
    };

    await expect(empleadoSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 6/i);
  });

  it('debe rechazar passwords que no coinciden', async () => {
    const invalidData = {
      nombre_completo: 'Laura Díaz',
      username: 'laura_diaz',
      password: 'password123',
      password2: 'password456',  // No coincide
      cargo: 'Vendedor'
    };

    await expect(empleadoSchema.validate(invalidData)).rejects.toThrow(/coinciden/i);
  });

  it('debe rechazar nombre completo vacío', async () => {
    const invalidData = {
      nombre_completo: '',
      username: 'usuario123',
      password: 'password123',
      password2: 'password123',
      cargo: 'Vendedor'
    };

    // Yup valida min() antes de required(), por lo que devuelve el error de min length primero
    await expect(empleadoSchema.validate(invalidData)).rejects.toThrow(/Debe tener al menos 3/i);
  });
});

describe('pagoSchema', () => {
  it('debe validar correctamente un pago en efectivo válido', async () => {
    const validData = {
      metodo: 'EFE',
      monto: 10000,
      monto_recibido: 15000
    };

    await expect(pagoSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe validar correctamente un pago con tarjeta', async () => {
    const validData = {
      metodo: 'DEB',
      monto: 10000
    };

    await expect(pagoSchema.validate(validData)).resolves.toBeTruthy();
  });

  it('debe rechazar monto cero', async () => {
    const invalidData = {
      metodo: 'EFE',
      monto: 0,
      monto_recibido: 100
    };

    await expect(pagoSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe rechazar monto negativo', async () => {
    const invalidData = {
      metodo: 'EFE',
      monto: -100,
      monto_recibido: 100
    };

    await expect(pagoSchema.validate(invalidData)).rejects.toThrow(/mayor a 0/i);
  });

  it('debe transformar monto string a number', async () => {
    const data = {
      metodo: 'DEB',
      monto: '5000.50'
    };

    const result = await pagoSchema.validate(data);
    expect(result.monto).toBe(5000.50);
    expect(typeof result.monto).toBe('number');
  });
});
