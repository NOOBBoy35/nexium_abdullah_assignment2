'use client';

import { useState, useEffect } from 'react';
import ThreeScene from '@/components/ThreeScene';



export default function Home() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [urduSummary, setUrduSummary] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    function handleClear() {
      setSummary('');
      setUrduSummary('');
    }
    window.addEventListener('clearSummaries', handleClear);
    return () => window.removeEventListener('clearSummaries', handleClear);
  }, []);

  // Accept inputMode and value from ThreeScene
  const handleSubmit = async (input: { mode: 'text'|'url', value: string }) => {
    setLoading(true);
    setError('');
    setSummary('');
    setUrduSummary('');

    try {
      let payload: any = {};
      if (input.mode === 'url') {
        payload.url = input.value;
      } else {
        payload.text = input.value;
      }
      const response = await fetch('/api/summarise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process text');
      }

      setSummary(data.summary);
      setUrduSummary(data.urduSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <ThreeScene
        onSubmit={handleSubmit}
        loading={loading}
        summary={summary}
        urduSummary={urduSummary}
        error={error}
      />
      </main>
  );
}
