import { JWTUtil } from '../jwt.util'

jest.mock('../../config/winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

describe('JWTUtil', () => {
  const mockUserData = {
    userId: 'user_123',
    email: 'test@example.com',
    googleId: 'google_123'
  }

  beforeEach(() => {
    // Set a valid JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-at-least-32-characters-long'
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = JWTUtil.generateToken(mockUserData)
      
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate token with custom expiration', () => {
      const token = JWTUtil.generateToken(mockUserData, '1h')
      
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET
      
      expect(() => {
        JWTUtil.generateToken(mockUserData)
      }).toThrow('Token generation failed')
    })

    it('should throw error when JWT_SECRET is empty', () => {
      process.env.JWT_SECRET = ''
      
      expect(() => {
        JWTUtil.generateToken(mockUserData)
      }).toThrow('Token generation failed')
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = JWTUtil.generateToken(mockUserData)
      const decoded = JWTUtil.verifyToken(token)
      
      expect(decoded.userId).toBe(mockUserData.userId)
      expect(decoded.email).toBe(mockUserData.email)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtil.verifyToken('invalid.token.here')
      }).toThrow('Invalid token')
    })

    it('should throw error for expired token', () => {
      // Generate token that expires immediately
      const token = JWTUtil.generateToken(mockUserData, '-1s')
      
      expect(() => {
        JWTUtil.verifyToken(token)
      }).toThrow('Token has expired')
    })

    it('should throw error for malformed token', () => {
      expect(() => {
        JWTUtil.verifyToken('not.a.valid.jwt.format')
      }).toThrow('Invalid token')
    })
  })

  describe('refreshToken', () => {
    it('should return original token if not close to expiry', () => {
      const originalToken = JWTUtil.generateToken(mockUserData, '7d')
      const refreshedToken = JWTUtil.refreshToken(originalToken)
      
      expect(refreshedToken).toBe(originalToken)
    })

    it('should generate new token if close to expiry', () => {
      // Generate token that expires in 1 hour (close to expiry threshold)
      const originalToken = JWTUtil.generateToken(mockUserData, '1h')
      const refreshedToken = JWTUtil.refreshToken(originalToken)
      
      expect(refreshedToken).not.toBe(originalToken)
      expect(typeof refreshedToken).toBe('string')
      expect(refreshedToken.split('.')).toHaveLength(3)
    })

    it('should throw error for invalid token during refresh', () => {
      expect(() => {
        JWTUtil.refreshToken('invalid.token')
      }).toThrow('Token refresh failed')
    })
  })

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'valid.jwt.token'
      const authHeader = `Bearer ${token}`
      
      const extracted = JWTUtil.extractTokenFromHeader(authHeader)
      
      expect(extracted).toBe(token)
    })

    it('should throw error for missing Authorization header', () => {
      expect(() => {
        JWTUtil.extractTokenFromHeader('')
      }).toThrow('Authorization header missing')
    })

    it('should throw error for invalid Authorization header format', () => {
      expect(() => {
        JWTUtil.extractTokenFromHeader('InvalidFormat token')
      }).toThrow('Invalid authorization header format')
    })

    it('should throw error for missing Bearer prefix', () => {
      expect(() => {
        JWTUtil.extractTokenFromHeader('token.without.bearer')
      }).toThrow('Invalid authorization header format')
    })

    it('should throw error for missing token part', () => {
      expect(() => {
        JWTUtil.extractTokenFromHeader('Bearer')
      }).toThrow('Invalid authorization header format')
    })
  })
})