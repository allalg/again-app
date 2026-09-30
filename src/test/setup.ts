import '@testing-library/jest-dom'

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock Notification API for jsdom
if (typeof window !== 'undefined') {
  (window as any).Notification = class MockNotification {
    static permission = 'default'
    static requestPermission = async () => 'granted'
    title: string
    options: any
    constructor(title: string, options: any) {
      this.title = title
      this.options = options
    }
  }
}
