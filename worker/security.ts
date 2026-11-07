export const BODY_LIMIT = 16 * 1024;
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; frame-src https://osint-neural-atlas.pages.dev",
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: { ...securityHeaders, "Cache-Control": "no-store", ...headers },
  });
}

export function sameOrigin(request: Request, siteOrigin: string) {
  let configured: URL;
  try {
    configured = new URL(siteOrigin);
  } catch {
    throw new HttpError(503, "Contact is not configured.");
  }
  if (
    configured.origin !== siteOrigin ||
    configured.username ||
    configured.password ||
    !["http:", "https:"].includes(configured.protocol)
  )
    throw new HttpError(503, "Contact is not configured.");
  // Origin is mandatory. JSON + a non-simple UUID header also prevents HTML form CSRF.
  if (
    request.headers.get("Origin") !== siteOrigin ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    throw new HttpError(403, "This origin is not allowed.");
}

export async function boundedJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new HttpError(415, "Send a JSON request.");
  if (request.headers.has("Content-Encoding"))
    throw new HttpError(415, "Encoded request bodies are not supported.");
  const length = request.headers.get("Content-Length");
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT))
    throw new HttpError(413, "Message is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Invalid JSON.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        await reader.cancel();
        throw new HttpError(413, "Message is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    );
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export async function digest(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
