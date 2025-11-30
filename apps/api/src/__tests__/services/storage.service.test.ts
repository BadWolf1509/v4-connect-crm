import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase client
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockList = vi.fn();

const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  createSignedUrl: mockCreateSignedUrl,
  getPublicUrl: mockGetPublicUrl,
  list: mockList,
}));

const mockSupabase = {
  storage: {
    from: mockStorageFrom,
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock environment
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

// Import after mocking
import { BUCKETS, storageService } from '../../services/storage.service';

describe('storageService', () => {
  describe('uploadFile', () => {
    it('should upload file and return public URL', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'test/file.jpg' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/test/file.jpg' },
      });

      const file = Buffer.from('test file content');
      const result = await storageService.uploadFile(BUCKETS.attachments, 'test/file.jpg', file);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://storage.test.co/test/file.jpg');
      expect(result.path).toBe('test/file.jpg');
    });

    it('should handle upload error', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      });

      const file = Buffer.from('test');
      const result = await storageService.uploadFile(BUCKETS.attachments, 'test.jpg', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should pass file options', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'test.pdf' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/test.pdf' },
      });

      const file = Buffer.from('pdf content');
      await storageService.uploadFile(BUCKETS.attachments, 'test.pdf', file, {
        contentType: 'application/pdf',
        cacheControl: '7200',
        upsert: true,
      });

      expect(mockUpload).toHaveBeenCalledWith('test.pdf', file, {
        contentType: 'application/pdf',
        cacheControl: '7200',
        upsert: true,
      });
    });

    it('should handle exception during upload', async () => {
      mockUpload.mockRejectedValueOnce(new Error('Network error'));

      const file = Buffer.from('test');
      const result = await storageService.uploadFile(BUCKETS.media, 'test.jpg', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar with correct path', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/avatar.jpg' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/avatars/user-123/avatar.jpg' },
      });

      const file = Buffer.from('avatar image');
      const result = await storageService.uploadAvatar('user-123', file, 'image/jpeg');

      expect(result.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/avatar.jpg',
        file,
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: true,
        }),
      );
    });

    it('should handle different image types', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'user-123/avatar.png' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/avatars/user-123/avatar.png' },
      });

      const file = Buffer.from('png image');
      await storageService.uploadAvatar('user-123', file, 'image/png');

      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/avatar.png',
        file,
        expect.any(Object),
      );
    });
  });

  describe('uploadAttachment', () => {
    it('should upload attachment with safe filename', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'tenant-1/conv-1/123_document.pdf' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/attachments/...' },
      });

      const file = Buffer.from('attachment');
      const result = await storageService.uploadAttachment(
        'tenant-1',
        'conv-1',
        'my document.pdf',
        file,
        'application/pdf',
      );

      expect(result.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('attachments');
      // Check that filename is sanitized (spaces replaced with underscores)
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/tenant-1\/conv-1\/\d+_my_document\.pdf/),
        file,
        expect.any(Object),
      );
    });

    it('should sanitize special characters in filename', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'sanitized.pdf' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/attachments/sanitized.pdf' },
      });

      const file = Buffer.from('content');
      await storageService.uploadAttachment(
        'tenant-1',
        'conv-1',
        'file@#$%^&*().pdf',
        file,
        'application/pdf',
      );

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/file_+\.pdf/),
        file,
        expect.any(Object),
      );
    });
  });

  describe('uploadMedia', () => {
    it('should upload image media', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'tenant-1/image/123_photo.jpg' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/media/...' },
      });

      const file = Buffer.from('image data');
      const result = await storageService.uploadMedia(
        'tenant-1',
        'image',
        'photo.jpg',
        file,
        'image/jpeg',
      );

      expect(result.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('media');
    });

    it('should upload video media', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'tenant-1/video/123_clip.mp4' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/media/...' },
      });

      const file = Buffer.from('video data');
      await storageService.uploadMedia('tenant-1', 'video', 'clip.mp4', file, 'video/mp4');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/tenant-1\/video\/\d+_clip\.mp4/),
        file,
        expect.any(Object),
      );
    });

    it('should upload audio media', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: 'tenant-1/audio/123_voice.mp3' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/media/...' },
      });

      const file = Buffer.from('audio data');
      await storageService.uploadMedia('tenant-1', 'audio', 'voice.mp3', file, 'audio/mpeg');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/tenant-1\/audio\/\d+_voice\.mp3/),
        file,
        expect.any(Object),
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockRemove.mockResolvedValueOnce({ error: null });

      const result = await storageService.deleteFile(BUCKETS.attachments, 'test/file.jpg');

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['test/file.jpg']);
    });

    it('should handle delete error', async () => {
      mockRemove.mockResolvedValueOnce({ error: { message: 'Not found' } });

      const result = await storageService.deleteFile(BUCKETS.attachments, 'nonexistent.jpg');

      expect(result).toBe(false);
    });

    it('should handle exception during delete', async () => {
      mockRemove.mockRejectedValueOnce(new Error('Network error'));

      const result = await storageService.deleteFile(BUCKETS.media, 'test.jpg');

      expect(result).toBe(false);
    });
  });

  describe('getSignedUrl', () => {
    it('should get signed URL with default expiry', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://storage.test.co/signed-url' },
        error: null,
      });

      const result = await storageService.getSignedUrl(BUCKETS.attachments, 'private/file.pdf');

      expect(result).toBe('https://storage.test.co/signed-url');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('private/file.pdf', 3600);
    });

    it('should get signed URL with custom expiry', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://storage.test.co/signed-url' },
        error: null,
      });

      await storageService.getSignedUrl(BUCKETS.attachments, 'file.pdf', 7200);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith('file.pdf', 7200);
    });

    it('should return null on error', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error creating signed URL' },
      });

      const result = await storageService.getSignedUrl(BUCKETS.attachments, 'file.pdf');

      expect(result).toBeNull();
    });

    it('should handle exception', async () => {
      mockCreateSignedUrl.mockRejectedValueOnce(new Error('Network error'));

      const result = await storageService.getSignedUrl(BUCKETS.media, 'file.jpg');

      expect(result).toBeNull();
    });
  });

  describe('getPublicUrl', () => {
    it('should get public URL', () => {
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://storage.test.co/public/file.jpg' },
      });

      const result = storageService.getPublicUrl(BUCKETS.media, 'public/file.jpg');

      expect(result).toBe('https://storage.test.co/public/file.jpg');
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      mockList.mockResolvedValueOnce({
        data: [
          { name: 'file1.jpg' },
          { name: 'file2.jpg' },
          { name: 'file3.pdf' },
        ],
        error: null,
      });

      const result = await storageService.listFiles(BUCKETS.attachments, 'tenant-1');

      expect(result).toEqual(['file1.jpg', 'file2.jpg', 'file3.pdf']);
      expect(mockList).toHaveBeenCalledWith('tenant-1');
    });

    it('should list files without path', async () => {
      mockList.mockResolvedValueOnce({
        data: [{ name: 'root-file.jpg' }],
        error: null,
      });

      const result = await storageService.listFiles(BUCKETS.media);

      expect(result).toEqual(['root-file.jpg']);
      expect(mockList).toHaveBeenCalledWith(undefined);
    });

    it('should return empty array on error', async () => {
      mockList.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' },
      });

      const result = await storageService.listFiles(BUCKETS.attachments, 'path');

      expect(result).toEqual([]);
    });

    it('should handle exception', async () => {
      mockList.mockRejectedValueOnce(new Error('Network error'));

      const result = await storageService.listFiles(BUCKETS.avatars);

      expect(result).toEqual([]);
    });
  });

  describe('BUCKETS constant', () => {
    it('should have correct bucket names', () => {
      expect(BUCKETS.avatars).toBe('avatars');
      expect(BUCKETS.attachments).toBe('attachments');
      expect(BUCKETS.media).toBe('media');
    });
  });
});
