'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderOpen, Plus, Trash2, X, Filter, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';

export interface ManagedPatientFile {
  fileId: string;
  fileName: string;
  r2Key: string;
  fileType: string | null;
  notes: string | null;
  visitId: string | null;
  tags: string[];
  uploadedByName: string;
  createdAt: string;
}

export interface LegacyVisitFile {
  fileId: string;
  fileName: string;
  type: string;
  visitId: string;
  uploadedDate: string;
}

interface VisitOption {
  visitId: string;
  visitDate: string;
  label: string;
}

interface FileTag {
  id: string;
  name: string;
}

interface PatientFilesProps {
  patientId: string;
  clinicId: string;
  visits: VisitOption[];
  legacyFiles: LegacyVisitFile[];
  loading: boolean;
  canUpload: boolean;
  canDelete: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function fileKind(type: string | null): string {
  if (!type) return 'File';
  if (type.startsWith('image/')) return 'Image';
  if (type === 'application/pdf') return 'PDF';
  if (type.includes('word') || type.includes('document')) return 'Word';
  if (type.includes('excel') || type.includes('sheet')) return 'Excel';
  return 'File';
}

function isImage(type: string | null): boolean {
  return type?.startsWith('image/') ?? false;
}

function isPdf(type: string | null): boolean {
  return type === 'application/pdf';
}

export function PatientFiles({
  patientId,
  clinicId,
  visits,
  legacyFiles,
  loading,
  canUpload,
  canDelete,
}: PatientFilesProps) {
  const [managed, setManaged] = useState<ManagedPatientFile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableTags, setAvailableTags] = useState<FileTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    notes: '',
    visitId: '',
    fileName: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setFetching(true);
      try {
        const [filesRes, tagsRes] = await Promise.all([
          fetch(`/api/patients/${patientId}/files`),
          fetch(`/api/file-tags?clinicId=${clinicId}`),
        ]);
        const [filesData, tagsData] = await Promise.all([filesRes.json(), tagsRes.json()]);
        if (!cancelled) {
          setManaged(filesData.files || []);
          setAvailableTags(tagsData.tags || []);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, clinicId]);

  const handlePickFile = () => {
    const picked = fileInputRef.current?.files?.[0];
    if (picked) {
      if (!ALLOWED_TYPES.includes(picked.type)) {
        setError('File type not allowed. Allowed: PDF, JPEG, PNG, GIF, WebP, DOCX, XLSX, TIFF');
        return;
      }
      if (picked.size > MAX_SIZE) {
        setError('File too large. Maximum size is 10 MB.');
        return;
      }
      setError('');
      setUploadForm((f) => ({ ...f, fileName: picked.name }));
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetch('/api/file-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), clinicId }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        setAvailableTags((prev) => [...prev, data.tag]);
        setSelectedTags((prev) => [...prev, data.tag.name]);
        setNewTagName('');
      }
    } catch {
      // silent
    } finally {
      setCreatingTag(false);
    }
  };

  const handleUpload = async () => {
    const picked = fileInputRef.current?.files?.[0];
    if (!picked) {
      setError('Choose a file to upload');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', picked);
      fd.append('clinicId', clinicId);
      if (uploadForm.notes.trim()) fd.append('notes', uploadForm.notes.trim());
      if (uploadForm.visitId) fd.append('visitId', uploadForm.visitId);
      if (selectedTags.length > 0) fd.append('tags', JSON.stringify(selectedTags));

      const res = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setManaged((prev) => [data.file, ...prev]);
        setShowUpload(false);
        setUploadForm({ notes: '', visitId: '', fileName: '' });
        setSelectedTags([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(data.error || 'Failed to upload');
      }
    } catch {
      setError('Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this file permanently?')) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setManaged((prev) => prev.filter((f) => f.fileId !== fileId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete file');
      }
    } catch {
      alert('Failed to delete file');
    }
  };

  const accessUrl = (key: string, name: string, type?: string | null) =>
    `/api/upload/visit-file/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(
      name
    )}&inline=${type?.startsWith('image/') ? 1 : 0}`;

  const downloadUrl = (key: string, name: string) =>
    `/api/upload/visit-file/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&inline=0`;

  const filteredManaged = filterTag
    ? managed.filter((f) => f.tags?.includes(filterTag))
    : managed;

  const renderThumbnail = (f: ManagedPatientFile) => {
    if (isImage(f.fileType)) {
      return (
        <img
          src={accessUrl(f.r2Key, f.fileName, f.fileType)}
          alt={f.fileName}
          className="w-16 h-16 object-cover rounded border border-gray-200"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    if (isPdf(f.fileType)) {
      return (
        <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded border border-red-200">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-500" /> Files
        </h3>
        {canUpload && (
          <button
            onClick={() => setShowUpload((s) => !s)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showUpload ? 'Cancel' : 'Upload File'}
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="mb-4 border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handlePickFile}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.doc,.docx,.xls,.xlsx"
            className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:text-sm file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          <p className="text-xs text-gray-500">
            Allowed: PDF, JPEG, PNG, GIF, WebP, TIFF, DOCX, XLSX. Max 10 MB.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Notes (optional)"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={uploadForm.visitId}
              onChange={(e) => setUploadForm({ ...uploadForm, visitId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Associate with session (optional)</option>
              {visits.map((v) => (
                <option key={v.visitId} value={v.visitId}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Tags selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag.name) ? prev.filter((t) => t !== tag.name) : [...prev, tag.name]
                    );
                  }}
                  className={`px-2 py-1 text-xs rounded-full border ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                {creatingTag ? '...' : '+ Add Tag'}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadForm.fileName}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {/* Tag filter */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filter by tag:</span>
          <button
            onClick={() => setFilterTag('')}
            className={`px-2 py-1 text-xs rounded-full border ${
              !filterTag ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(filterTag === tag.name ? '' : tag.name)}
              className={`px-2 py-1 text-xs rounded-full border ${
                filterTag === tag.name
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {(loading || fetching) ? (
        <p className="text-sm text-gray-500">Loading files...</p>
      ) : managed.length === 0 && legacyFiles.length === 0 ? (
        <EmptyState icon={FolderOpen} message="No files uploaded yet." />
      ) : (
        <div className="space-y-4">
          {filteredManaged.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
                Uploaded Files {filterTag && `(filtered by: ${filterTag})`}
              </p>
              {filteredManaged.map((f) => (
                <div
                  key={f.fileId}
                  className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors"
                >
                  {renderThumbnail(f)}
                  <div className="min-w-0 flex-1">
                    <a
                      href={accessUrl(f.r2Key, f.fileName, f.fileType)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline truncate block"
                    >
                      {f.fileName}
                    </a>
                    <p className="text-xs text-gray-400">
                      {fileKind(f.fileType)} • {formatDateDDMMM(f.createdAt)} • by{' '}
                      {f.uploadedByName}
                      {f.visitId ? ` • Session ${f.visitId}` : ''}
                    </p>
                    {f.notes && <p className="text-xs text-gray-500 mt-0.5">{f.notes}</p>}
                    {f.tags && f.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {f.tags.map((tag, i) => (
                          <span key={i} className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={accessUrl(f.r2Key, f.fileName, f.fileType)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 whitespace-nowrap"
                    >
                      View
                    </a>
                    <a
                      href={downloadUrl(f.r2Key, f.fileName)}
                      download
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 whitespace-nowrap flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(f.fileId)}
                        title="Delete file"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {legacyFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
                From Sessions
              </p>
              {legacyFiles.map((f) => (
                <div
                  key={f.fileId}
                  className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors"
                >
                  <div className="min-w-0">
                    <a
                      href={`/api/upload/visit-file/download?key=${encodeURIComponent(f.fileId)}&name=${encodeURIComponent(f.fileName)}&inline=${f.type?.startsWith('image/') ? 1 : 0}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline truncate block"
                    >
                      {f.fileName}
                    </a>
                    <p className="text-xs text-gray-400">
                      {fileKind(f.type)} • Uploaded {formatDateDDMMM(f.uploadedDate)} • Session{' '}
                      {f.visitId}
                    </p>
                  </div>
                  <a
                    href={`/api/upload/visit-file/download?key=${encodeURIComponent(f.fileId)}&name=${encodeURIComponent(f.fileName)}&inline=0`}
                    download
                    className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 whitespace-nowrap flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
