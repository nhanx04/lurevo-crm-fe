import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  function setParam(key: string, value: string | number | boolean | undefined | null) {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  }

  function setPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  }

  return { params, setParam, setPage, searchParams };
}
