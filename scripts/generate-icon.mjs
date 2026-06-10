// 把 build/icon.svg 渲染成各种尺寸的 PNG，再合成 Windows 用的 build/icon.ico。
// 用法：node scripts/generate-icon.mjs

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const buildDir = path.join(root, 'build')
const svgPath = path.join(buildDir, 'icon.svg')

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const MAIN_PNG_SIZE = 1024 // electron-builder 也会用这个生成 Linux / 跨平台图标

async function svgToPng(svgBuffer, size) {
  return await sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function main() {
  const svg = await readFile(svgPath)
  console.log(`[icon] 源文件: ${svgPath} (${svg.length} bytes)`)

  // 主 PNG：1024×1024
  const mainPng = await svgToPng(svg, MAIN_PNG_SIZE)
  await writeFile(path.join(buildDir, 'icon.png'), mainPng)
  console.log(`[icon] 写出 build/icon.png (${MAIN_PNG_SIZE}×${MAIN_PNG_SIZE}, ${mainPng.length} bytes)`)

  // ICO 用的多尺寸 PNG
  const icoBuffers = []
  for (const size of ICO_SIZES) {
    const buf = await svgToPng(svg, size)
    icoBuffers.push(buf)
    console.log(`[icon] 渲染 ${size}×${size} (${buf.length} bytes)`)
  }

  const ico = await pngToIco(icoBuffers)
  await writeFile(path.join(buildDir, 'icon.ico'), ico)
  console.log(`[icon] 写出 build/icon.ico (${ico.length} bytes)`)
  console.log('[icon] 完成 ✓')
}

main().catch((err) => {
  console.error('[icon] 失败:', err)
  process.exit(1)
})
