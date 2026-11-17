/**
 * Genera los recursos de ícono y splash de Android a partir del logo maestro.
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'Icono', 'Icono de la app FinPoliza.png')
const res = path.join(root, 'android', 'app', 'src', 'main', 'res')

const legacySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const foregroundSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }

async function main() {
  await fs.access(source)
  for (const [density, size] of Object.entries(legacySizes)) {
    const dir = path.join(res, `mipmap-${density}`)
    await fs.mkdir(dir, { recursive: true })
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await sharp(source).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, name))
    }
  }

  for (const [density, size] of Object.entries(foregroundSizes)) {
    const dir = path.join(res, `mipmap-${density}`)
    await fs.mkdir(dir, { recursive: true })
    const inner = Math.round(size * 0.68)
    const logo = await sharp(source).resize(inner, inner, { fit: 'contain' }).png().toBuffer()
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'))
  }

  // Splash: fondo negro con el logo centrado.
  const splashDirs = (await fs.readdir(res)).filter((name) => name.startsWith('drawable'))
  for (const dirName of splashDirs) {
    const dir = path.join(res, dirName)
    const stat = await fs.stat(dir).catch(() => null)
    if (!stat?.isDirectory()) continue
    const hasSplash = await fs.access(path.join(dir, 'splash.png')).then(() => true).catch(() => false)
    if (!hasSplash) continue
    const size = 2000
    const logoSize = 520
    const logo = await sharp(source).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer()
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'splash.png'))
  }

  console.log('Íconos y splash generados correctamente.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
