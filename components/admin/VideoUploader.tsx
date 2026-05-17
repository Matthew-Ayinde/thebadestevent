'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function VideoUploader({ value, onChange, label = 'Video', required, error }: VideoUploaderProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setUrlInput(url);
    setPreview(url);
    onChange(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      toast.error('Only MP4, WebM, and MOV videos are supported');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be smaller than 100MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resourceType', 'video');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      setPreview(data.url);
      onChange(data.url);
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-3 py-1 text-xs rounded-lg transition ${
              mode === 'url'
                ? 'bg-teal-500/30 text-teal-300'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1 text-xs rounded-lg transition ${
              mode === 'upload'
                ? 'bg-teal-500/30 text-teal-300'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={urlInput}
          onChange={handleUrlChange}
          placeholder="https://example.com/video.mp4"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-teal-400/50 transition"
        />
      ) : (
        <div
          className="relative border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
          <Upload size={24} className="mx-auto mb-2 text-white/50" />
          <p className="text-sm text-white/70">
            {isUploading ? 'Uploading...' : 'Click to upload video'}
          </p>
          <p className="text-xs text-white/40 mt-1">MP4, WebM, or MOV up to 100MB</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {preview && (
        <div className="mt-4">
          <p className="text-xs text-white/60 mb-2">Preview</p>
          <video
            src={preview}
            controls
            className="w-full h-40 rounded-lg border border-white/10 bg-black"
            onError={(e) => {
              console.error('Video preview error:', e);
            }}
          />
        </div>
      )}
    </div>
  );
}
