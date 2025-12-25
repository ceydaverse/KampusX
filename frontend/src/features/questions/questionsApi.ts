import api from "../../lib/api";
import type {
  Question,
  QuestionsResponse,
  CreateQuestionRequest,
  CreateQuestionResponse,
  Answer,
  AnswersResponse,
  CreateAnswerRequest,
  CreateAnswerResponse,
  LikeResponse,
} from "./types";

export async function fetchQuestions(kategoriId: number): Promise<QuestionsResponse["items"]> {
  const response = await api.get<QuestionsResponse>("/api/questions", {
    params: { kategori_id: kategoriId },
  });
  return response.data.items;
}

export async function fetchQuestionById(questionId: number): Promise<Question> {
  const response = await api.get<{ success: boolean; item: Question }>(`/api/questions/${questionId}`);
  if (!response.data.item) {
    throw new Error("Soru bulunamadı");
  }
  return response.data.item;
}

export async function createQuestion(
  body: CreateQuestionRequest
): Promise<Question> {
  const response = await api.post<CreateQuestionResponse>("/api/questions", body);
  if (!response.data.item) {
    throw new Error(response.data.message || "Soru oluşturulamadı");
  }
  return response.data.item;
}

export async function deleteQuestion(questionId: number): Promise<void> {
  const response = await api.delete(`/api/questions/${questionId}`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Soru silinemedi");
  }
}

export async function fetchAnswers(questionId: number): Promise<Answer[]> {
  const response = await api.get<AnswersResponse>(`/api/questions/${questionId}/answers`);
  return response.data.items;
}

export async function createAnswer(
  questionId: number,
  body: CreateAnswerRequest
): Promise<Answer> {
  const response = await api.post<CreateAnswerResponse>(`/api/questions/${questionId}/answers`, body);
  if (!response.data.item) {
    throw new Error(response.data.message || "Cevap oluşturulamadı");
  }
  return response.data.item;
}

export async function toggleQuestionLike(questionId: number): Promise<LikeResponse> {
  const response = await api.post<LikeResponse>(`/api/questions/${questionId}/like`);
  return response.data;
}

export async function toggleAnswerLike(answerId: number): Promise<LikeResponse> {
  const response = await api.post<LikeResponse>(`/api/answers/${answerId}/like`);
  return response.data;
}

/**
 * Soruyu kaydet
 */
export async function saveQuestion(questionId: number): Promise<{ success: boolean; saved: boolean }> {
  const response = await api.post<{ success: boolean; saved: boolean }>(`/api/questions/${questionId}/kaydet`);
  return response.data;
}

/**
 * Soruyu kayıttan çıkar
 */
export async function unsaveQuestion(questionId: number): Promise<{ success: boolean; saved: boolean }> {
  const response = await api.delete<{ success: boolean; saved: boolean }>(`/api/questions/${questionId}/kaydet`);
  return response.data;
}

/**
 * Kaydedilen soruları getir
 */
export async function fetchSavedQuestions(): Promise<Question[]> {
  const response = await api.get<QuestionsResponse>("/api/questions/kaydedilenler");
  return response.data.items;
}

/**
 * Toplu kaydetme durumunu getir
 */
export async function fetchSavedStatus(questionIds: number[]): Promise<number[]> {
  if (questionIds.length === 0) {
    return [];
  }
  const response = await api.get<{ success: boolean; savedIds: number[] }>("/api/questions/kaydetme/durum", {
    params: { soruIds: questionIds.join(",") },
  });
  return response.data.savedIds || [];
}


