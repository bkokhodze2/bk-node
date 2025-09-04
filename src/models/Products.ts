import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  price: number;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductsSchema = new Schema<IProduct>(
  {
    price: {
      type: Number,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: false,
      unique: false,
    },
  },
  {
    timestamps: true,
  }
);

const Products: Model<IProduct> = mongoose.models.Products || mongoose.model<IProduct>('Products', ProductsSchema);

export default Products;

