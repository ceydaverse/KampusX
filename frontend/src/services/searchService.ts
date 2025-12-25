import api from "../lib/api";

export type SearchResultType = "question" | "user" | "group" | "category";

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  snippet?: string;
  categoryId?: number | null;
  categoryName?: string | null;
}

export async function search(q: string, limit = 10): Promise<SearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const query = q.trim();
  const response = await api.get<{ success: boolean; results: SearchResult[] }>(
    "/api/search",
    {
      params: { q: query, limit },
    }
  );
  return response.data.results || [];
}



