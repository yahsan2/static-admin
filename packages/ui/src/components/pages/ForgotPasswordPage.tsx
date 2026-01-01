import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export function ForgotPasswordPage() {
  const { fetchApi } = useAdmin();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await fetchApi<{ message: string; previewUrl?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (result.success) {
        setSubmitted(true);
        if (result.data?.previewUrl) {
          setPreviewUrl(result.data.previewUrl);
        }
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-md w-full max-w-md">
          <div className="card-body">
            <h1 className="text-2xl font-bold text-center mb-4">メール送信完了</h1>
            <p className="text-base-content/70 text-center mb-4">
              入力されたメールアドレスにパスワードリセット用のリンクを送信しました。
              メールをご確認ください。
            </p>

            {previewUrl && (
              <div className="alert alert-info mb-4">
                <div>
                  <p className="text-sm mb-1">開発用メールプレビュー:</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link text-sm break-all"
                  >
                    {previewUrl}
                  </a>
                </div>
              </div>
            )}

            <Link to="/login" className="btn btn-ghost w-full">
              ログインに戻る
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
          <h1 className="text-2xl font-bold text-center mb-2">パスワードをお忘れですか?</h1>
          <p className="text-base-content/70 text-center mb-4">
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">メールアドレス</legend>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="example@email.com"
              />
            </fieldset>

            {error && <p className="text-error text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'リセットリンクを送信'}
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
