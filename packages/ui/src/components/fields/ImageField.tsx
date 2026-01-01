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
    <fieldset className={cn('fieldset', className)}>
      <legend className="fieldset-legend">
        {field.label}
        {field.required && <span className="text-error ml-1">*</span>}
      </legend>
      {field.description && (
        <p className="text-sm text-base-content/70 mb-1">{field.description}</p>
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
            className="max-w-xs max-h-48 rounded-lg border border-base-300"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn btn-circle btn-error btn-xs absolute -top-2 -right-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-8',
            'border-2 border-dashed border-base-300 rounded-lg',
            'text-base-content/70 hover:border-primary hover:text-primary',
            'transition-colors cursor-pointer',
            isUploading && 'opacity-50 cursor-wait'
          )}
        >
          {isUploading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Click to upload image</span>
            </>
          )}
        </button>
      )}

      {(error || uploadError) && (
        <p className="text-sm text-error mt-1">{error || uploadError}</p>
      )}
    </fieldset>
  );
}
