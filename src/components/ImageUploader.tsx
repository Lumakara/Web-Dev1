import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  bucket: 'products' | 'avatars';
  path: string;
  currentUrl?: string;
  onUpload: (url: string) => void;
  maxSizeMB?: number;
  className?: string;
}

export function ImageUploader({ bucket, path, currentUrl, onUpload, maxSizeMB = 5, className = '' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSizeMB}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diizinkan');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `${path}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) {
      toast.error('Upload gagal: ' + error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    // Cache bust
    const url = data.publicUrl + '?t=' + Date.now();
    setPreview(url);
    onUpload(data.publicUrl);
    setUploading(false);
    toast.success('Foto berhasil diupload ✓');
  };

  return (
    <label className={`cursor-pointer relative group block ${className}`}>
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors flex items-center justify-center">
        {preview ? (
          <>
            <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground p-2">
            <Upload className="w-6 h-6" />
            <span className="text-xs text-center">Upload foto</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} disabled={uploading} />
    </label>
  );
}
