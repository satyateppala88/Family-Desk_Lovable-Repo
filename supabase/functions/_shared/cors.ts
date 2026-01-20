// Shared CORS utility for edge functions
// Restricts allowed origins to prevent cross-origin attacks

const ALLOWED_ORIGINS = [
  // Production URLs
  "https://homemate.lovable.app",
  "https://id-preview--3862c136-3a8c-457d-b6f8-bd3654b2fade.lovable.app",
  // Lovable editor
  "https://lovable.app",
  "https://lovable.dev",
  // Development
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is in our allowed list
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  );
  
  const allowedOrigin = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// For backward compatibility, export a function that creates headers from a request
export function getCorsHeadersFromRequest(req: Request): Record<string, string> {
  return getCorsHeaders(req.headers.get("origin"));
}
