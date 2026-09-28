// The browser's API client: the generated contract client pointed at the same-origin BFF, which adds the
// bearer token (docs/DECISIONS.md D1, docs/research/web.md section 2).
import { createApi } from '@klokka/api-client';

export const api = createApi({ basePath: '/api/k' });

// The BFF URL of a contract path, for plain links (CSV downloads).
export function bffUrl(path: string): string {
  return `/api/k/${path.replace(/^\/+/, '')}`;
}
