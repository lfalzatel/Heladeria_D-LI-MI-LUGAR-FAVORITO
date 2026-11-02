import { defineConfig } from 'vitest/config';

// Pruebas unitarias de los cálculos (no necesitan Firebase ni Java): npm test
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
