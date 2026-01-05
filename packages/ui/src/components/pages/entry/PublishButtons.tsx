import React from 'react';

export interface PublishButtonsProps {
  isDraft: boolean;
  isNew: boolean;
  isDisabled: boolean;
  isSaving: boolean;
  onCommit: (fieldsOverride?: Record<string, unknown>) => void;
}

export function PublishButtons({
  isDraft,
  isNew,
  isDisabled,
  isSaving,
  onCommit,
}: PublishButtonsProps) {
  const spinner = <span className="loading loading-spinner loading-xs"></span>;

  if (isNew) {
    return (
      <>
        <button
          onClick={() => onCommit({ draft: true })}
          disabled={isDisabled}
          className="btn btn-ghost btn-sm"
        >
          {isSaving ? spinner : 'Save Draft'}
        </button>
        <button
          onClick={() => onCommit({ draft: false })}
          disabled={isDisabled}
          className="btn btn-primary btn-sm"
        >
          {isSaving ? spinner : 'Publish'}
        </button>
      </>
    );
  }

  if (isDraft) {
    return (
      <>
        <button
          onClick={() => onCommit()}
          disabled={isDisabled}
          className="btn btn-ghost btn-sm"
        >
          {isSaving ? spinner : 'Save Draft'}
        </button>
        <button
          onClick={() => onCommit({ draft: false })}
          disabled={isDisabled}
          className="btn btn-primary btn-sm"
        >
          {isSaving ? spinner : 'Publish'}
        </button>
      </>
    );
  }

  // Published
  return (
    <>
      <button
        onClick={() => onCommit({ draft: true })}
        disabled={isDisabled}
        className="btn btn-ghost btn-sm"
      >
        {isSaving ? spinner : 'Unpublish'}
      </button>
      <button
        onClick={() => onCommit()}
        disabled={isDisabled}
        className="btn btn-primary btn-sm"
      >
        {isSaving ? spinner : 'Update'}
      </button>
    </>
  );
}
