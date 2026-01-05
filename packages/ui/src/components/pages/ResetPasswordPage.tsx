import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { Input } from '../ui/Input';

export function ResetPasswordPage() {
  const { fetchApi } = useAdmin();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await fetchApi<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'パスワードのリセットに失敗しました');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-md w-full max-w-md">
          <div className="card-body">
            <h1 className="text-2xl font-bold text-center mb-4 text-error">無効なリンク</h1>
            <p className="text-base-content/70 text-center mb-4">
              パスワードリセットのリンクが無効です。
              もう一度リセットをリクエストしてください。
            </p>
            <Link to="/forgot-password" className="btn btn-primary w-full">
              パスワードリセットをリクエスト
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-md w-full max-w-md">
          <div className="card-body">
            <h1 className="text-2xl font-bold text-center mb-4 text-success">パスワードを変更しました</h1>
            <p className="text-base-content/70 text-center mb-4">
              パスワードが正常に変更されました。
              3秒後にログインページに移動します...
            </p>
            <Link to="/login" className="btn btn-primary w-full">
              今すぐログイン
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-center mb-2">新しいパスワードを設定</h1>
          <p className="text-base-content/70 text-center mb-4">
            新しいパスワードを入力してください。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">新しいパスワード</legend>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8文字以上"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">パスワード(確認)</legend>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="もう一度入力"
              />
            </fieldset>

            {error && <p className="text-error text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'パスワードを変更'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="link link-primary text-sm">
              ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
