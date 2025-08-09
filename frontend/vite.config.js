import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    jsc: {
      transform: {
        react: {
          throwIfNamespace: false, // Permite namespaces en JSX
        }
      }
    }
  })],
  server: {
    port: 3000, // Mismo puerto que usaba CRA
  },
})