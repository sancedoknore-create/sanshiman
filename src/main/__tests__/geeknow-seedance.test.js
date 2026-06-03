import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SRC = readFileSync(resolve(__dirname, '../index.js'), 'utf8')
const RENDERER = readFileSync(resolve(__dirname, '../../../out/renderer/assets/index-BujjGe6O.js'), 'utf8')

describe('GeekNow Seedance 2.0 Pro integration', () => {
  describe('renderer preset', () => {
    it('exposes GeekNow Seedance 2.0 Pro as a video API preset', () => {
      expect(RENDERER).toMatch(/id:"geeknow-seedance-2-pro"/)
      expect(RENDERER).toMatch(/provider:"Seedance 2\.0 Pro \(GeekNow\)"/)
      expect(RENDERER).toMatch(/modelName:"seedance-2\.0-pro"/)
      expect(RENDERER).toMatch(/url:"https:\/\/api\.geeknow\.ai"/)
      expect(RENDERER).toMatch(/id:"geeknow-seedance-2-pro"[^}]*durations:\["5s","8s","11s","15s"\]/)
    })

    it('builds the runtime API config map from defaults before persisted configs', () => {
      expect(RENDERER).toMatch(/const ce=new Map;return\(c0\|\|\[\]\)\.forEach\(Ve=>ce\.set\(Ve\.id,Ve\)\),\(C\|\|\[\]\)\.forEach\(Ve=>ce\.set\(Ve\.id,Ve\)\),ce\},\[C\]\)/)
    })

    it('shows GeekNow Seedance 2.0 Pro in the model settings Video tab', () => {
      expect(RENDERER).not.toMatch(/d0=\[[^\]]*"geeknow-seedance-2-pro"/)
    })

    it('auto-injects GeekNow Seedance 2.0 Pro for existing users', () => {
      expect(RENDERER).toMatch(/!o\.some\(v=>v\.id==="geeknow-seedance-2-pro"\)/)
    })
  })

  describe('main process request handling', () => {
    it('detects GeekNow API hosts', () => {
      expect(SRC).toMatch(/_isGeekNow\s*=\s*rootUrl\.includes\("geeknow\.ai"\)\s*\|\|\s*rootUrl\.includes\("api\.geeknow\.ai"\)/)
    })

    it('normalizes GeekNow base URL from saved endpoint paths before submitting', () => {
      expect(SRC).toMatch(/if \(_isGeekNow\) \{\s*rootUrl = rootUrl\.replace\(\/\\\/v1\\\/videos\\\/generations\$\/, ""\)\.replace\(\/\\\/v1\\\/videos\$\/, ""\)/)
    })

    it('uses GeekNow Seedance 2.0 Pro JSON protocol', () => {
      expect(SRC).toMatch(/sd2_manxue_720p/)
      expect(SRC).toMatch(/`\$\{rootUrl\}\/v1\/videos`/)
      expect(SRC).toMatch(/reference_image_urls/)
      expect(SRC).toMatch(/first_frame_url/)
      expect(SRC).toMatch(/last_frame_url/)
    })

    it('normalizes sanshiman local image URLs before Volcano Ark Seedance content submission', () => {
      expect(SRC).toMatch(/const normalizedImgSrc = this\.resolveLocalPath\(imgSrc\)/)
      expect(SRC).toMatch(/this\.getBase64FromLocalAsync\(normalizedImgSrc\)/)
      expect(SRC).toMatch(/this\._uploadImageToProxy\(normalizedImgSrc, cleanApiKey\)/)
    })

    it('uploads local references through GeekNow presign and createMedia flow', () => {
      expect(SRC).toMatch(/\/api\/upload\/presign/)
      expect(SRC).toMatch(/api\.geeknow\.top\/api\/asset\/createMedia/)
    })
  })
})
