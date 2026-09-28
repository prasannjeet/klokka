import { ResponseError, problemCodeOf, type ProblemCode } from '@klokka/api-client';
import type { MessageKey, Translator } from '@klokka/core';
import { NotAuthenticatedError } from '@/auth';

const KNOWN: readonly ProblemCode[] = [
  'VALIDATION',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'MONTH_LOCKED',
  'MEMBER_NOT_ACTIVE',
  'INVITATION_EXPIRED',
  'INVITATION_EMAIL_MISMATCH',
  'FLAG_ALREADY_OPEN',
  'NOT_IMPLEMENTED',
  'INTERNAL',
];

// The stable `code` of an RFC 9457 problem response, or a synthetic one for transport failures.
export async function problemCode(error: unknown): Promise<ProblemCode | 'NETWORK'> {
  if (error instanceof NotAuthenticatedError) return 'UNAUTHENTICATED';
  if (error instanceof ResponseError) {
    const code = await problemCodeOf(error.response);
    if (code && (KNOWN as readonly string[]).includes(code)) return code as ProblemCode;
    return error.response.status >= 500 ? 'INTERNAL' : 'VALIDATION';
  }
  if (error instanceof TypeError) return 'NETWORK';
  return 'INTERNAL';
}

// Clients localize problems with the `errors.*` keys of the catalogue (docs/CONTRACT.md).
export async function problemMessage(error: unknown, t: Translator): Promise<string> {
  const code = await problemCode(error);
  return t(`errors.${code}` as MessageKey);
}
