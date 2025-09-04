import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import productsRouter from './routes/products';
import usersRouter from './routes/users';
import flatsRouter from './routes/flats';
import { UPLOAD_DIR } from './services/uploads';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Static serving for uploaded images
app.use('/uploads', express.static(UPLOAD_DIR));

// Initialize Firebase if env is present

const MONGODB_URI = 'mongodb+srv://bkokhodze_db_user:icpCCcfeiMLtPXpG@cluster0.ddl8qs5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_DB = process.env.MONGODB_DB || 'bk';
const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
    console.log(`Connected to MongoDB (db: ${MONGODB_DB})`);


    app.use('/api', productsRouter);
    app.use('/api', usersRouter);
    app.use('/api', flatsRouter);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start app:', err);
    process.exit(1);
  }
}

start();
