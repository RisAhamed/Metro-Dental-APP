'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderOpen, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';

export interface ManagedPatientFile {
  fileId: string;
  fileName: string;
  r2Key: string;
  fileType: string | null;
  notes: string | null;
  visitId: string | null;
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

interface PatientFilesProps {
  patientId: string;
  clinicId: string;
  visits: VisitOption[];
  legacyFiles: LegacyVisitFile[];
  loading: boolean;
  canUpload: boolean;
  canDelete: boolean;
}

function fileKind(type: string | null): string {
  if (!type) return 'File';
  if (type.startsWith('image/')) return 'Image';
  if (type === 'application/pdf') return 'PDF';
  return 'File';
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
        const res = await fetch(`/api/patients/${patientId}/files`);
        const data = await res.json();
        if (!cancelled && res.ok) setManaged(data.files || []);
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
  }, [patientId]);

  const handlePickFile = () => {
    const picked = fileInputRef.current?.files?.[0];
    if (picked) setUploadForm((f) => ({ ...f, fileName: picked.name }));
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

      const res = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setManaged((prev) => [data.file, ...prev]);
        setShowUpload(false);
        setUploadForm({ notes: '', visitId: '', fileName: '' });
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
            className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:text-sm file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
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

      {(loading || fetching) ? (
        <p className="text-sm text-gray-500">Loading files...</p>
      ) : managed.length === 0 && legacyFiles.length === 0 ? (
        <EmptyState icon={FolderOpen} message="No files uploaded yet." />
      ) : (
        <div className="space-y-4">
          {managed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
                Uploaded Files
              </p>
              {managed.map((f) => (
                <div
                  key={f.fileId}
                  className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors"
                >
                  <div className="min-w-0">
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
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={accessUrl(f.r2Key, f.fileName, f.fileType)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 whitespace-nowrap"
                    >
                      Open
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
                    href={`/api/upload/visit-file/download?key=${encodeURIComponent(f.fileId)}&name=${encodeURIComponent(f.fileName)}&inline=${f.type?.startsWith('image/') ? 1 : 0}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 whitespace-nowrap"
                  >
                    Open
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
