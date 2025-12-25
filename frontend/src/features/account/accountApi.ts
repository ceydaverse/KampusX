import api from "../../lib/api";
import type { MyLikesResponse } from "../questions/types";

export async function fetchMyLikes(userId?: number): Promise<MyLikesResponse> {
  const params = userId ? { kullaniciId: userId } : {};
  const response = await api.get<MyLikesResponse>("/api/users/me/likes", { params });
  return response.data;
}




