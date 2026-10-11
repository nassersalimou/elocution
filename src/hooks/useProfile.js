import { useState, useEffect, useCallback } from 'react';
import { getProfile } from '../services/storageService';

export function useProfile() {
  const [profile, setProfile] = useState(getProfile);

  const refresh = useCallback(() => {
    setProfile(getProfile());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  return { profile, refresh };
}

export default useProfile;
