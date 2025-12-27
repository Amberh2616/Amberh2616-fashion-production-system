/**
 * Approve Revision API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v2';

export async function approveRevision(revisionId: string) {
  const res = await fetch(`${API_BASE}/revisions/${revisionId}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Approve failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}
