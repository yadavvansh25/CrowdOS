import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 9999, // keep the same port as before if any
  },
  test: {
    environment: 'jsdom', // for DOM testing
    globals: true,
  }
});
