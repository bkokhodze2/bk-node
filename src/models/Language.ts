import mongoose, {Schema, Document} from 'mongoose';


// Define enums as proper TypeScript enums and constant arrays for Mongoose
export enum EnumLanguageIds {
  GEORGIAN = 1,
  ENGLISH = 2,
  RUSSIAN = 3
}

export enum EnumLanguageLabels {
  GEORGIAN = 'ka',
  ENGLISH = 'en',
  RUSSIAN = 'ru'
}

export enum EnumLanguages {
  GEORGIAN = 'Georgian',
  ENGLISH = 'English',
  RUSSIAN = 'Russian'
}

export const LANGUAGES_TIPS = `correct list for georgian is :${EnumLanguageIds.GEORGIAN}, english is :${EnumLanguageIds.ENGLISH}, russian is :${EnumLanguageIds.RUSSIAN}`


// Arrays for Mongoose enum validation
const LANGUAGE_IDS = [1, 2, 3] as const;
const LANGUAGE_LABELS = ['ka', 'en', 'ru'] as const;
const LANGUAGES = ['Georgian', 'English', 'Russian'] as const;

export interface ILanguage extends Document {
  id: EnumLanguageIds;
  label: EnumLanguageLabels;
  language: EnumLanguages;
  status?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LanguageSchema = new Schema<ILanguage>({
  id: {
    index:true,
    type: Number,
    required: true,
    unique: true,
    enum: LANGUAGE_IDS
  },
  label: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    enum: LANGUAGE_LABELS
  },
  language: {
    type: String,
    required: true,
    enum: LANGUAGES
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ILanguage>('Language', LanguageSchema);
