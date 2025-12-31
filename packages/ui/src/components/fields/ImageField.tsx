import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import type { ImageField as ImageFieldType } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import { cn } from '../../lib/utils';

export interface ImageFieldProps {
  field: ImageFieldType;
  value: string | null;
  onChange: (value: string | null) => void;
  collectionName: string;
  slug: string;
  error?: string;
  className?: string;
}

export function ImageField({
  field,
  value,
  onChange,
  collectionName,
  slug,
  error,
  className,
}: ImageFieldProps) {
  const { fetchApi, config } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (field.accept && !field.accept.some((type) => file.type.includes(type))) {
      setUploadError(`Invalid file type. Allowed: ${field.accept.join(', ')}`);
      return;
    }

    // Validate file size
    if (field.maxSize && file.size > field.maxSize) {
      setUploadError(
        `File too large. Maximum: ${(field.maxSize / 1024 / 1024).toFixed(1)}MB`
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const result = await fetchApi<{ path: string }>(
          `/upload/${collectionName}/${slug}`,
          {
            method: 'POST',
            body: JSON.stringify({
              filename: file.name,
              data: base64,
            }),
          }
        );

        if (result.success && result.data) {
          onChange(result.data.path);
        } else {
          setUploadError(result.error || 'Upload failed');
        }

        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError('Upload failed');
      setIsUploading(false);
    }
  };

  const imageUrl = value
    ? `/${config.storage.contentPath}/${collectionName}/${slug}/${value}`
    : null;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={field.accept?.join(',') || 'image/*'}
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={imageUrl || ''}
            alt=""
            className="max-w-xs max-h-48 rounded-md border border-gray-300"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-8',
            'border-2 border-dashed border-gray-300 rounded-md',
            'text-gray-500 hover:border-gray-400 hover:text-gray-600',
            'transition-colors cursor-pointer',
            isUploading && 'opacity-50 cursor-wait'
          )}
        >
          {isUploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Click to upload image</span>
            </>
          )}
        </button>
      )}

      {(error || uploadError) && (
        <p className="text-sm text-red-500">{error || uploadError}</p>
      )}
    </div>
  );
}
