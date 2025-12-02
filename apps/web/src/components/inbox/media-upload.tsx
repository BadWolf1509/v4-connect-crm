'use client';

import { cn } from '@/lib/utils';
import { FileText, Image, Loader2, Music, Video, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface UploadedFile {
  id: string;
  url: string;
  path: string;
  type: 'image' | 'video' | 'audio' | 'document';
  filename: string;
  size: number;
  contentType: string;
  preview?: string;
  messageId?: string;
}

interface UploadResponse {
  message: {
    id: string;
    conversationId: string;
    content: string;
    type: string;
    mediaUrl: string;
    mediaType: string;
    status: string;
  };
  url: string;
  path: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  mimeType: string;
  fileName: string;
}

interface MediaUploadProps {
  conversationId: string;
  onFileUploaded: (file: UploadedFile) => void;
  onClose: () => void;
}

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (ALLOWED_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_TYPES.video.includes(mimeType)) return 'video';
  if (ALLOWED_TYPES.audio.includes(mimeType)) return 'audio';
  return 'document';
}

function getFileIcon(type: 'image' | 'video' | 'audio' | 'document') {
  switch (type) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    default:
      return FileText;
  }
}

export function MediaUpload({ conversationId, onFileUploaded, onClose }: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    // Check file type
    const allAllowed = [
      ...ALLOWED_TYPES.image,
      ...ALLOWED_TYPES.video,
      ...ALLOWED_TYPES.audio,
      ...ALLOWED_TYPES.document,
    ];

    if (!allAllowed.includes(file.type)) {
      setError('Tipo de arquivo não suportado');
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Arquivo muito grande. Máximo 50MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conversationId', conversationId);

      // Use the new /messages/upload endpoint that handles upload + message creation
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/messages/upload`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Upload failed');
      }

      const data: UploadResponse = await response.json();

      const uploadedFile: UploadedFile = {
        id: data.message.id,
        url: data.url,
        path: data.path,
        type: data.type,
        filename: data.fileName,
        size: data.size,
        contentType: data.mimeType,
        preview: preview || undefined,
        messageId: data.message.id,
      };

      onFileUploaded(uploadedFile);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileType = selectedFile ? getFileType(selectedFile.type) : null;
  const FileIcon = fileType ? getFileIcon(fileType) : FileText;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Enviar arquivo</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition',
            dragActive
              ? 'border-v4-red-500 bg-v4-red-500/10'
              : 'border-gray-700 hover:border-gray-600',
          )}
        >
          <Image className="h-10 w-10 text-gray-500 mb-3" />
          <p className="text-sm text-gray-400 mb-2">
            Arraste e solte um arquivo ou{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-v4-red-500 hover:underline"
            >
              clique para selecionar
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Imagens, vídeos, áudios e documentos. Máximo 50MB.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            accept={[
              ...ALLOWED_TYPES.image,
              ...ALLOWED_TYPES.video,
              ...ALLOWED_TYPES.audio,
              ...ALLOWED_TYPES.document,
            ].join(',')}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-start gap-4 rounded-lg bg-gray-800 p-4">
            {preview ? (
              <img src={preview} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-700">
                <FileIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
              <span
                className={cn(
                  'inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  fileType === 'image' && 'bg-blue-500/20 text-blue-400',
                  fileType === 'video' && 'bg-purple-500/20 text-purple-400',
                  fileType === 'audio' && 'bg-green-500/20 text-green-400',
                  fileType === 'document' && 'bg-orange-500/20 text-orange-400',
                )}
              >
                {fileType === 'image' && 'Imagem'}
                {fileType === 'video' && 'Vídeo'}
                {fileType === 'audio' && 'Áudio'}
                {fileType === 'document' && 'Documento'}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={uploading}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
