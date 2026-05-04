import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Gộp tất cả CSS thành 1 file duy nhất
    cssCodeSplit: false,
    // Base64 toàn bộ hình ảnh/assets nhỏ để không sinh ra thêm file bên ngoài
    assetsInlineLimit: 100000000, 
    rollupOptions: {
      output: {
        // Hủy việc chia nhỏ các thư viện thành các file riêng
        manualChunks: undefined,
        // Ép toàn bộ JS kể cả lazy load vào chung 1 file
        inlineDynamicImports: true,
      },
    },
  }
})
