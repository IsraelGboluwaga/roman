import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGeneratedResumeOnly {
  userId: string
  type: 'temporary' | 'permanent'
  url: string
  jobDescription?: string
  generatedFrom?: Types.ObjectId
}

export interface IGeneratedResume extends Document, IGeneratedResumeOnly {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const GeneratedResumeSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['temporary', 'permanent'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    trim: true
  },
  generatedFrom: {
    type: Schema.Types.ObjectId,
    ref: 'Resume'
  }
}, {
  timestamps: true,
  collection: 'generated_resumes' // Explicit collection name as requested
})

// Index for efficient queries
GeneratedResumeSchema.index({ userId: 1, type: 1 })
GeneratedResumeSchema.index({ createdAt: -1 })

export const GeneratedResume = mongoose.model<IGeneratedResume>('GeneratedResume', GeneratedResumeSchema)