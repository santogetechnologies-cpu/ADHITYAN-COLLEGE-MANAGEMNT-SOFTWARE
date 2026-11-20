import { supabase } from '@/lib/supabase';
import { handleSupabaseError, AppError } from './api/errors';

export type StorageBucket = 'attachments' | 'documents' | 'avatars';

export interface BucketConfig {
  maxBytes: number;
  maxMB: number;
  allowedTypes: string[];
}

export const BUCKET_CONFIGS: Record<StorageBucket, BucketConfig> = {
  attachments: {
    maxBytes: 20 * 1024 * 1024,
    maxMB: 20,
    allowedTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  },
  documents: {
    maxBytes: 50 * 1024 * 1024,
    maxMB: 50,
    allowedTypes: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ],
  },
  avatars: {
    maxBytes: 10 * 1024 * 1024,
    maxMB: 10,
    allowedTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ],
  },
};

export const storageService = {
  validateFile(bucket: StorageBucket, file: File): { valid: boolean; error?: string } {
    const config = BUCKET_CONFIGS[bucket];
    if (!config) {
      return { valid: false, error: `Invalid storage bucket "${bucket}"` };
    }

    if (file.size > config.maxBytes) {
      return {
        valid: false,
        error: `File size exceeds the ${config.maxMB}MB limit for bucket "${bucket}" (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type || 'unknown'}" is not supported for ${bucket}. Supported formats: ${config.allowedTypes.map(t => t.split('/')[1]).join(', ')}`,
      };
    }

    return { valid: true };
  },

  async uploadFile(
    bucket: StorageBucket,
    file: File,
    folder: string = 'general'
  ): Promise<{ path: string; publicUrl: string; signedUrl?: string }> {
    const validation = this.validateFile(bucket, file);
    if (!validation.valid) {
      throw new AppError({ message: validation.error || 'Invalid file for upload' });
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const filePath = `${folder}/${timestamp}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        publicUrl: publicData.publicUrl,
      };
    } catch (error) {
      throw handleSupabaseError(error, `Failed to upload file to ${bucket}`);
    }
  },

  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to generate signed download URL');
    }
  },

  async deleteFile(bucket: StorageBucket, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to delete file from storage');
    }
  },

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

export default storageService;

