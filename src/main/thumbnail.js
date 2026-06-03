"use strict";
import electron from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const fsp = fs.promises;

const THUMB_SIZE = 160;
const THUMB_QUALITY = "good";
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]; // .svg 被剔除（XSS / nativeImage 解析不一致）
let thumbCacheDir = null;

async function ensureCacheDir() {
  if (!thumbCacheDir) {
    thumbCacheDir = path.join(electron.app.getPath("userData"), "thumbnail_cache");
  }
  await fsp.mkdir(thumbCacheDir, { recursive: true });
  return thumbCacheDir;
}

// 缓存键：path + mtimeMs + size。源文件被替换 mtime 变 → 自动失效旧缩略图。
async function getThumbPath(originalPath, st) {
  const stat = st || await fsp.stat(originalPath);
  const key = `${originalPath}|${stat.mtimeMs}|${stat.size}`;
  const hash = crypto.createHash("md5").update(key).digest("hex");
  const dir = await ensureCacheDir();
  return path.join(dir, `${hash}.jpg`);
}

async function _exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function generateThumbnail(originalPath, size = THUMB_SIZE) {
  try {
    if (!originalPath) return { success: false, error: "文件不存在" };
    let stat;
    try {
      stat = await fsp.stat(originalPath);
    } catch {
      return { success: false, error: "文件不存在" };
    }
    const ext = path.extname(originalPath).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) {
      return { success: false, error: "不是图片文件" };
    }
    const thumbPath = await getThumbPath(originalPath, stat);
    if (await _exists(thumbPath)) {
      return { success: true, thumbPath };
    }
    const img = electron.nativeImage.createFromPath(originalPath);
    if (img.isEmpty()) {
      return { success: false, error: "无法读取图片" };
    }
    const { width, height } = img.getSize();
    let newW, newH;
    if (width <= size && height <= size) {
      return { success: true, thumbPath: originalPath };
    } else if (width < height) {
      newW = size;
      newH = Math.round(height / width * size);
    } else {
      newH = size;
      newW = Math.round(width / height * size);
    }
    const resized = img.resize({ width: newW, height: newH, quality: THUMB_QUALITY });
    const jpegBuffer = resized.toJPEG(75);
    await fsp.writeFile(thumbPath, jpegBuffer);
    return { success: true, thumbPath };
  } catch (err) {
    console.error("[ThumbnailService] Error:", err);
    return { success: false, error: err.message };
  }
}

export { THUMB_SIZE, ensureCacheDir, getThumbPath, generateThumbnail };
