import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserFlat extends Document {
  userId: Types.ObjectId;
  flatId: Types.ObjectId;
}

const UserFlatSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true }
});

const UserFlat = mongoose.model<IUserFlat>('UserFlat', UserFlatSchema);
export default UserFlat;

