import React from 'react';
import { formatRelativeTime } from '../../../lib/utils';

export interface SaveStatusProps {
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  isNew: boolean;
}

export function SaveStatus({
  isAutoSaving,
  hasUnsavedChanges,
  lastSavedAt,
  isNew,
}: SaveStatusProps) {
  if (isAutoSaving) {
    return (
      <span className="text-xs text-base-content/50 flex items-center gap-1">
        <span className="loading loading-spinner loading-xs"></span>
        Saving...
      </span>
    );
  }

  if (hasUnsavedChanges && !isNew) {
    return <span className="text-xs text-warning">Unsaved</span>;
  }

  if (lastSavedAt && !isNew) {
    return (
      <span className="text-xs text-base-content/50">
        Saved {formatRelativeTime(lastSavedAt)}
      </span>
    );
  }

  return null;
}
