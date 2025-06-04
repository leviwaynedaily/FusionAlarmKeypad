// Mock Sentry before importing analytics
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

import { analytics } from '@/lib/analytics'
import * as Sentry from '@sentry/nextjs'

// Get the mocked functions
const mockCaptureException = Sentry.captureException as jest.MockedFunction<typeof Sentry.captureException>
const mockCaptureMessage = Sentry.captureMessage as jest.MockedFunction<typeof Sentry.captureMessage>
const mockSetUser = Sentry.setUser as jest.MockedFunction<typeof Sentry.setUser>
const mockAddBreadcrumb = Sentry.addBreadcrumb as jest.MockedFunction<typeof Sentry.addBreadcrumb>

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
    
    // Mock window.gtag
    Object.defineProperty(window, 'gtag', {
      value: jest.fn(),
      writable: true,
    })
  })

  describe('setUserProperties', () => {
    it('sets user properties and sends to Sentry', () => {
      const userProps = {
        userId: 'user123',
        organizationId: 'org456',
        locationId: 'loc789',
      }

      analytics.setUserProperties(userProps)

      expect(mockSetUser).toHaveBeenCalledWith({
        id: 'user123',
        organizationId: 'org456',
        locationId: 'loc789',
      })
    })
  })

  describe('track', () => {
    it('logs events in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
      })
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      analytics.track({
        action: 'test_action',
        category: 'test_category',
        label: 'test_label',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ANALYTICS]',
        expect.objectContaining({
          action: 'test_action',
          category: 'test_category',
          label: 'test_label',
        })
      )

      consoleSpy.mockRestore()
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
      })
    })

    it('sends breadcrumb to Sentry', () => {
      analytics.track({
        action: 'test_action',
        category: 'test_category',
        label: 'test_label',
        value: 42,
      })

      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'user-action',
        message: 'test_category: test_action',
        level: 'info',
        data: {
          label: 'test_label',
          value: 42,
          properties: undefined,
        },
      })
    })

    it('sends to Google Analytics when gtag is available', () => {
      const mockGtag = jest.fn()
      window.gtag = mockGtag

      analytics.track({
        action: 'test_action',
        category: 'test_category',
        label: 'test_label',
        value: 42,
      })

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_action', {
        event_category: 'test_category',
        event_label: 'test_label',
        value: 42,
        custom_properties: undefined,
      })
    })
  })

  describe('trackAuthentication', () => {
    it('tracks successful authentication', () => {
      analytics.trackAuthentication(true, 'pin')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'authentication: login_success',
        })
      )
    })

    it('tracks failed authentication', () => {
      analytics.trackAuthentication(false, 'pin')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'authentication: login_failure',
        })
      )
    })
  })

  describe('trackAreaAction', () => {
    it('tracks area control actions', () => {
      analytics.trackAreaAction('arm', 'area123', 'ARMED_AWAY')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'security: area_control',
          data: expect.objectContaining({
            properties: {
              areaId: 'area123',
              armedState: 'ARMED_AWAY',
              action: 'arm',
            },
          }),
        })
      )
    })
  })

  describe('trackError', () => {
    it('tracks error events', () => {
      const testError = new Error('Test error')
      
      analytics.trackError(testError, 'test_context')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'errors: error_occurred',
          data: expect.objectContaining({
            properties: {
              error: 'Test error',
              stack: testError.stack,
              context: 'test_context',
            },
          }),
        })
      )
    })
  })

  describe('trackPageView', () => {
    it('tracks page views', () => {
      analytics.trackPageView('/dashboard')

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'navigation: page_view',
          data: expect.objectContaining({
            properties: expect.objectContaining({
              page: '/dashboard',
            }),
          }),
        })
      )
    })
  })
}) 