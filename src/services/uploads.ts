import path from 'path';
import fs from 'fs';
import multer from 'multer';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeFilename(originalName: string) {
  const name = path.parse(originalName).name.replace(/[^a-z0-9_-]/gi, '_');
  const ext = path.extname(originalName).toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${name}-${unique}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, safeFilename(file.originalname));
  },
});

const allowedExt = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okMime = file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream';
    const okExt = allowedExt.includes(ext);
    if (okMime && okExt) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  },
});

export { upload, UPLOAD_DIR };

