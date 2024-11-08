import {rmSync} from 'fs'
import path from 'path'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

export default defineConfig(({command}) => {
  // 清理旧的 Electron 构建目录
  rmSync('dist-electron', {recursive: true, force: true})

  // 判断当前命令是 serve 还是 build，用于配置开发与构建行为
  const isServe = command === 'serve'
  const isBuild = command === 'build'
  // 开发模式或 VSCode 调试环境下开启 sourcemap
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    // 设置路径别名 '@' 指向项目的 src 目录
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src')
      },
    },
    plugins: [
      // React 插件，用于处理 React 文件
      react(),
      // Electron 插件配置
      electron({
        main: {
          entry: 'electron/main/index.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log('[startup] Electron App')
            } else {
              args.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'build/dist-electron/main',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        preload: {
          // 预加载脚本的入口文件
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined,
              minify: isBuild,
              outDir: 'build/dist-electron/preload',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        renderer: {},
      }),
    ],
    build: {
      outDir: 'build/dist', // 设置输出目录为 build/dist
    },
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
      return {
        host: url.hostname,
        port: +url.port,
      }
    })(),
    clearScreen: true,
  }
})
