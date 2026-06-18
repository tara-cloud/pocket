'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'pocket_token';

export function useToken() {
  const [token, setTokenState] = useState('');

  useEffect(() => {
    setTokenState(localStorage.getItem(KEY) ?? '');
  }, []);

  const setToken = useCallback((t: string) => {
    setTokenState(t);
    localStorage.setItem(KEY, t);
  }, []);

  return [token, setToken] as const;
}
