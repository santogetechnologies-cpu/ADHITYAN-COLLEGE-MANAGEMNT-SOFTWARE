import { supabase } from './client';

export type StorageBucket = 'documents' | 'attachments' | 'avatars';

export const storageService = {
  /**
   * Upload a file to a Supabase storage bucket
   */
  async uploadFile(bucket: StorageBucket, path: string, file: File): Promise<{ url: string | null; error: Error | null }> {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = path ? `${path}/${sanitizedName}` : sanitizedName;

      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return { url: publicUrlData.publicUrl, error: null };
    } catch (err: any) {
      console.error(`Error uploading to ${bucket}:`, err.message);
      return { url: null, error: err };
    }
  },

  /**
   * Get a public URL for a stored file
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Delete a file from a bucket
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error(`Error deleting from ${bucket}:`, err.message);
      return false;
    }
  },
};

