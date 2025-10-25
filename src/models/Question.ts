import mongoose, {Schema, Document} from 'mongoose';

export interface IQuestionTranslation {
  // Use numeric languageId (1,2,3) not an ObjectId reference
  languageId: number;
  question: string;
  answer: string;
  active?: boolean;
}

export interface IQuestion extends Document {
  active: boolean;
  categoryId?: number;
  translations: IQuestionTranslation[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionTranslationSchema = new Schema<IQuestionTranslation>({
  languageId: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  }
});

const QuestionSchema = new Schema<IQuestion>({
  active: {
    type: Boolean,
    default: true
  },
  categoryId: {
    type: Number
  },
  translations: {
    type: [QuestionTranslationSchema],
    validate: {
      validator: function (translations: IQuestionTranslation[]) {
        // Check for unique languageId within translations
        const languageIds = translations.map(t => t.languageId);
        return new Set(languageIds).size === languageIds.length;
      },
      message: 'Each language can only appear once in translations'
    },
    required: true
  }
}, {
  timestamps: true
});


export default mongoose.model<IQuestion>('Question', QuestionSchema);
