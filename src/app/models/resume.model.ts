import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IResumeOnly {
  userId: string
  active: boolean
  fileUrl: string
  title?: string
  blobId?: string
  parsedText?: string
  structuredData?: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: string[]
    education?: string[]
    [key: string]: any
  }
}

export interface IResume extends Document, IResumeOnly {
  _id: Types.ObjectId
  created: Date
  modified: Date
}

const ResumeSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  active: {
    type: Boolean,
    required: true,
    default: false
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  blobId: {
    type: String,
    trim: true
  },
  parsedText: {
    type: String,
    trim: true
  },
  structuredData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
})

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema)