import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IUserOnly {
  email: string
  userId: string
  googleId?: string
  migratedFromTempId?: string
}

export interface IUser extends Document, IUserOnly {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  migratedFromTempId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

export const User = mongoose.model<IUser>('User', UserSchema)
