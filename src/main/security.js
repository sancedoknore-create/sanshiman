// 安全工具：参数校验 / 编码。所有函数都是纯函数，无副作用，可独立测试。
import path from 'path'

const DEFAULT_FILE_EXT_WHITELIST = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
  '.mp4', '.webm', '.mov',
]

const PRIVATE_IPV4_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/
const LOOPBACK_HOSTS = new Set(['localhost', '::1', '[::1]'])

export function assertSafeRelativePath(rel, root) {
  if (typeof rel !== 'string' || rel.length === 0) {
    throw new Error('invalid path: must be non-empty string')
  }
  if (rel.includes('\0')) {
    throw new Error('invalid path: null byte')
  }
  if (path.isAbsolute(rel) || /^[a-zA-Z]:[\\/]/.test(rel)) {
    throw new Error('invalid path: absolute path not allowed')
  }
  const absRoot = path.resolve(root)
  const joined = path.resolve(absRoot, rel)
  const rootWithSep = absRoot.endsWith(path.sep) ? absRoot : absRoot + path.sep
  if (joined !== absRoot && !joined.startsWith(rootWithSep)) {
    throw new Error(`path traversal: ${rel} resolves outside allowed root ${absRoot}`)
  }
  return joined
}

export function assertSafeAbsolutePath(abs, allowedRoots) {
  if (typeof abs !== 'string' || abs.length === 0) {
    throw new Error('invalid path: must be non-empty string')
  }
  if (abs.includes('\0')) {
    throw new Error('invalid path: null byte')
  }
  if (!path.isAbsolute(abs)) {
    throw new Error('invalid path: not absolute, outside allowed roots')
  }
  const resolved = path.resolve(abs)
  for (const root of allowedRoots) {
    const r = path.resolve(root)
    const rWithSep = r.endsWith(path.sep) ? r : r + path.sep
    if (resolved === r || resolved.startsWith(rWithSep)) {
      return resolved
    }
  }
  throw new Error(`path is outside allowed roots: ${resolved}`)
}

export function assertSafeDownloadUrl(input, opts = {}) {
  const { allowHttp = false, allowPrivate = false } = opts
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('invalid url: must be non-empty string')
  }
  let u
  try {
    u = new URL(input)
  } catch {
    throw new Error(`invalid url: ${input}`)
  }
  const proto = u.protocol.toLowerCase()
  if (proto === 'https:' || (allowHttp && proto === 'http:')) {
    // ok
  } else {
    throw new Error(`invalid url: protocol ${proto} not allowed`)
  }
  if (!allowPrivate) {
    const host = u.hostname.toLowerCase()
    const stripped = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
    if (LOOPBACK_HOSTS.has(host) || LOOPBACK_HOSTS.has(stripped) || PRIVATE_IPV4_RE.test(host)) {
      throw new Error(`invalid url: private/loopback host blocked (SSRF): ${host}`)
    }
  }
  return input
}

export function assertSafeFileExt(ext, whitelist = DEFAULT_FILE_EXT_WHITELIST) {
  if (typeof ext !== 'string' || ext.length === 0) {
    throw new Error('invalid extension: must be non-empty string')
  }
  const norm = (ext.startsWith('.') ? ext : '.' + ext).toLowerCase()
  // 双扩展名禁止：除前导 . 外不应再含 .
  if (norm.lastIndexOf('.') !== 0) {
    throw new Error(`invalid extension: double extension not allowed: ${ext}`)
  }
  if (!whitelist.includes(norm)) {
    throw new Error(`invalid extension: ${norm} not in whitelist`)
  }
  return norm
}

export function encodePowershellCommand(script) {
  if (typeof script !== 'string') {
    throw new Error('script must be a string')
  }
  // PowerShell -EncodedCommand 期望 UTF-16LE base64
  const b64 = Buffer.from(script, 'utf16le').toString('base64')
  return {
    exe: 'powershell.exe',
    args: ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', b64],
  }
}
