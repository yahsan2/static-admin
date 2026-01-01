import { useEffect, useState } from 'react';
import { createClient, type CollectionEntry } from '@static-admin/client';

// Thanks to static-admin.d.ts, types are automatically inferred!
type PostEntry = CollectionEntry<'posts'>;

const client = createClient({
  baseUrl: '/api/public',
});

export function Home() {
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const result = await client.posts
          .sort('date', 'desc')
          .page(page)
          .paginate(10);

        setPosts(result.data);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [page]);

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Blog Posts</h1>
        <a href="/admin" className="admin-link">Admin Panel →</a>
      </header>

      <div className="posts-grid">
        {posts.map((post) => (
          <article key={post.slug} className="post-card">
            <div className="post-meta">
              <span className="category">{post.data.fields.category}</span>
              <time>{post.data.fields.date}</time>
            </div>
            <h2>{post.data.fields.title}</h2>
            <p>{post.data.fields.excerpt}</p>
            {post.data.fields.tags && post.data.fields.tags.length > 0 && (
              <div className="tags">
                {post.data.fields.tags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      <style>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .header h1 {
          margin: 0;
          font-size: 2rem;
        }
        .admin-link {
          color: #6366f1;
          text-decoration: none;
        }
        .admin-link:hover {
          text-decoration: underline;
        }
        .posts-grid {
          display: grid;
          gap: 1.5rem;
        }
        .post-card {
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: box-shadow 0.2s;
        }
        .post-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .post-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .category {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .post-card h2 {
          margin: 0.5rem 0;
          font-size: 1.25rem;
        }
        .post-card p {
          margin: 0.5rem 0;
          color: #4b5563;
        }
        .tags {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .tag {
          background: #e0e7ff;
          color: #4338ca;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }
        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
        }
        .pagination button:hover:not(:disabled) {
          background: #f9fafb;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
