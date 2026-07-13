const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: isForm ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    throw new ApiRequestError(
      payload?.error?.message ?? `请求失败，状态码：${response.status}`,
      response.status,
      payload?.error?.code,
    );
  }
  return payload as T;
}

export function resolveApiUrl(url?: string) {
  if (!url || /^(https?:|blob:|data:)/i.test(url) || !API_BASE_URL) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}
