import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ResponseError, type Me } from '@klokka/api-client';
import { serverApi } from './session';

function isLogtoError(error: unknown): boolean {
  return error instanceof Error && /^Logto/.test(error.name);
}

// GET /me once per request (layout and page share it). A rejected or missing token sends the user to sign in.
export const loadMe = cache(async (): Promise<Me> => {
  try {
    return await (await serverApi()).me.getMe();
  } catch (error) {
    if ((error instanceof ResponseError && error.response.status === 401) || isLogtoError(error)) {
      redirect('/sign-in?reauth=1');
    }
    throw error;
  }
});
