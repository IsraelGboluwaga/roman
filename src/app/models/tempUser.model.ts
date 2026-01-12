import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ITempUserOnly {
  tempUserId: string
  sessionData?: any
  expiry: Date
}

export interface ITempUser extends Document, ITempUserOnly {
  _id: Types.ObjectId
  created: Date
  modified: Date
}

const TempUserSchema: Schema = new Schema({
  tempUserId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sessionData: {
    type: Schema.Types.Mixed
  },
  expiry: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    expires: 0 // TTL index - MongoDB will automatically delete documents when expiry is reached
  }
}, {
  timestamps: true
})

export const TempUser = mongoose.model<ITempUser>('TempUser', TempUserSchema)