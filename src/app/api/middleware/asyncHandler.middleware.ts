import { Request, Response, NextFunction } from 'express'
import { initLogger } from '../../config/winston'

const logger = initLogger('asyncHandler.middleware.ts')

type AsyncControllerFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>

export const asyncHandler = (fn: AsyncControllerFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export class SuccessResponse {
  constructor(
    public data: any = null,
    public message: string = 'Operation completed successfully',
    public statusCode: number = 200
  ) {}
}

export class DataResponse extends SuccessResponse {
  constructor(data: any, message?: string, statusCode?: number) {
    super(data, message || 'Data retrieved successfully', statusCode)
  }
}

export class CreatedResponse extends SuccessResponse {
  constructor(data: any, message?: string) {
    super(data, message || 'Resource created successfully', 201)
  }
}

export class NoContentResponse extends SuccessResponse {
  constructor(message?: string) {
    super(null, message || 'Operation completed successfully', 204)
  }
}