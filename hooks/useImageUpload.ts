import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const uploadImageToBucket = useCallback(async (
    dataUrl: string,
    folder: 'avatars' | 'tasks' | 'rewards',
    familyId: string
  ): Promise<string> => {
    setUploading(true);
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const mime = blob.type || 'image/png';
      const ext = mime.split('/')[1]?.split('+')[0] || 'png';
      const path = `${folder}/${familyId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('fpb')
        .upload(path, blob, { upsert: true, contentType: mime, cacheControl: '3600' });

      if (error) throw error;

      const { data } = supabase.storage.from('fpb').getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, uploadImageToBucket };
}
