import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  age: number;
  _id: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  address: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  flats?: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>(
  {
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 150,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /[^@\s]+@[^@\s]+\.[^@\s]+/,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    flats: [{
      type: Schema.Types.ObjectId,
      ref: 'Flat',
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        Reflect.deleteProperty(ret as any, 'password');
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        Reflect.deleteProperty(ret as any, 'password');
        return ret;
      },
    },
  }
);

UserSchema.index({ email: 1 }, { unique: true });

// Hash password before saving when modified
UserSchema.pre('save', async function (next) {
  const user = this as typeof this & { isModified: (path?: string) => boolean };
  if (user.isModified('password')) {
    const saltRounds = 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
  next();
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
