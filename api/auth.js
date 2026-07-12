import { api } from "./client";

export function register(email, password) {
  return api("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function login(email, password) {
  return api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}
