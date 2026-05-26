const ALLOWED_ORIGINS = new Set([
  'https://familydesk.lovable.app',
  'https://familydesk.in',
  'https://www.familydesk.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]);

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin !== null && ALLOWED_ORIGINS.has(origin);
  const allowedOrigin = isAllowed ? origin : 'https://familydesk.in';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-test-mode, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function getCorsHeadersFromRequest(req: Request): Record<string, string> {
  return getCorsHeaders(req.headers.get('origin'));
}

export function isTestMode(req: Request): boolean {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  return environment !== 'production' && req.headers.get('x-dev-test-mode') === 'true';
}

export function getTestUserId(): string { return Deno.env.get('DEV_TEST_USER_ID') || ''; }

export function getTestHouseholdId(): string { return Deno.env.get('DEV_TEST_HOUSEHOLD_ID') || ''; }
