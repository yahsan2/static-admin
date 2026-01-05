import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DraftData } from '../../../hooks/useDraftStorage';
import { formatRelativeTime } from '../../../lib/utils';

export interface DraftRecoveryAlertProps {
  draft: DraftData;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryAlert({
  draft,
  onRestore,
  onDiscard,
}: DraftRecoveryAlertProps) {
  return (
    <div className="alert alert-warning mx-6 mt-4 flex justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span>Unsaved draft found ({formatRelativeTime(draft.savedAt)})</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onRestore} className="btn btn-sm btn-warning">
          Restore
        </button>
        <button onClick={onDiscard} className="btn btn-sm btn-ghost">
          Discard
        </button>
      </div>
    </div>
  );
}
