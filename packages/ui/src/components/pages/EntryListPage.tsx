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
        <p className="text-red-500">Collection not found</p>
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
        }
      />

      <div className="p-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No entries found.{' '}
              <Link
                to={`/collections/${collectionName}/new`}
                className="text-blue-600 hover:underline"
              >
                Create one
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Slug
                  </th>
                  {displayFields.map(([name, field]) => (
                    <th
                      key={name}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr
                    key={entry.slug}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/collections/${collectionName}/${entry.slug}`)
                    }
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {entry.slug}
                    </td>
                    {displayFields.map(([name]) => (
                      <td key={name} className="px-4 py-3 text-sm text-gray-600">
                        {String(
                          entry.data.fields[name as keyof typeof entry.data.fields] ||
                            ''
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/collections/${collectionName}/${entry.slug}`
                            );
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.slug);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
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
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pagination.limit + 1} -{' '}
              {Math.min(page * pagination.limit, total)} of {total} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
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
