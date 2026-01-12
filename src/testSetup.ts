import { jest } from '@jest/globals'

// Mock winston logger
jest.mock('./app/config/winston', () => ({
  initLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))
