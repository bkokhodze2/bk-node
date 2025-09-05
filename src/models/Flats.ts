import mongoose, {Schema, Document} from 'mongoose';

type Currency = "GEL" | "USD" | "EUR";

export interface IFlatImage {
  _id?: mongoose.Types.ObjectId;
  url: string;
  filename: string;
  size: number;
  contentType: string;
  createdAt?: Date;
  storage?: 'local' | 'firebase' | 'cloudinary';
  localUrl?: string;
  bucket?: string;
  path?: string;
  publicUrl?: string;
  cloudinaryPublicId?: string;
}

export interface Address {
  street: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface IFlat extends Document {
  square: number;
  address: Address;
  price: number;
  currency: Currency;
  images?: IFlatImage[];
}

const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: false },
    state: { type: String, required: false },
    zip: { type: String, required: false },
  },
  { _id: false, id: false }
);

const FlatSchema: Schema = new Schema({
  square: {type: Number, required: true},
  address: { type: AddressSchema, required: true },
  price: {type: Number, required: true},
  currency: {
    type: String,
    required: true,
    enum: ["GEL", "USD", "EUR"],
    default: "GEL"
  },
  images: [
    new Schema(
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        size: { type: Number, required: true },
        contentType: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        storage: { type: String, enum: ['local', 'firebase', 'cloudinary'], default: 'local' },
        localUrl: { type: String },
        bucket: { type: String },
        path: { type: String },
        publicUrl: { type: String },
        cloudinaryPublicId: { type: String },
      },
      { _id: true, id: false }
    )
  ],
});

const Flat = mongoose.model<IFlat>('Flat', FlatSchema);
export default Flat;
