import mongoose, {Schema, Document} from 'mongoose';

export interface IInfoCardDetail {
  infoCardDetailId?: number;
  infoCardId?: number;
  languageId?: number;
  title?: string;
  subTitle?: string;
  status?: boolean;
}

export interface IInfoCard extends Document {
  infoCardId: number;
  status?: boolean;
  imageData?: any;
  categoryIdList?: number[];
  details?: IInfoCardDetail[];
  createdAt?: Date;
  updatedAt?: Date;
}

const InfoCardDetailSchema = new Schema<IInfoCardDetail>({
  infoCardDetailId: {type: Number},
  infoCardId: {type: Number},
  languageId: {type: Number},
  title: {type: String},
  subTitle: {type: String},
  status: {type: Boolean, default: true},
});

const InfoCardSchema = new Schema<IInfoCard>({
  infoCardId: {type: Number, required: true, unique: true},
  status: {type: Boolean, default: true},
  imageData: {type: Schema.Types.Mixed},
  categoryIdList: [{type: Number}],
  details: [InfoCardDetailSchema],
}, {timestamps: true});

export default mongoose.model<IInfoCard>('InfoCard', InfoCardSchema);

