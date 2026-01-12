import { Application, Request, Response } from 'express'

import resumeRoutes from './resume.route'
import questionRoutes from './question.route'
import userRoutes from './user.route'
import authRoutes from './auth.route'
import generationRoutes from './generation.route'

const routes = (app: Application): void => {
  app.get('/', health)

  app.use('/api/auth', authRoutes)
  app.use('/api/resume', resumeRoutes)
  app.use('/api/questions', questionRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/generation', generationRoutes)
}

const health = (_: Request, res: Response): Response => {
  return res.status(200).json({ status: true, message: 'Roman AI Interview Assistant - up and running' })
}

export { routes }