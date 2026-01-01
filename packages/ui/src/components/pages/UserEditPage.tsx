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

    // For new users only: validate passwords
    if (isNew) {
      if (!formData.password) {
        setSaveError('Password is required for new users');
        setIsSaving(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setSaveError('Passwords do not match');
        setIsSaving(false);
        return;
      }
    }

    const dataToSave: { email: string; name?: string; password?: string; role?: UserRole } = {
      email: formData.email,
      name: formData.name || undefined,
      role: formData.role,
    };

    // Only include password for new users
    if (isNew && formData.password) {
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-base-300 bg-base-100">
        <div className="breadcrumbs text-sm">
          <ul>
            <li><Link to="/users">Users</Link></li>
            <li>{isNew ? 'New User' : user?.email || ''}</li>
          </ul>
        </div>

        <div className="flex items-center gap-1">
          {!isNew && currentUser?.id !== Number(id) && (
            <button
              onClick={handleDelete}
              className="btn btn-ghost btn-sm btn-square hover:text-error"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving ? <span className="loading loading-spinner loading-xs"></span> : 'Save'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : error ? (
          <div className="text-error">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
            {saveError && (
              <div className="alert alert-error">
                <span>{saveError}</span>
              </div>
            )}

            {/* Email field */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Email <span className="text-error">*</span>
              </legend>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="input input-bordered w-full"
              />
            </fieldset>

            {/* Name field */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Name</legend>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered w-full"
              />
            </fieldset>

            {/* Role field */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Role <span className="text-error">*</span>
              </legend>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                disabled={isLastAdmin}
                className="select select-bordered w-full"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-base-content/70 mt-1">
                {isLastAdmin
                  ? 'Cannot change role: This is the last admin user.'
                  : 'Admins can manage users. Editors can only manage content.'}
              </p>
            </fieldset>

            {/* Password section - only for new users */}
            {isNew && (
              <div className="border-t border-base-300 pt-6">
                <h3 className="text-sm font-medium mb-4">
                  Set Password
                </h3>

                <div className="space-y-4">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Password <span className="text-error">*</span>
                    </legend>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      className="input input-bordered w-full"
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Confirm Password <span className="text-error">*</span>
                    </legend>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
                      className="input input-bordered w-full"
                    />
                  </fieldset>
                </div>
              </div>
            )}

            {/* Password reset info - only for existing users */}
            {!isNew && (
              <div className="border-t border-base-300 pt-6">
                <p className="text-sm text-base-content/70">
                  パスワードを変更するには、ログイン画面の「パスワードをお忘れですか?」からリセットしてください。
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
