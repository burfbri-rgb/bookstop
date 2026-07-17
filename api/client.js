import * as FileSystem from "expo-file-system";
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
  const { formData, ...rest } = options;

  let headers = {};
  let body;

  if (formData) {
    body = formData;
  } else {
    headers["Content-Type"] = "application/json";
    body = rest.body ? JSON.stringify(rest.body) : undefined;
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), formData ? 30000 : 5000);
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

export async function uploadFile(path, fileUri, fieldName, extraFields) {
  const token = await getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const result = await FileSystem.uploadAsync(`${BASE}${path}`, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    parameters: extraFields,
    headers,
  });
  if (result.status >= 400) {
    throw new ApiError(result.status, result.body);
  }
  return JSON.parse(result.body);
}
