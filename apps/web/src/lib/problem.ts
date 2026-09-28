// RFC 9457 problems from the API (through the BFF) turned into something a screen can show: the stable
// `code` picks an `errors.*` catalogue string, field errors mark form inputs. `detail` is for developers
// and never shown.
import { FetchError, ResponseError, type FieldError } from '@klokka/api-client';
import type { Translator } from '@klokka/core';

const KNOWN = [
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
  'NETWORK',
] as const;

export type ProblemKind = (typeof KNOWN)[number];

export interface ProblemInfo {
  code: ProblemKind;
  status: number | null;
  errors: FieldError[];
}

function isKnown(code: unknown): code is ProblemKind {
  return typeof code === 'string' && (KNOWN as readonly string[]).includes(code);
}

function fromStatus(status: number): ProblemKind {
  if (status === 400) return 'VALIDATION';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 410) return 'INVITATION_EXPIRED';
  if (status === 501) return 'NOT_IMPLEMENTED';
  return 'INTERNAL';
}

export async function toProblem(error: unknown): Promise<ProblemInfo> {
  if (error instanceof ResponseError) {
    const status = error.response.status;
    try {
      const body = (await error.response.clone().json()) as { code?: unknown; errors?: unknown };
      const errors = Array.isArray(body.errors) ? (body.errors as FieldError[]) : [];
      return { code: isKnown(body.code) ? body.code : fromStatus(status), status, errors };
    } catch {
      return { code: fromStatus(status), status, errors: [] };
    }
  }
  if (error instanceof FetchError || error instanceof TypeError) {
    return { code: 'NETWORK', status: null, errors: [] };
  }
  return { code: 'INTERNAL', status: null, errors: [] };
}

export function problemMessage(t: Translator, problem: ProblemInfo): string {
  const key: `errors.${ProblemKind}` = `errors.${problem.code}`;
  return t(key);
}

// A field error for `name` (exact) or any `items[3].hours` style path starting with it.
export function fieldError(problem: ProblemInfo | null, field: string): string | null {
  if (!problem) return null;
  const hit = problem.errors.find((e) => e.field === field || e.field.startsWith(`${field}.`));
  return hit ? hit.message : null;
}
