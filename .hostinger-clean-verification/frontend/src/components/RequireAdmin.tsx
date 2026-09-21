import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminFetch, clearAdminSession, getAccessToken, getAdminSession, saveAdminSession, type AdminSession } from '../auth';
import { apiUrl } from '../config/api';

type RequireAdminProps = { children: ReactNode };
type AccessStatus = 'checking' | 'allowed' | 'denied';

export default function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const [status, setStatus] = useState<AccessStatus>(() => (
    getAdminSession() && getAccessToken() ? 'checking' : 'denied'
  ));

  useEffect(() => {
    if (status !== 'checking') return undefined;

    let isCancelled = false;

    async function validateAccess() {
      try {
        const token = getAccessToken();
        if (!token) throw new Error('Token ausente.');

        const response = await adminFetch(apiUrl('/api/admin/session'));
        const data = await response.json() as { usuario?: AdminSession; erro?: string };
        if (!response.ok || !data.usuario) throw new Error(data.erro || 'Sessão inválida.');

        saveAdminSession(data.usuario, token);
        if (!isCancelled) setStatus('allowed');
      } catch {
        clearAdminSession();
        if (!isCancelled) setStatus('denied');
      }
    }

    void validateAccess();
    return () => { isCancelled = true; };
  }, [status]);

  if (status === 'denied') {
    return <Navigate replace state={{ from: location }} to="/dash" />;
  }

  return status === 'allowed' ? children : null;
}
