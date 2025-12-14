// Setup para pruebas con Vitest
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Limpieza después de cada test
afterEach(() => {
  cleanup();
});
