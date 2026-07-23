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

export interface CategoryData {
  id: string;
  name_en: string;
  name_my: string;
  color: string;
  icon_order: number;
}

export interface IconData {
  id: string;
  category_id: string;
  label_en: string;
  label_my: string;
  image_url: string;
  icon_order: number;
}

export interface RecentSentence {
  id: string;
  text_my: string;
  text_en?: string;
  created_at: string;
}

export function getCategories(): Promise<CategoryData[]> {
  return fetchJson("/categories");
}

export function getIcons(categoryId?: string): Promise<IconData[]> {
  const qs = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : "";
  return fetchJson(`/icons${qs}`);
}

export function rephraseSentence(text: string): Promise<{ original: string; rephrased: string }> {
  return fetchJson("/ai/rephrase_sentence", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function textToSpeech(text: string): Promise<Response> {
  return fetch(`${API_BASE}/tts?text=${encodeURIComponent(text)}`, {
    credentials: "include",
  });
}

export function saveSentence(text_my: string, text_en?: string): Promise<{ ok: boolean }> {
  return fetchJson("/sentences/save", {
    method: "POST",
    body: JSON.stringify({ text_my, text_en }),
  });
}

export function getRecentSentences(limit = 10): Promise<RecentSentence[]> {
  return fetchJson(`/sentences/recent?limit=${limit}`);
}

export function loginUser(username: string, password: string): Promise<{ id: string; username: string; role: string }> {
  return fetchJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function registerUser(
  username: string, 
  password: string, 
  role = "caregiver",
  child_nickname = "",
  child_gender = "",
  child_birth_year = ""
): Promise<{ id: string; username: string; role: string; child_nickname?: string; child_gender?: string; child_birth_year?: string }> {
  return fetchJson("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role, child_nickname, child_gender, child_birth_year }),
  });
}

export interface SentenceAnalyticsData {
  total_sentences: number;
  daily: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  categories: Record<string, number>;
  top_words: Array<{ word: string; count: number }>;
  top_sentences: Array<{ sentence: string; count: number }>;
  daily_report: Array<{
    date: string;
    count: number;
    sentences: Array<{ text_my: string; text_en: string; time: string }>;
  }>;
  weekly_report: Array<{
    week: string;
    count: number;
    sentences: Array<{ text_my: string; text_en: string; time: string }>;
  }>;
}

export function getSentenceAnalytics(userId?: string): Promise<SentenceAnalyticsData> {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return fetchJson(`/analytics/sentences${qs}`);
}

export function changePassword(userId: string, newPassword: string): Promise<{ ok: boolean; message?: string }> {
  return fetchJson("/auth/change_password", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, new_password: newPassword }),
  });
}

export interface CustomCardData {
  id?: string;
  category: string;
  burmese: string;
  englishMeaning: string;
  emoji?: string;
  image_url?: string;
  audio_url?: string;
  card_type?: string;
}

export function saveCustomCard(card: CustomCardData): Promise<CustomCardData> {
  return fetchJson("/cards/custom", {
    method: "POST",
    body: JSON.stringify(card),
  });
}

export function getCustomCards(): Promise<CustomCardData[]> {
  return fetchJson("/cards/custom");
}

export function deleteCustomCard(id: string): Promise<{ ok: boolean }> {
  return fetchJson(`/cards/custom/${id}`, {
    method: "DELETE",
  });
}

export function updateCustomCard(id: string, card: CustomCardData): Promise<CustomCardData> {
  return fetchJson(`/cards/custom/${id}`, {
    method: "PUT",
    body: JSON.stringify(card),
  });
}

export function logEmotion(emotion: string): Promise<{ ok: boolean }> {
  return fetchJson("/emotions/log", {
    method: "POST",
    body: JSON.stringify({ emotion }),
  });
}

export interface EmotionLogEntry {
  id: string;
  user_id: string;
  emotion: string;
  timestamp: string;
}

export function getEmotionHistory(): Promise<EmotionLogEntry[]> {
  return fetchJson("/emotions/history");
}

export interface EmotionStats {
  total: number;
  counts: Record<string, number>;
  daily: Record<string, number>;
  hourly: Record<string, number>;
}

export function getEmotionStats(): Promise<EmotionStats> {
  return fetchJson("/emotions/stats");
}


