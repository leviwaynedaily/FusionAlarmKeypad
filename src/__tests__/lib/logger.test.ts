// Mock Sentry before importing logger
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

// Get the mocked functions
const mockCaptureException = Sentry.captureException as jest.MockedFunction<typeof Sentry.captureException>
const mockCaptureMessage = Sentry.captureMessage as jest.MockedFunction<typeof Sentry.captureMessage>
const mockAddBreadcrumb = Sentry.addBreadcrumb as jest.MockedFunction<typeof Sentry.addBreadcrumb>

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'info').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('error', () => {
    it('always logs to console', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      const testError = new Error('Test error')
      
      logger.error('Test message', testError)
      
      expect(consoleSpy).toHaveBeenCalledWith('Test message', testError)
    })

    it('sends to Sentry', () => {
      const testError = new Error('Test error')
      
      logger.error('Test message', testError, { context: 'test' })
      
      expect(mockCaptureException).toHaveBeenCalledWith(testError, {
        tags: {
          component: 'fusion-alarm',
          level: 'error'
        },
        extra: {
          message: 'Test message',
          context: 'test'
        }
      })
    })

    it('creates error when none provided', () => {
      logger.error('Test message without error')
      
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            message: 'Test message without error'
          })
        })
      )
    })
  })

  describe('security', () => {
    it('logs security events to console', () => {
      const consoleSpy = jest.spyOn(console, 'warn')
      
      logger.security('Security test', { userId: '123' })
      
      expect(consoleSpy).toHaveBeenCalledWith('[SECURITY] Security test', { userId: '123' })
    })

    it('sends security events to Sentry', () => {
      logger.security('Security test', { userId: '123' })
      
      expect(mockCaptureMessage).toHaveBeenCalledWith('Security Event: Security test', {
        level: 'warning',
        tags: {
          component: 'fusion-alarm',
          category: 'security'
        },
        extra: { userId: '123' }
      })
    })
  })

  describe('performance', () => {
    it('logs performance metrics in development', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
      })
      
      const consoleSpy = jest.spyOn(console, 'log')
      
      logger.performance('test-operation', 150, { component: 'test' })
      
      expect(consoleSpy).toHaveBeenCalledWith('[PERF] test-operation: 150ms', { component: 'test' })
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
      })
    })

    it('sends breadcrumb to Sentry', () => {
      logger.performance('test-operation', 150, { component: 'test' })
      
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'performance',
        message: 'test-operation took 150ms',
        level: 'info',
        data: { component: 'test' }
      })
    })
  })

  describe('basic logging', () => {
    it('has log, warn, and info methods', () => {
      expect(typeof logger.log).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.info).toBe('function')
    })
  })

  describe('warn', () => {
    it('logs warnings to console in development', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
      })
      
      const warnSpy = jest.spyOn(console, 'warn')
      
      logger.warn('Test warning')
      
      expect(warnSpy).toHaveBeenCalledWith('Test warning')
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
      })
    })
  })
}) 