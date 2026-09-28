// Development only, behind KLOKKA_DEV_FAKE_SESSION (never in a production build): the Prism mock answers
// /me with one fixed example (an employee in two workspaces). The persona cookie reshapes that answer so
// the employer screens and the operator console can be driven against the same mock.
export const PERSONA_COOKIE = 'klokka_dev_persona';
export type Persona = 'employer' | 'employee' | 'operator';

export function personaFrom(value: string | undefined): Persona {
  return value === 'employee' || value === 'operator' ? value : 'employer';
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Rewrites the JSON body of GET /me and GET /workspaces/{id} for the persona; everything else is untouched.
export function rewriteForPersona(persona: Persona, path: string, body: unknown): unknown {
  const role = persona === 'employee' ? 'EMPLOYEE' : 'EMPLOYER';
  if (path === 'me' && isObject(body)) {
    const workspaces = Array.isArray(body.workspaces) ? body.workspaces : [];
    return {
      ...body,
      platformAdmin: persona === 'operator',
      workspaces: workspaces.map((ws) =>
        isObject(ws)
          ? {
              ...ws,
              role,
              memberCount: role === 'EMPLOYER' ? 5 : null,
              employerName: role === 'EMPLOYER' ? null : ws.employerName,
            }
          : ws,
      ),
    };
  }
  if (/^workspaces\/[^/]+$/.test(path) && isObject(body)) {
    return { ...body, myRole: role };
  }
  return body;
}
