import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trash2, ChevronRight } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useAdmin, type UserRole } from '../../context/AdminContext';

export function UserEditPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user: currentUser, fetchApi } = useAdmin();

  const isNew = !id || id === 'new';
  const { user, isLoading, error, save, remove } = useUser(isNew ? undefined : id);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'editor' as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLastAdmin, setIsLastAdmin] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name || '',
        password: '',
        confirmPassword: '',
        role: user.role || 'editor',
      });
    }
  }, [user]);

  // Check if this user is the last admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setIsLastAdmin(false);
      return;
    }

    const checkAdminCount = async () => {
      const result = await fetchApi<{ items: { role: string }[] }>('/users?limit=100');
      if (result.success && result.data) {
        const adminCount = result.data.items.filter((u) => u.role === 'admin').length;
        setIsLastAdmin(adminCount <= 1);
      }
    };

    checkAdminCount();
  }, [user, fetchApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    // Validate passwords match if provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setSaveError('Passwords do not match');
      setIsSaving(false);
      return;
    }

    // For new users, password is required
    if (isNew && !formData.password) {
      setSaveError('Password is required for new users');
      setIsSaving(false);
      return;
    }

    const dataToSave: { email: string; name?: string; password?: string; role?: UserRole } = {
      email: formData.email,
      name: formData.name || undefined,
      role: formData.role,
    };

    // Only include password if provided
    if (formData.password) {
      dataToSave.password = formData.password;
    }

    const result = await save(dataToSave);
    setIsSaving(false);

    if (result) {
      if (isNew) {
        navigate(`/users/${result.id}`);
      }
    } else {
      setSaveError('Failed to save user');
    }
  };

  const handleDelete = async () => {
    if (currentUser?.id === Number(id)) {
      alert('You cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    const success = await remove();
    if (success) {
      navigate('/users');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with breadcrumbs */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/users"
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Users
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {isNew ? 'New User' : user?.email || ''}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          {!isNew && currentUser?.id !== Number(id) && (
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {saveError}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Role field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                disabled={isLastAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {isLastAdmin
                  ? 'Cannot change role: This is the last admin user.'
                  : 'Admins can manage users. Editors can only manage content.'}
              </p>
            </div>

            {/* Password section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {isNew ? 'Set Password' : 'Change Password'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isNew ? 'Password' : 'New Password'}{' '}
                    {isNew && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={isNew}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {!isNew && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password{' '}
                    {isNew && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    required={isNew || !!formData.password}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
