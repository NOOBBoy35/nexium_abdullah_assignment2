'use client';

import { useState, useEffect } from 'react';
import ThreeScene from '@/components/ThreeScene';



export default function Home() {
  const [loadingStage, setLoadingStage] = useState<0 | 1 | 2 | 3>(0); // 0=idle, 1=sending, 2=translating, 3=complete
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
    setLoadingStage(1); // Sending to API
    setError('');
    setSummary('');
    setUrduSummary('');

    try {
      const payload: Record<string, string> = {};
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

      setLoadingStage(2); // Translating

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process text');
      }

      setSummary(data.summary);
      setUrduSummary(data.urduSummary);
      setLoadingStage(3); // Complete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoadingStage(0);
    }
  };

  return (
    <main className="min-h-screen">
      <ThreeScene
        onSubmit={handleSubmit}
        loadingStage={loadingStage}
        summary={summary}
        urduSummary={urduSummary}
        error={error}
      />
    </main>
  );
}
