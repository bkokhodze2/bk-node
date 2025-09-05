import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bkokhodze_db_user:icpCCcfeiMLtPXpG@cluster0.ddl8qs5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_DB = process.env.MONGODB_DB || 'bk';
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log(`Connected to MongoDB (db: ${MONGODB_DB})`);
  if (DRY_RUN) console.log('Running in DRY-RUN mode. No changes will be written.');

  const col = mongoose.connection.collection('flats');

  // Find docs with legacy location string
  const cursor = col.find(
    { location: { $type: 'string', $ne: '' } },
    { projection: { address: 1, location: 1 } }
  );

  const toProcess = await cursor.toArray();
  console.log(`Found ${toProcess.length} flats with legacy location`);

  if (toProcess.length === 0) {
    console.log('Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  let backfilled = 0;
  const ops: any[] = [];
  for (const doc of toProcess as any[]) {
    const update: any = { $unset: { location: '' } };

    const hasAddress = doc.address && typeof doc.address === 'object';
    const hasStreet = hasAddress && typeof doc.address.street === 'string' && doc.address.street.trim() !== '';

    if (!hasStreet) {
      update.$set = { 'address.street': String(doc.location) };
      backfilled++;
    }

    ops.push({ updateOne: { filter: { _id: doc._id }, update } });
  }

  console.log(`Would backfill address.street for ${backfilled} and unset legacy location for ${toProcess.length} flats.`);

  if (DRY_RUN) {
    console.log('Sample operations:', JSON.stringify(ops.slice(0, 5), null, 2));
  } else {
    const res = await col.bulkWrite(ops, { ordered: false });
    console.log('Bulk result:', JSON.stringify(res, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
