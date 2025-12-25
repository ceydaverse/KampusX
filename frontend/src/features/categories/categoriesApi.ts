import api from "../../lib/api";

export interface Category {
  kategori_id: number;
  kategori_adi: string;
  ana_kategori_id?: number | null;
}

export interface CategoriesResponse {
  success: boolean;
  items: Category[];
}

export async function fetchCategories(anaKategoriId?: number): Promise<Category[]> {
  const params = anaKategoriId ? { ana_kategori_id: anaKategoriId } : {};
  const response = await api.get<CategoriesResponse>("/api/categories", { params });
  return response.data.items;
}

