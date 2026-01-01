import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import { useConfig } from '../../hooks/useConfig';
import { useAdmin } from '../../context/AdminContext';
import { Header } from '../layout/Header';
import { cn } from '../../lib/utils';

export function EntryListPage() {
  const { collection: collectionName } = useParams<{ collection: string }>();
  const navigate = useNavigate();
  const { getCollection } = useConfig();
  const { fetchApi } = useAdmin();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const collection = collectionName ? getCollection(collectionName) : undefined;
  const { entries, total, isLoading, error, refetch, pagination } = useCollection(
    collectionName || '',
    { page, search, limit: 20 }
  );

  if (!collection) {
    return (
      <div className="p-6">
        <p className="text-error">Collection not found</p>
      </div>
    );
  }

  const handleDelete = async (slug: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    const result = await fetchApi(`/entries/${collectionName}/${slug}`, {
      method: 'DELETE',
    });

    if (result.success) {
      refetch();
    } else {
      alert(result.error || 'Failed to delete entry');
    }
  };

  const displayFields = Object.entries(collection.config.schema)
    .filter(([_, field]) => field.type === 'text' || field.type === 'date')
    .slice(0, 3);

  return (
    <div>
      <Header
        title={collection.config.label}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: collection.config.label },
        ]}
        actions={
          <Link
            to={`/collections/${collectionName}/new`}
            className="btn btn-primary btn-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
        }
      />

      <div className="p-6">
        {/* Search */}
        <div className="mb-4">
          <label className="input input-bordered flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-base-content/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search entries..."
              className="grow"
            />
          </label>
        </div>

        {/* Table */}
        <div className="card bg-base-100 border border-base-300 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-base-content/70">
              No entries found.{' '}
              <Link
                to={`/collections/${collectionName}/new`}
                className="link link-primary"
              >
                Create one
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Slug</th>
                    {displayFields.map(([name, field]) => (
                      <th key={name}>{field.label}</th>
                    ))}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.slug}
                      className="hover cursor-pointer"
                      onClick={() =>
                        navigate(`/collections/${collectionName}/${entry.slug}`)
                      }
                    >
                      <td className="font-mono">{entry.slug}</td>
                      {displayFields.map(([name]) => (
                        <td key={name}>
                          {String(
                            entry.data.fields[name as keyof typeof entry.data.fields] ||
                              ''
                          )}
                        </td>
                      ))}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/collections/${collectionName}/${entry.slug}`
                              );
                            }}
                            className="btn btn-ghost btn-sm btn-square"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.slug);
                            }}
                            className="btn btn-ghost btn-sm btn-square hover:text-error"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {(page - 1) * pagination.limit + 1} -{' '}
              {Math.min(page * pagination.limit, total)} of {total} entries
            </p>
            <div className="join">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="join-item btn btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="join-item btn btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
