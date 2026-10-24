import '@testing-library/jest-dom/vitest'

globalThis.ResizeObserver = class {
  disconnect() {}

  observe() {}

  unobserve() {}
}
