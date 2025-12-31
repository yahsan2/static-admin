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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">メール送信完了</h1>
          <p className="text-gray-600 text-center mb-6">
            入力されたメールアドレスにパスワードリセット用のリンクを送信しました。
            メールをご確認ください。
          </p>

          {previewUrl && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800 mb-2">開発用メールプレビュー:</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {previewUrl}
              </a>
            </div>
          )}

          <Link
            to="/login"
            className="block w-full text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            ログインに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">パスワードをお忘れですか?</h1>
        <p className="text-gray-600 text-center mb-6">
          登録したメールアドレスを入力してください。
          パスワードリセット用のリンクをお送りします。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="example@email.com"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '送信中...' : 'リセットリンクを送信'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
