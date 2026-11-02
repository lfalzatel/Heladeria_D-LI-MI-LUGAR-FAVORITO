import { defineConfig } from 'vitest/config';

// Configuración aparte de vite.config.ts: las pruebas de reglas corren en Node contra el emulador de Firestore
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore.rules.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
