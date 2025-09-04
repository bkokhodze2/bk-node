import mongoose, {Schema, Document} from 'mongoose';

type Currency = "GEL" | "USD" | "EUR";

export interface IFlatImage {
  _id?: mongoose.Types.ObjectId;
  url: string; // primary URL to use in clients (remote if available, else local)
  filename: string;
  size: number;
  contentType: string;
  createdAt?: Date;
  // storage metadata
  storage?: 'local' | 'firebase';
  localUrl?: string; // /uploads/<file>
  bucket?: string;   // firebase bucket
  path?: string;     // object path in bucket
  publicUrl?: string; // firebase public/signed URL
}

export interface IFlat extends Document {
  square: number;
  location: string;
  price: number;
  currency: Currency;
  images?: IFlatImage[];
}

const FlatSchema: Schema = new Schema({
  square: {type: Number, required: true},
  location: {type: String, required: true},
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
        storage: { type: String, enum: ['local', 'firebase'], default: 'local' },
        localUrl: { type: String },
        bucket: { type: String },
        path: { type: String },
        publicUrl: { type: String },
      },
      { _id: true, id: false }
    )
  ],
});

const Flat = mongoose.model<IFlat>('Flat', FlatSchema);
export default Flat;
