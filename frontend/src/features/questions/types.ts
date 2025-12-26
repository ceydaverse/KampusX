// Soru yazarı bilgisi
export type QuestionAuthor = {
  id: number;
  username: string;
  ad?: string;
  soyad?: string;
  universite?: string | null;
  bolum?: string | null;
};

// Soru modeli (DB alanlarına göre)
export type Question = {
  soru_id: number;
  kullanici_id: number;
  kategori_id: number;
  baslik: string;
  soru_metin: string;
  tarih: string; // ISO string
  etiketler?: string | null; // Virgülle ayrılmış string veya null
  likeCount?: number;
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
  cevap_sayisi?: number; // Cevap sayısı (backend'den gelir)
  author?: QuestionAuthor;
};

// Cevap modeli
export type Answer = {
  cevap_id: number;
  soru_id: number;
  kullanici_id: number;
  parent_cevap_id: number | null;
  cevap_metin: string;
  tarih: string;
  likeCount?: number;
  isLikedByMe?: boolean;
  children?: Answer[];
  author?: QuestionAuthor;
};

// Listeleme response (backend nasıl dönüyorsa uyumlu)
export type QuestionsResponse = {
  success: boolean;
  items: Question[];
};

// Yeni soru oluşturma isteği
export type CreateQuestionRequest = {
  kategori_id: number;
  kullanici_id: number;
  baslik: string;
  soru_metin: string;
  etiketler?: string[];
};

// Yeni soru oluşturma response
export type CreateQuestionResponse = {
  success: boolean;
  item?: Question;
  message?: string;
};

// Cevap response
export type AnswersResponse = {
  success: boolean;
  items: Answer[];
};

export type CreateAnswerRequest = {
  cevap_metin: string;
  parent_cevap_id?: number | null;
};

export type CreateAnswerResponse = {
  success: boolean;
  item?: Answer;
  message?: string;
};

// Like response
export type LikeResponse = {
  success: boolean;
  liked: boolean;
  likeCount: number;
};

// Beğeniler response
export type MyLikesResponse = {
  success: boolean;
  questions: Array<{
    soru_id: number;
    baslik: string;
    soru_metin: string;
    tarih: string;
    kategori_id: number;
    begeni_tarihi: string;
  }>;
  answers: Array<{
    cevap_id: number;
    cevap_metin: string;
    tarih: string;
    soru_id: number;
    parent_cevap_id: number | null;
    begeni_tarihi: string;
  }>;
};
