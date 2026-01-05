import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAdmin } from '../../context/AdminContext';
import { Header } from '../layout/Header';

export function UserListPage() {
  const navigate = useNavigate();
  const { fetchApi, user: currentUser } = useAdmin();
  const [page, setPage] = useState(1);

  const { users, total, isLoading, error, refetch, pagination } = useUsers({
    page,
    limit: 20,
  });

  const handleDelete = async (id: number) => {
    if (currentUser?.id === id) {
      alert('You cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    const result = await fetchApi(`/users/${id}`, { method: 'DELETE' });

    if (result.success) {
      refetch();
    } else {
      alert(result.error || 'Failed to delete user');
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div>
      <Header
        title="Users"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Users' },
        ]}
        actions={
          <Link
            to="/users/new"
            className="btn btn-primary btn-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            New User
          </Link>
        }
      />

      <div className="p-6">
        {/* Table */}
        <div className="card bg-base-100 border border-base-300 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-base-content/70">
              No users found.{' '}
              <Link to="/users/new" className="link link-primary">
                Create one
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover cursor-pointer"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <td>
                        {user.email}
                        {currentUser?.id === user.id && (
                          <span className="ml-2 text-xs text-base-content/50">(you)</span>
                        )}
                      </td>
                      <td>{user.name || '-'}</td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            user.role === 'admin'
                              ? 'badge-secondary'
                              : 'badge-ghost'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Editor'}
                        </span>
                      </td>
                      <td>{user.createdAt ? formatDate(user.createdAt) : '-'}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/users/${user.id}`);
                            }}
                            className="btn btn-ghost btn-sm btn-square"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(user.id);
                            }}
                            className="btn btn-ghost btn-sm btn-square hover:text-error"
                            title="Delete"
                            disabled={currentUser?.id === user.id}
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
              {Math.min(page * pagination.limit, total)} of {total} users
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
