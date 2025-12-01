import { Hono } from 'hono';
import { storageService } from '../services/storage.service';

const uploadRoutes = new Hono();

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

// Allowed content types
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
const ALLOWED_DOCUMENTS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/**
 * Upload avatar image
 * POST /upload/avatar
 */
uploadRoutes.post('/avatar', async (c) => {
  const tenantId = c.req.header('x-tenant-id');
  const userId = c.req.header('x-user-id');

  if (!tenantId || !userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!ALLOWED_IMAGES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only images allowed.' }, 400);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return c.json({ error: 'File too large. Max 10MB.' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storageService.uploadAvatar(userId, buffer, file.type);

    if (!result.success) {
      return c.json({ error: result.error || 'Upload failed' }, 500);
    }

    return c.json({
      url: result.url,
      path: result.path,
    });
  } catch (error) {
    console.error('[Upload] Avatar upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/**
 * Upload message attachment
 * POST /upload/attachment
 */
uploadRoutes.post('/attachment', async (c) => {
  const tenantId = c.req.header('x-tenant-id');
  const conversationId = c.req.query('conversationId');

  if (!tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!conversationId) {
    return c.json({ error: 'conversationId is required' }, 400);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Determine file type and validate
    const isImage = ALLOWED_IMAGES.includes(file.type);
    const isVideo = ALLOWED_VIDEOS.includes(file.type);
    const isAudio = ALLOWED_AUDIO.includes(file.type);
    const isDocument = ALLOWED_DOCUMENTS.includes(file.type);

    if (!isImage && !isVideo && !isAudio && !isDocument) {
      return c.json({ error: 'Invalid file type' }, 400);
    }

    // Check size limits
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return c.json({ error: 'Image too large. Max 10MB.' }, 400);
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return c.json({ error: 'Video too large. Max 50MB.' }, 400);
    }
    if ((isAudio || isDocument) && file.size > MAX_DOCUMENT_SIZE) {
      return c.json({ error: 'File too large. Max 25MB.' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storageService.uploadAttachment(
      tenantId,
      conversationId,
      file.name,
      buffer,
      file.type,
    );

    if (!result.success) {
      return c.json({ error: result.error || 'Upload failed' }, 500);
    }

    // Determine media type for the response
    let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (isImage) mediaType = 'image';
    else if (isVideo) mediaType = 'video';
    else if (isAudio) mediaType = 'audio';

    return c.json({
      url: result.url,
      path: result.path,
      type: mediaType,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error('[Upload] Attachment upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/**
 * Upload media file
 * POST /upload/media
 */
uploadRoutes.post('/media', async (c) => {
  const tenantId = c.req.header('x-tenant-id');

  if (!tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Determine media type
    const isImage = ALLOWED_IMAGES.includes(file.type);
    const isVideo = ALLOWED_VIDEOS.includes(file.type);
    const isAudio = ALLOWED_AUDIO.includes(file.type);

    if (!isImage && !isVideo && !isAudio) {
      return c.json({ error: 'Invalid media type' }, 400);
    }

    // Check size limits
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return c.json({ error: 'Image too large. Max 10MB.' }, 400);
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return c.json({ error: 'Video too large. Max 50MB.' }, 400);
    }
    if (isAudio && file.size > MAX_DOCUMENT_SIZE) {
      return c.json({ error: 'Audio too large. Max 25MB.' }, 400);
    }

    const mediaType: 'image' | 'video' | 'audio' = isImage ? 'image' : isVideo ? 'video' : 'audio';
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await storageService.uploadMedia(
      tenantId,
      mediaType,
      file.name,
      buffer,
      file.type,
    );

    if (!result.success) {
      return c.json({ error: result.error || 'Upload failed' }, 500);
    }

    return c.json({
      url: result.url,
      path: result.path,
      type: mediaType,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error('[Upload] Media upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

export { uploadRoutes };
