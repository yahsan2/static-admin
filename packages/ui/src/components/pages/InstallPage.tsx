import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export function InstallPage() {
  const { setupAdmin, error, isLoading } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    await setupAdmin(email, password, name || undefined);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-center mb-2">Static Admin</h1>
          <p className="text-base-content/70 text-center mb-4">
            Create your admin account to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Name (optional)</legend>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Admin"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="admin@example.com"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Password</legend>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input input-bordered w-full"
                placeholder="At least 8 characters"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Confirm Password</legend>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input input-bordered w-full"
              />
            </fieldset>

            {(error || validationError) && (
              <p className="text-error text-sm">{validationError || error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'Create Admin Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
