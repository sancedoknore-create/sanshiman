// Polyfills for vitest + jsdom test environment.
// jsdom 29 dropped built-in Storage, so install a minimal in-memory polyfill
// on both window and globalThis so tests and code-under-test can use
// `localStorage` directly.
class MemoryStorage {
  constructor() {
    this._data = new Map()
  }
  get length() {
    return this._data.size
  }
  clear() {
    this._data.clear()
  }
  getItem(key) {
    return this._data.has(String(key)) ? this._data.get(String(key)) : null
  }
  setItem(key, value) {
    this._data.set(String(key), String(value))
  }
  removeItem(key) {
    this._data.delete(String(key))
  }
  key(index) {
    return Array.from(this._data.keys())[index] ?? null
  }
}

if (typeof window !== 'undefined' && !window.localStorage) {
  const ls = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    enumerable: true,
    get: () => ls,
  })
}
if (typeof window !== 'undefined' && !window.sessionStorage) {
  const ss = new MemoryStorage()
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    enumerable: true,
    get: () => ss,
  })
}
if (typeof globalThis.localStorage === 'undefined' && typeof window !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    get: () => window.localStorage,
  })
}
if (typeof globalThis.sessionStorage === 'undefined' && typeof window !== 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    enumerable: true,
    get: () => window.sessionStorage,
  })
}
