import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration for QuickTable restaurant management system
 * 
 * This configuration sets up the development and build environment for the React application.
 * Uses the React plugin for JSX support and hot module replacement.
 * 
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react()], // React plugin for JSX and HMR support
})
