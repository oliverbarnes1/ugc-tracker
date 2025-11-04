'use client';

import { useState, useEffect } from 'react';

interface Creator {
  id: number;
  username: string;
  display_name: string | null;
  followers: number;
  posts_count: number;
  last_post_at: string | null;
}

interface ApiResponse {
  ok: boolean;
  items: Creator[];
  count: number;
  note?: string;
  error?: string;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/creators');
        const data: ApiResponse = await response.json();
        
        if (!data.ok) {
          setError(data.error || 'Failed to fetch creators');
          return;
        }
        
        setCreators(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Creators</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Display Name</th>
            <th>Followers</th>
            <th>Posts Count</th>
            <th>Last Post At</th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 ? (
            <tr>
              <td colSpan={6}>No creators found</td>
            </tr>
          ) : (
            creators.map((creator) => (
              <tr key={creator.id}>
                <td>{creator.id}</td>
                <td>{creator.username}</td>
                <td>{creator.display_name || '-'}</td>
                <td>{creator.followers}</td>
                <td>{creator.posts_count}</td>
                <td>{creator.last_post_at ? new Date(creator.last_post_at).toLocaleString() : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

