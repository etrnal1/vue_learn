import express from 'express';
import fsp from 'fs/promises';
import path from 'path';

const router = express.Router();

const ALBUM_DATA_DIR = path.resolve('server/data/albums');
const ALBUM_LIBRARY_FILE = path.join(ALBUM_DATA_DIR, 'library.json');

function normalizeAlbums(items) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  const seenAlbums = new Set();

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = String(item.name || '').trim();
      if (!name) return null;

      const id = String(item.id || `album_${now}_${Math.random().toString(16).slice(2, 6)}`);
      if (seenAlbums.has(id)) return null;
      seenAlbums.add(id);

      const createdAt = Number(item.createdAt) || now;
      const updatedAt = Number(item.updatedAt) || createdAt;
      const tags = Array.isArray(item.tags)
        ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
        : [];

      const seenPhotos = new Set();
      const photos = Array.isArray(item.photos)
        ? item.photos
          .map((photo) => {
            if (!photo || typeof photo !== 'object') return null;
            const title = String(photo.title || '').trim();
            const url = String(photo.url || '').trim();
            if (!title || !url) return null;

            const photoId = String(photo.id || `photo_${updatedAt}_${Math.random().toString(16).slice(2, 6)}`);
            if (seenPhotos.has(photoId)) return null;
            seenPhotos.add(photoId);

            const photoCreatedAt = Number(photo.createdAt) || now;
            const photoUpdatedAt = Number(photo.updatedAt) || photoCreatedAt;
            return {
              id: photoId,
              title,
              url,
              takenAt: photo.takenAt ? String(photo.takenAt) : '',
              location: String(photo.location || '').trim(),
              tags: Array.isArray(photo.tags)
                ? photo.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
                : [],
              note: String(photo.note || ''),
              favorite: Boolean(photo.favorite),
              createdAt: photoCreatedAt,
              updatedAt: photoUpdatedAt
            };
          })
          .filter(Boolean)
        : [];

      return {
        id,
        name,
        category: String(item.category || '').trim(),
        coverUrl: String(item.coverUrl || '').trim(),
        tags,
        description: String(item.description || ''),
        photos,
        createdAt,
        updatedAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function ensureDataDir() {
  await fsp.mkdir(ALBUM_DATA_DIR, { recursive: true });
}

async function readAlbumLibrary() {
  try {
    const raw = await fsp.readFile(ALBUM_LIBRARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeAlbums(parsed?.items || []);
  } catch (error) {
    return [];
  }
}

async function writeAlbumLibrary(items) {
  await ensureDataDir();
  const normalized = normalizeAlbums(items);
  const payload = {
    updatedAt: Date.now(),
    count: normalized.length,
    items: normalized
  };
  await fsp.writeFile(ALBUM_LIBRARY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return normalized;
}

// GET /api/albums/library
router.get('/library', async (req, res) => {
  try {
    const items = await readAlbumLibrary();
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('读取相册库失败:', error);
    res.status(500).json({ error: '读取相册库失败' });
  }
});

// PUT /api/albums/library
router.put('/library', async (req, res) => {
  try {
    const items = await writeAlbumLibrary(req.body?.items || []);
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('保存相册库失败:', error);
    res.status(500).json({ error: '保存相册库失败' });
  }
});

export default router;
