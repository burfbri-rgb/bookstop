import { getItem } from "../context/storage";

const BASE = "https://bookstop-1.onrender.com";

export class ApiError extends Error {
  constructor(status, body) {
    super(`${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, options = {}) {
  const token = await getItem("token");
  const { file, formData, ...rest } = options;

  let headers = {};
  let body;

  if (file || formData) {
    body = file || formData;
  } else {
    headers["Content-Type"] = "application/json";
    body = rest.body ? JSON.stringify(rest.body) : undefined;
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...rest, headers, body, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/csv")) {
      return res.text();
    }
    if (res.status === 204) return null;
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}
