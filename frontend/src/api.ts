const API_BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Category {
  id: string;
  name_en: string;
  name_my: string;
  color: string;
  icon_order: number;
}

export interface Icon {
  id: string;
  category_id: string;
  label_en: string;
  label_my: string;
  image_url: string; // emoji stored here
  icon_order: number;
}

export function getCategories(): Promise<Category[]> {
  return fetchJson("/categories");
}

export function getIcons(categoryId?: string): Promise<Icon[]> {
  const qs = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : "";
  return fetchJson(`/icons${qs}`);
}

export function textToSpeech(text: string): Promise<Response> {
  return fetch(
    `${API_BASE}/tts?text=${encodeURIComponent(text)}`,
    { credentials: "include" }
  );
}
