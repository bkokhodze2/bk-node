import {Router, Request, Response} from 'express';
import Question, {IQuestionTranslation} from '../models/Question';
import mongoose from 'mongoose';
import {EnumLanguageIds, LANGUAGES_TIPS} from '../models/Language';

const router = Router();

// Allowed language ids set (1,2,3)
const ALLOWED_LANGUAGE_IDS = new Set<number>([
  EnumLanguageIds.GEORGIAN,
  EnumLanguageIds.ENGLISH,
  EnumLanguageIds.RUSSIAN
]);

export function toLangId(value: any): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

/**
 * @openapi
 * /questions:
 *   post:
 *     summary: Create a new question with translations
 *     tags:
 *       - Questions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [translations]
 *             properties:
 *               questionId:
 *                 type: integer
 *               active:
 *                 type: boolean
 *               categoryId:
 *                 type: integer
 *               translations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [languageId, question, answer]
 *                   properties:
 *                     languageId:
 *                       type: integer
 *                       description: "1=GE, 2=EN, 3=RU"
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       '201':
 *         description: Created
 *       '400':
 *         description: Validation error
 */
// Create a new question with translations
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    // Validate translations
    if (!Array.isArray(body.translations) || body.translations.length === 0) {
      return res.status(400).json({error: 'translations array is required and must not be empty'});
    }

    // Check duplicate languageIds in provided translations
    const seenLangs = new Set<number>();

    // Validate each translation
    for (const trans of body.translations) {
      const langId = toLangId(trans.languageId);
      if (langId === null) {
        return res.status(400).json({error: 'Each translation must include a numeric languageId (1, 2 or 3)'});
      }
      if (!ALLOWED_LANGUAGE_IDS.has(langId)) {
        return res.status(400).json({
          error: `languageId must be one of: ${Array.from(ALLOWED_LANGUAGE_IDS).join(', ')}`,
          tips: LANGUAGES_TIPS,
        });
      }

      // Duplicate languageId check
      if (seenLangs.has(langId)) {
        return res.status(400).json({error: 'Duplicate languageId in translations is not allowed'});
      }
      seenLangs.add(langId);

      if (!trans.question || !trans.answer) {
        return res.status(400).json({
          error: 'Each translation must have question and answer'
        });
      }
    }

    const doc = await Question.create({
      questionId: body.questionId,
      active: body.active ?? true,
      categoryId: body.categoryId,
      translations: body.translations.map((t: IQuestionTranslation) => ({
        languageId: Number(t.languageId),
        question: t.question,
        answer: t.answer,
      }))
    });

    res.status(201).json(doc);
  } catch (err: any) {
    console.log("eeee", err)

    res.status(400).json({error: err.message});
  }
});

/**
 * @openapi
 * /questions:
 *   get:
 *     summary: List questions with optional filters
 *     tags:
 *       - Questions
 *     parameters:
 *       - in: query
 *         name: languageId
 *         schema:
 *           type: integer
 *         description: Filter translations by language id (1,2,3)
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["true","false","all"]
 *         description: Use 'all' to return both active and inactive
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: OK
 *       '400':
 *         description: Validation error
 */
// Get questions with optional filters
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const {
      languageId,
      categoryId,
      status,
      limit = '50',
      skip = '0'
    } = req.query as Record<string, string>;

    const filter: any = {};

    // By default only return active questions, unless status query is provided
    // Add filters if provided. Map `status` query to the `active` field.
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      // Support `status=all` to return all records regardless of `active`
      if (s === 'all') {
        // do not add `active` to filter -> return both active and inactive
      } else {
        filter.active = s === 'true';
      }
    } else {
      // Default behavior: exclude inactive questions
      filter.active = true;
    }


    if (categoryId) {
      filter.categoryId = Number(categoryId);
    }

    if (languageId) {
      const lang = toLangId(languageId);
      if (lang === null || !ALLOWED_LANGUAGE_IDS.has(lang)) {
        return res.status(400).json({error: `languageId query must be one of: ${Array.from(ALLOWED_LANGUAGE_IDS).join(', ')}`});
      }
      filter['translations.languageId'] = lang;
    }

    const questions = await Question.find(filter)
        .sort({createdAt: -1})
        .skip(Number(skip))
        .limit(Number(limit));


    const total = await Question.countDocuments(filter);

    res.json({
      items: questions,
      total,
      page: Math.floor(Number(skip) / Number(limit)) + 1,
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

/**
 * @openapi
 * /questions/{id}:
 *   get:
 *     summary: Get question by ID
 *     tags:
 *       - Questions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question id (ObjectId)
 *     responses:
 *       '200':
 *         description: OK
 *       '400':
 *         description: Invalid id
 *       '404':
 *         description: Not found
 */
// Get question by ID
router.get('/questions/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    const {languageId} = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({error: 'Invalid question id'});
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({error: 'Question not found'});
    }

    // If languageId is provided, filter translations
    if (languageId) {
      const lang = toLangId(languageId);
      if (lang === null || !ALLOWED_LANGUAGE_IDS.has(lang)) {
        return res.status(400).json({error: `languageId query must be one of: ${Array.from(ALLOWED_LANGUAGE_IDS).join(', ')}`});
      }
      question.translations = question.translations.filter(t => Number((t as any).languageId) === lang);
    }

    res.json(question);
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

/**
 * @openapi
 * /questions/{id}:
 *   patch:
 *     summary: Update a question and its translations
 *     tags:
 *       - Questions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               active:
 *                 type: boolean
 *               categoryId:
 *                 type: integer
 *               translations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [languageId, question, answer]
 *                   properties:
 *                     languageId:
 *                       type: integer
 *                       description: "1=GE, 2=EN, 3=RU"
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       '200':
 *         description: Updated
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Not found
 */
// Update question
router.patch('/questions/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({error: 'Invalid question id'});
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({error: 'Question not found'});
    }

    const body = req.body || {};

    // Update base fields if provided
    if (body.active !== undefined) question.active = Boolean(body.active);

    if (!body.translations) {
      return res.status(404).json({error: "translations is required"});
    }

    // Update translations if provided
    if (Array.isArray(body.translations)) {
      // Validate translations
      const seenLangs = new Set<number>();
      for (const trans of body.translations) {
        const langId = toLangId(trans.languageId);
        if (langId === null) {
          return res.status(400).json({error: 'Each translation must include a numeric languageId (1, 2 or 3)'});
        }

        if (!ALLOWED_LANGUAGE_IDS.has(langId)) {
          return res.status(400).json({
            error: `languageId must be one of: ${Array.from(ALLOWED_LANGUAGE_IDS).join(', ')}`,
            tips: LANGUAGES_TIPS,
          });
        }

        // Duplicate languageId check for PATCH
        if (seenLangs.has(langId)) {
          return res.status(400).json({error: 'Duplicate languageId in translations is not allowed'});
        }
        seenLangs.add(langId);
        if (!trans.question || !trans.answer) {
          return res.status(400).json({
            error: 'Each translation must have question and answer'
          });
        }
      }

      // Update or add new translations
      body.translations.forEach((newTrans: IQuestionTranslation) => {
        const newLang = Number(newTrans.languageId);
        const existingIndex = question.translations.findIndex(
            t => Number((t).languageId) === newLang
        );

        if (existingIndex >= 0) {
          // Update existing translation
          const existing = question.translations[existingIndex];

          question.translations[existingIndex] = {
            languageId: newLang as EnumLanguageIds,
            question: newTrans.question ?? (existing).question,
            answer: newTrans.answer ?? (existing).answer,
          } as IQuestionTranslation;
        } else {
          // Or add new translation
          question.translations.push({
            languageId: newLang as EnumLanguageIds,
            question: newTrans.question,
            answer: newTrans.answer,
          });
        }
      });
    }

    await question.save();
    res.status(200).json(question);
  } catch (err: any) {
    res.status(400).json({error: err.message});
  }
});

/**
 * @openapi
 * /questions/{id}:
 *   delete:
 *     summary: Delete a question
 *     tags:
 *       - Questions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Deleted
 *       '400':
 *         description: Invalid id
 *       '404':
 *         description: Not found
 */
// Delete question
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({error: 'Invalid question id'});
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({error: 'Question not found'});
    }

    res.json({message: `Question with id : ${id} deleted successfully`});
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

/**
 * @openapi
 * /questions/change-status/{id}:
 *   post:
 *     summary: Toggle or set a question's active status
 *     tags:
 *       - Questions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: boolean
 *                 description: If omitted the endpoint toggles the current status
 *     responses:
 *       '200':
 *         description: Updated
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Not found
 */
// Change status (toggle or set) for a question
router.post('/questions/change-status/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({error: 'Invalid question id'});
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({error: 'Question not found'});
    }

    // If body or status is not provided -> toggle
    // Use a raw body check so we can validate the runtime type of `status` strictly
    const rawBody: any = req.body;
    const hasStatus = rawBody && Object.prototype.hasOwnProperty.call(rawBody, 'status');
    if (!hasStatus) {
      // Toggle when no status provided
      question.active = !question.active;
    } else {
      const statusValue = rawBody.status;
      if (typeof statusValue !== 'boolean') {
        return res.status(400).json({error: 'status must be a boolean'});
      }
      question.active = statusValue;
    }

    await question.save();
    res.status(200).json(question);
  } catch (err: any) {
    res.status(400).json({error: err.message});
  }
});

export default router;
