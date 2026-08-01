// Production-safe API URL Resolver & Fetch Wrapper
export const getApiUrl = (endpoint: string): string => {
  const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // In the browser, always default to relative paths for same-origin Express API
  if (typeof window !== "undefined" && window.location) {
    const metaEnv = (import.meta as any).env || {};
    const envBase = (metaEnv.VITE_API_URL || "").trim();
    if (envBase && !envBase.includes("localhost") && !envBase.includes("127.0.0.1") && envBase.startsWith("http")) {
      const cleanBase = envBase.replace(/\/+$/, "");
      return `${cleanBase}${cleanPath}`;
    }
    return cleanPath;
  }

  return cleanPath;
};

export const fetchWithRetry = async (
  endpoint: string,
  options?: RequestInit,
  maxRetries = 2
): Promise<Response> => {
  const primaryUrl = getApiUrl(endpoint);
  let lastError: any = null;

  const mergedHeaders: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    ...(options?.headers as Record<string, string> || {})
  };

  const reqOptions: RequestInit = {
    ...options,
    headers: mergedHeaders
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const urlToFetch =
        attempt === 0
          ? primaryUrl
          : primaryUrl.includes("?")
          ? `${primaryUrl}&_r=${Date.now()}`
          : `${primaryUrl}?_r=${Date.now()}`;

      if (attempt > 0) {
        console.warn(`[API Fetch Retry] Attempt ${attempt + 1}/${maxRetries}: ${options?.method || "GET"} ${urlToFetch}`);
      }
      const res = await fetch(urlToFetch, reqOptions);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          lastError = new Error(`Server returned HTML (SPA fallback) instead of JSON for endpoint ${endpoint}`);
        } else {
          return res;
        }
      } else {
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      lastError = err;
    }

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError || new Error(`Failed to fetch ${endpoint} after ${maxRetries} attempts`);
};

