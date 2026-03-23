import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Base URL for the backend API.  When the frontend is deployed on Vercel and
// the backend is deployed on Render, set the VITE_API_URL environment variable
// to the Render service URL (e.g. https://my-api.onrender.com).
// Leave it empty (or unset) when both are served from the same origin.
const API_BASE_URL = ((import.meta.env.VITE_API_URL as string) || "").replace(
  /\/+$/,
  "",
);

/** Prepend the API base URL to relative paths (paths starting with '/').
 *  Absolute URLs (e.g. starting with 'http') are returned unchanged. */
function buildUrl(path: string): string {
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const token = (window as any).__auth_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(url), {
    method: "GET",
    credentials: "include",
    ...options,
    headers,
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = (window as any).__auth_token;
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(buildUrl(queryKey.join("/") as string), {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
