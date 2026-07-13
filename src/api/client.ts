export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: isForm ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) throw new ApiError(payload?.error?.code ?? String(response.status), payload?.error?.message ?? "Request failed.");
  return payload as T;
}
