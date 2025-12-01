import { type SupabaseClient, createClient } from '@supabase/supabase-js';

// Buckets configuration
const BUCKETS = {
  avatars: 'avatars',
  attachments: 'attachments',
  media: 'media',
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface FileOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

class StorageService {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    return this.supabase;
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    bucket: BucketName,
    path: string,
    file: Buffer | Blob | File,
    options?: FileOptions,
  ): Promise<UploadResult> {
    try {
      const supabase = this.getClient();

      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
      });

      if (error) {
        console.error('[Storage] Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('[Storage] Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(
    userId: string,
    file: Buffer | Blob | File,
    contentType: string,
  ): Promise<UploadResult> {
    const rawExt = contentType.split('/')[1] || 'jpg';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const path = `${userId}/avatar.${ext}`;

    return this.uploadFile(BUCKETS.avatars, path, file, {
      contentType,
      upsert: true,
    });
  }

  /**
   * Upload message attachment
   */
  async uploadAttachment(
    tenantId: string,
    conversationId: string,
    filename: string,
    file: Buffer | Blob | File,
    contentType: string,
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${tenantId}/${conversationId}/${timestamp}_${safeName}`;

    return this.uploadFile(BUCKETS.attachments, path, file, {
      contentType,
    });
  }

  /**
   * Upload media file (images, videos, audio)
   */
  async uploadMedia(
    tenantId: string,
    type: 'image' | 'video' | 'audio',
    filename: string,
    file: Buffer | Blob | File,
    contentType: string,
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${tenantId}/${type}/${timestamp}_${safeName}`;

    return this.uploadFile(BUCKETS.media, path, file, {
      contentType,
    });
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: BucketName, path: string): Promise<boolean> {
    try {
      const supabase = this.getClient();
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error('[Storage] Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Storage] Delete failed:', error);
      return false;
    }
  }

  /**
   * Get signed URL for private file
   */
  async getSignedUrl(bucket: BucketName, path: string, expiresIn = 3600): Promise<string | null> {
    try {
      const supabase = this.getClient();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (error) {
        console.error('[Storage] Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('[Storage] Signed URL failed:', error);
      return null;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: BucketName, path: string): string {
    const supabase = this.getClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * List files in a directory
   */
  async listFiles(bucket: BucketName, path?: string): Promise<string[]> {
    try {
      const supabase = this.getClient();
      const { data, error } = await supabase.storage.from(bucket).list(path);

      if (error) {
        console.error('[Storage] List error:', error);
        return [];
      }

      return data.map((file) => file.name);
    } catch (error) {
      console.error('[Storage] List failed:', error);
      return [];
    }
  }
}

export const storageService = new StorageService();
export { BUCKETS };
export type { BucketName, UploadResult };
