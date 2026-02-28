export class AuthTimeoutError extends Error {
  constructor(message = "Authentication request timed out") {
    super(message);
    this.name = "AuthTimeoutError";
  }
}

const DEFAULT_TIMEOUT_MS = 12000;

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  timeoutMessage = "Authentication request timed out"
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new AuthTimeoutError(timeoutMessage)), timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const isAuthNetworkError = (error: unknown): boolean => {
  const message = String((error as any)?.message || error || "").toLowerCase();
  const status = Number((error as any)?.status ?? -1);

  return (
    status === 0 ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("status 0") ||
    message.includes("authretryablefetcherror") ||
    message.includes("typeerror: failed to fetch")
  );
};

export interface AuthConfigValidation {
  ok: boolean;
  url: string;
  key: string;
  message: string;
}

export const validateAuthConfig = (): AuthConfigValidation => {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const key = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

  if (import.meta.env.DEV) {
    console.log("[Auth] Supabase URL:", url || "(undefined)");
  }

  if (!url || !key) {
    return {
      ok: false,
      url,
      key,
      message: "Authentication configuration is missing. Please contact support.",
    };
  }

  if (!url.startsWith("https://")) {
    return {
      ok: false,
      url,
      key,
      message: "Authentication server must use HTTPS.",
    };
  }

  return { ok: true, url, key, message: "" };
};

export const checkAuthServerHealth = async (timeoutMs = 6000): Promise<AuthConfigValidation> => {
  const config = validateAuthConfig();
  if (!config.ok) return config;

  try {
    const response = await withTimeout(
      fetch(`${config.url}/auth/v1/health`, {
        method: "GET",
        headers: {
          apikey: config.key,
          "x-client-info": "axelguard-auth-healthcheck",
        },
      }),
      timeoutMs,
      "Auth server health check timed out"
    );

    if (!response.ok) {
      return {
        ok: false,
        url: config.url,
        key: config.key,
        message: `Auth server unreachable (status ${response.status}).`,
      };
    }

    return { ok: true, url: config.url, key: config.key, message: "" };
  } catch (error) {
    if (error instanceof AuthTimeoutError || isAuthNetworkError(error)) {
      return {
        ok: false,
        url: config.url,
        key: config.key,
        message: "Auth server unreachable. Please check your connection.",
      };
    }

    return {
      ok: false,
      url: config.url,
      key: config.key,
      message: "Authentication service is unavailable. Please try again.",
    };
  }
};
