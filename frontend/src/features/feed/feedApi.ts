import api from '../../lib/api';

export type TrendingQuestion = {
  soru_id: number;
  baslik: string;
  cevap_sayisi: number;
  begeni_sayisi: number;
  tarih: string; // ISO
};

export type TrendingFeedResponse = {
  items: TrendingQuestion[];
};

export async function fetchTrendingFeed(limit: number = 10): Promise<TrendingQuestion[]> {
  const response = await api.get<TrendingFeedResponse>('/api/feed/trending', {
    params: { limit },
  });
  return response.data.items || [];
}
