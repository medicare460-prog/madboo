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
  maxRetries = 3
): Promise<Response> => {
  const primaryUrl = getApiUrl(endpoint);
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const urlToFetch =
        attempt === 0
          ? primaryUrl
          : primaryUrl.includes("?")
          ? `${primaryUrl}&_r=${Date.now()}`
          : `${primaryUrl}?_r=${Date.now()}`;

      console.log(`[API Fetch] Attempt ${attempt + 1}/${maxRetries}: ${options?.method || "GET"} ${urlToFetch}`);
      const res = await fetch(urlToFetch, options);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          console.warn(`[API Fetch] Endpoint ${urlToFetch} returned HTML instead of JSON. Retrying or falling back.`);
          lastError = new Error(`Server returned HTML (SPA fallback) instead of JSON for endpoint ${endpoint}`);
        } else {
          return res;
        }
      }

      // If status is 404 on attempt 0 for product routes, retry with alternative path alias
      if (res.status === 404 && (endpoint.includes("/products") || endpoint.includes("/api/products"))) {
        const fallbacks = ["/api/products", "/products", "/api/catalog", "/api/products/all"];
        for (const fb of fallbacks) {
          if (fb !== endpoint) {
            try {
              const fbRes = await fetch(fb, options);
              if (fbRes.ok) {
                console.log(`[API Fetch] Successfully resolved product catalog using fallback endpoint: ${fb}`);
                return fbRes;
              }
            } catch (e) {
              // Ignore inner fallback error
            }
          }
        }
      }

      console.warn(`[API Fetch] Attempt ${attempt + 1} returned status ${res.status} ${res.statusText}`);
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: any) {
      console.error(`[API Fetch] Attempt ${attempt + 1} network exception:`, err);
      lastError = err;
    }

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  // Fallback try with raw relative path if endpoint is product-related
  if (endpoint.includes("products")) {
    try {
      const directRes = await fetch("/api/products");
      if (directRes.ok) return directRes;
    } catch (e) {
      // Ignore
    }
  }

  throw lastError || new Error(`Failed to fetch ${endpoint} after ${maxRetries} attempts`);
};

