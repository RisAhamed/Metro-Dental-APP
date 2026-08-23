'use client';

import { FolderOpen } from 'lucide-react';
import { EmptyState, formatDateDDMMM } from './shared';

export interface PatientFile {
  fileId: string;
  fileName: string;
  url: string;
  type: string;
  visitId: string;
  uploadedDate: string;
}

interface PatientFilesProps {
  files: PatientFile[];
  loading: boolean;
}

function fileKind(type: string): string {
  if (type.startsWith('image/')) return 'Image';
  if (type === 'application/pdf') return 'PDF';
  return 'File';
}

export function PatientFiles({ files, loading }: PatientFilesProps) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-blue-500" /> Files
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Files are uploaded from within visit sessions.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading files...</p>
      ) : files.length === 0 ? (
        <EmptyState icon={FolderOpen} message="No files uploaded yet." />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.fileId}
              className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors"
            >
              <div className="min-w-0">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                >
                  {f.fileName}
                </a>
                <p className="text-xs text-gray-400">
                  {fileKind(f.type)} • Uploaded {formatDateDDMMM(f.uploadedDate)}
                </p>
              </div>
              <a
                href={f.url}
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
  );
}
