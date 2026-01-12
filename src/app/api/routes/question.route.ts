import { Router } from 'express'
import { handleExtractQuestions, handleGetQuestions } from '../controllers'
import { asyncHandler, successHandler } from '../middleware'

const app = Router()

app.post('/extract', asyncHandler(handleExtractQuestions), successHandler)

app.get('/', asyncHandler(handleGetQuestions), successHandler)

export default app