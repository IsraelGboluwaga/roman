import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  googleId: z.string().min(1, 'Google ID is required'),
  tempUserId: z.string().optional()
})

export const getUserSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const addResumeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fileUrl: z.string().url('Invalid file URL'),
  title: z.string().max(200, 'Title must be 200 characters or less').optional(),
  setAsActive: z.boolean().optional()
})

export const getResumeSchema = z.object({
  id: z.string().min(1, 'Resume ID is required')
})

export const generateResumeSchema = z.object({
  resumeId: z.string().min(1, 'Resume ID is required'),
  jobDescription: z.string()
    .min(10, 'Job description must be at least 10 characters')
    .max(10000, 'Job description must be 10000 characters or less'),
  format: z.enum(['pdf', 'docx']).optional()
})

export const getActiveResumeSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
})

export const getAllResumesSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
})

export const setActiveResumeSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required')
  }),
  params: z.object({
    id: z.string().min(1, 'Resume ID is required')
  })
})

export const deleteResumeSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required')
  }),
  params: z.object({
    id: z.string().min(1, 'Resume ID is required')
  })
})

export const legacyGenerateResumeSchema = z.object({
  jobDescription: z.string()
    .min(10, 'Job description must be at least 10 characters')
    .max(10000, 'Job description must be 10000 characters or less'),
  userId: z.string().min(1, 'User ID is required').optional()
})

export const googleOAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  tempUserId: z.string().optional()
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address')
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type GetUserInput = z.infer<typeof getUserSchema>
export type AddResumeInput = z.infer<typeof addResumeSchema>
export type GetResumeInput = z.infer<typeof getResumeSchema>
export type GenerateResumeInput = z.infer<typeof generateResumeSchema>
export type GetActiveResumeInput = z.infer<typeof getActiveResumeSchema>
export type GetAllResumesInput = z.infer<typeof getAllResumesSchema>
export type SetActiveResumeInput = z.infer<typeof setActiveResumeSchema>
export type DeleteResumeInput = z.infer<typeof deleteResumeSchema>
export type LegacyGenerateResumeInput = z.infer<typeof legacyGenerateResumeSchema>
export type GoogleOAuthInput = z.infer<typeof googleOAuthSchema>
export type LoginInput = z.infer<typeof loginSchema>