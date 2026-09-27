// @klokka/api-client: the ONE client for the Klokka API (docs/DECISIONS.md D13). Everything under
// ./generated is produced from apps/api/contract/src/main/openapi/openapi.yaml; this file only wires the
// generated API classes to one Configuration.
//
//   web (BFF):   createApi({ basePath: '/api/k' })                       the route handler adds the bearer
//   mobile:      createApi({ basePath: EXPO_PUBLIC_API_BASE_URL, accessToken: () => broker.get() })
//   mock:        createApi({ basePath: 'http://localhost:4010' })         Prism serves paths without /v1
import {
  Configuration,
  EntriesApi,
  FlagsApi,
  InsightsApi,
  InvitationsApi,
  MeApi,
  MembersApi,
  MonthsApi,
  NotificationsApi,
  OperatorApi,
  WebhooksApi,
  WorkspacesApi,
  type ConfigurationParameters,
  type FetchAPI,
  type Middleware,
} from './generated/index.ts';

export * from './generated/index.ts';

export interface CreateApiOptions {
  // The API origin plus `/v1` for the real API (`https://klokka-api.coolify.ooguy.com/v1`), the BFF
  // prefix on the web (`/api/k`), or the Prism origin (`http://localhost:4010`).
  basePath: string;
  // A fetch implementation; defaults to the global fetch.
  fetchApi?: FetchAPI;
  // The bearer token, or a function that returns one (mobile's token broker). Omit on the web.
  accessToken?: ConfigurationParameters['accessToken'];
  middleware?: Middleware[];
  headers?: Record<string, string>;
}

export interface KlokkaApi {
  configuration: Configuration;
  me: MeApi;
  workspaces: WorkspacesApi;
  members: MembersApi;
  invitations: InvitationsApi;
  entries: EntriesApi;
  months: MonthsApi;
  insights: InsightsApi;
  flags: FlagsApi;
  notifications: NotificationsApi;
  operator: OperatorApi;
  webhooks: WebhooksApi;
}

export function createApi(options: CreateApiOptions): KlokkaApi {
  const params: ConfigurationParameters = {
    basePath: options.basePath.replace(/\/+$/, ''),
  };
  if (options.fetchApi) params.fetchApi = options.fetchApi;
  if (options.accessToken !== undefined) params.accessToken = options.accessToken;
  if (options.middleware) params.middleware = options.middleware;
  if (options.headers) params.headers = options.headers;
  const configuration = new Configuration(params);
  return {
    configuration,
    me: new MeApi(configuration),
    workspaces: new WorkspacesApi(configuration),
    members: new MembersApi(configuration),
    invitations: new InvitationsApi(configuration),
    entries: new EntriesApi(configuration),
    months: new MonthsApi(configuration),
    insights: new InsightsApi(configuration),
    flags: new FlagsApi(configuration),
    notifications: new NotificationsApi(configuration),
    operator: new OperatorApi(configuration),
    webhooks: new WebhooksApi(configuration),
  };
}

// The `code` of an RFC 9457 problem response, or null when the body is not a Klokka problem.
export async function problemCodeOf(response: Response): Promise<string | null> {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) return null;
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return typeof body.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}
