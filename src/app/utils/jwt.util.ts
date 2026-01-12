import jwt, { SignOptions } from 'jsonwebtoken'
import { initLogger } from '../config/winston'

const logger = initLogger('jwt.util.ts')

export interface TokenPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

export interface UserTokenData {
  userId: string
  email: string
  googleId?: string
}

export class JWTUtil {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET
    
    if (!secret || secret.trim() === '') {
      logger.error('JWT_SECRET environment variable is missing or empty')
      throw new Error('JWT configuration error. Please contact support.')
    }
    
    if (secret.length < 32) {
      logger.warn('JWT_SECRET should be at least 32 characters for security')
    }
    
    return secret.trim()
  }
  
  static generateToken(userData: UserTokenData, expiresIn: string = '7d'): string {
    try {
      const payload = {
        userId: userData.userId,
        email: userData.email
      }
      
      const options: SignOptions = {
        expiresIn: expiresIn as any,
        issuer: 'roman-resume-api',
        audience: 'roman-resume-client'
      }
      
      const token = jwt.sign(payload, this.getSecret(), options)
      
      logger.info(`JWT token generated for user: ${userData.email}`)
      return token
      
    } catch (error) {
      logger.error(`Error generating JWT token: ${error}`)
      throw new Error('Token generation failed')
    }
  }
  
  static verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret(), {
        issuer: 'roman-resume-api',
        audience: 'roman-resume-client'
      }) as TokenPayload
      
      logger.debug(`JWT token verified for user: ${decoded.email}`)
      return decoded
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('JWT token has expired')
        throw new Error('Token has expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn(`Invalid JWT token: ${error.message}`)
        throw new Error('Invalid token')
      } else if (error instanceof jwt.NotBeforeError) {
        logger.warn('JWT token not active yet')
        throw new Error('Token not active')
      } else {
        logger.error(`JWT verification error: ${error}`)
        throw new Error('Token verification failed')
      }
    }
  }
  
  static refreshToken(token: string, expiresIn: string = '7d'): string {
    try {
      const decoded = this.verifyToken(token)
      
      // Check if token is close to expiry (within 1 day)
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = decoded.exp - now
      const oneDayInSeconds = 24 * 60 * 60
      
      if (timeUntilExpiry > oneDayInSeconds) {
        logger.debug('Token refresh not needed, returning original token')
        return token
      }
      
      const newToken = this.generateToken({
        userId: decoded.userId,
        email: decoded.email
      }, expiresIn)
      
      logger.info(`JWT token refreshed for user: ${decoded.email}`)
      return newToken
      
    } catch (error) {
      logger.error(`Error refreshing JWT token: ${error}`)
      throw new Error('Token refresh failed')
    }
  }
  
  static extractTokenFromHeader(authHeader: string): string {
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }
    
    const parts = authHeader.split(' ')
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format. Expected: Bearer <token>')
    }
    
    return parts[1]
  }
}