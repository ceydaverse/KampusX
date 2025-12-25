import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../../../providers/SocketProvider";
import type { Message, Conversation } from "../types";
import {
  getConversations as fetchConversations,
  getMessages as fetchMessages,
  sendMessage as sendMessageApi,
  markRead,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
  type DirectMessage,
} from "../api/dmApi";
import { searchUsers, type SearchUser } from "../../users/api/usersApi";
import styles from "./DirectMessagesPage.module.css";

export default function DirectMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [rightSearchTerm, setRightSearchTerm] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocket();
  const currentRoomIdRef = useRef<number | null>(null);

  // Geri/kapat butonu handler
  const handleGoBack = () => {
    // History kontrolü: eğer history varsa geri git, yoksa ana sayfaya git
    // window.history.length > 1 kontrolü: tarayıcı history'sinde önceki sayfa var mı?
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // Mock data fallback
  const mockConversations: Conversation[] = [
    {
      conversation_id: 1,
      user_id: 2,
      user_name: "Ahmet Yılmaz",
      last_message: "Merhaba, nasılsın?",
      last_message_time: new Date(Date.now() - 1000 * 60 * 30),
      unread_count: 2,
    },
    {
      conversation_id: 2,
      user_id: 3,
      user_name: "Ayşe Demir",
      last_message: "Projeyi tamamladım!",
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      unread_count: 0,
    },
    {
      conversation_id: 3,
      user_id: 4,
      user_name: "Mehmet Kaya",
      last_message: "Yarın buluşalım mı?",
      last_message_time: new Date(Date.now() - 1000 * 60 * 60 * 24),
      unread_count: 1,
    },
  ];

  // Güvenli isim baş harfini al
  function getInitial(conv: Conversation | null | undefined): string {
    if (!conv) return "?";
    const name = (
      conv.user_name ?? 
      (conv as any).kullanici_adi ?? 
      (conv as any).adSoyad ?? 
      (conv as any).ad ?? 
      ""
    ).toString().trim();
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  // Güvenli görünen isim
  function getDisplayName(conv: Conversation | null | undefined): string {
    if (!conv) return "Bilinmeyen";
    return (
      conv.user_name ?? 
      (conv as any).kullanici_adi ?? 
      (conv as any).adSoyad ?? 
      "Bilinmeyen"
    ).toString();
  }

  // Konuşmaları yükle
  const loadConversations = async () => {
    if (!user?.id) {
      // Kullanıcı yoksa sadece mock göster, mevcut conversations'ı koruma
      setConversations(mockConversations);
      setUsingMock(true);
      return;
    }

    try {
      setConversationsError(null);
      setUsingMock(false);
      const data = await fetchConversations();
      
      // API response'u normalize et (zaten dmApi.ts içinde normalize edildi ama ekstra güvenlik)
      const raw = data;
      const items = Array.isArray(raw) ? raw : [];
      
      setConversations(items);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setConversationsError(err?.message || "DM servisine ulaşılamadı");
      // Hata durumunda boş array set et (crash olmasın)
      setConversations([]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  // Socket.IO event listeners - socket provider'dan gelen socket'i kullan
  useEffect(() => {
    if (!socket || !user?.id) {
      return;
    }

    // Yeni mesaj dinle - Handler fonksiyonu
    const handleNewMessage = (msg: any) => {
      console.log("📨 Socket: New message received:", msg);
      
      // Eğer bu mesaj seçili konuşmaya aitse, mesaj listesine ekle
      const currentRoomId = currentRoomIdRef.current;
      if (currentRoomId && msg.mesajlasma_id === currentRoomId) {
        setMessages((prev) => {
          // Duplicate kontrolü: mesaj_id ile kontrol et
          if (prev.some((m) => m.mesaj_id === msg.mesaj_id)) {
            console.log("⚠️ Duplicate message detected, skipping:", msg.mesaj_id);
            return prev;
          }
          
          // Optimistic message kontrolü: Aynı mesaj metni ve gönderen/alıcı eşleşiyorsa replace et
          // (Geçici ID'li optimistic message'ı gerçek ID ile değiştir)
          const optimisticMatch = prev.find(
            (m) =>
              m.mesaj === msg.mesaj &&
              m.gonderen_id === msg.gonderen_id &&
              m.alici_id === msg.alici_id &&
              typeof m.mesaj_id === 'number' &&
              m.mesaj_id > 1000000000000 // Date.now() ID'si (temp ID muhtemelen çok büyük)
          );
          
          if (optimisticMatch) {
            // Optimistic message'ı gerçek mesajla değiştir
            console.log("✅ Replacing optimistic message with real message:", optimisticMatch.mesaj_id, "->", msg.mesaj_id);
            return prev.map((m) =>
              m.mesaj_id === optimisticMatch.mesaj_id
                ? {
                    mesaj_id: msg.mesaj_id,
                    gonderen_id: msg.gonderen_id,
                    alici_id: msg.alici_id,
                    mesaj: msg.mesaj,
                    tarih: msg.tarih,
                    okundu_by_sender: msg.gonderen_id === user.id,
                    okundu_by_receiver: msg.alici_id === user.id && msg.okundu,
                  }
                : m
            );
          }
          
          // Yeni mesaj ekle
          const newMessage: DirectMessage = {
            mesaj_id: msg.mesaj_id,
            gonderen_id: msg.gonderen_id,
            alici_id: msg.alici_id,
            mesaj: msg.mesaj,
            tarih: msg.tarih,
            okundu_by_sender: msg.gonderen_id === user.id,
            okundu_by_receiver: msg.alici_id === user.id && msg.okundu,
          };
          
          return [...prev, newMessage];
        });
      }
      
      // Conversations listesinde lastMessage ve lastMessageAt güncelle
      setConversations((prev) => {
        const updated = [...prev];
        const convIndex = updated.findIndex(
          (c) => c.conversation_id === msg.mesajlasma_id || c.user_id === msg.alici_id || c.user_id === msg.gonderen_id
        );
        
        if (convIndex >= 0) {
          updated[convIndex] = {
            ...updated[convIndex],
            last_message: msg.mesaj,
            last_message_time: new Date(msg.tarih),
            unread_count: msg.gonderen_id !== user.id ? (updated[convIndex].unread_count || 0) + 1 : 0,
          };
          
          // En üste taşı
          const [updatedConv] = updated.splice(convIndex, 1);
          return [updatedConv, ...updated];
        }
        
        return updated;
      });
    };

    // Önceki listener'ları temizle, sonra yeni listener'ı ekle
    socket.off("dm:newMessage");
    socket.on("dm:newMessage", handleNewMessage);

    // Cleanup: Listener'ı kaldır
    return () => {
      if (socket) {
        socket.off("dm:newMessage", handleNewMessage);
        // Odadan ayrıl
        if (currentRoomIdRef.current) {
          socket.emit("dm:leave", { mesajlasmaId: currentRoomIdRef.current });
        }
      }
    };
  }, [socket, user?.id]);

  // Seçili konuşma değiştiğinde odaya katıl/ayrıl
  useEffect(() => {
    if (!socket || !selectedConversationId) {
      return;
    }

    // Seçili conversation'dan mesajlasmaId'yi bul
    const selectedConv = conversations.find(
      (c) => c.conversation_id === selectedConversationId || c.user_id === selectedConversationId
    );
    
    // mesajlasmaId'yi bul (conversation_id muhtemelen mesajlasmaId)
    const mesajlasmaId = selectedConv?.conversation_id || selectedConversationId;

    // Eski odadan ayrıl
    if (currentRoomIdRef.current && currentRoomIdRef.current !== mesajlasmaId) {
      socket.emit("dm:leave", { mesajlasmaId: currentRoomIdRef.current });
      console.log(`✅ Left room: dm-${currentRoomIdRef.current}`);
    }

    // Yeni odaya katıl
    if (mesajlasmaId) {
      socket.emit("dm:join", { mesajlasmaId });
      currentRoomIdRef.current = mesajlasmaId;
      console.log(`✅ Joined room: dm-${mesajlasmaId}`);
    }

    // Cleanup: Odadan ayrıl
    return () => {
      if (socket && currentRoomIdRef.current) {
        socket.emit("dm:leave", { mesajlasmaId: currentRoomIdRef.current });
        currentRoomIdRef.current = null;
      }
    };
  }, [selectedConversationId, conversations]);

  // Kullanıcı arama (debounce ile)
  useEffect(() => {
    if (!isComposing) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = rightSearchTerm.trim();
    console.log("[DM SEARCH] q=", query);

    // q.length < 2 ise request atma
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("[DM SEARCH] GET /api/users/search", query);
        const results = await searchUsers(query, 10);
        console.log("[DM SEARCH] status=200 data=", results);
        setSearchResults(results);
        setSearchError(null);
      } catch (err: any) {
        const status = err?.response?.status;
        const errorData = err?.response?.data;
        console.error("[DM SEARCH] error", status, errorData, err);
        
        if (status === 401) {
          setSearchError("Arama için giriş yapmalısın.");
        } else {
          const errorMessage = errorData?.message || err?.message || "Arama başarısız";
          setSearchError(`Arama hatası: ${status || 'N/A'} ${errorMessage}`);
        }
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [rightSearchTerm, isComposing]);

  // Seçili conversation'a göre mesajları yükle
  useEffect(() => {
    if (!selectedConversationId || !user?.id) {
      // selectedConversationId null ise mesajları temizle (normal davranış)
      // Ama conversations değişti diye seçimi sıfırlama!
      setMessages([]);
      setIsBlocked(false);
      setIsMuted(false);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      try {
        // selectedConversationId bir conversation_id veya userId olabilir
        // fetchMessages API'si withUserId bekliyor, bu yüzden user_id'yi bul
        const selectedConv = conversations.find(
          (c) => c.conversation_id === selectedConversationId || c.user_id === selectedConversationId
        );
        
        // Eğer conversation bulunamazsa, selectedConversationId muhtemelen bir userId'dir
        const withUserId = selectedConv?.user_id || selectedConversationId;
        
        const data = await fetchMessages(withUserId);
        setMessages(data);
        
        // Okundu işaretle
        await markRead(withUserId);

        // Engelle/sessize durumunu kontrol et
        setIsBlocked(selectedConv?.isBlocked || false);
        setIsMuted(selectedConv?.isMuted || false);
      } catch (err) {
        console.error("Failed to load messages:", err);
        // Hata olsa bile mesaj listesini boş bırak (yeni konuşma için)
        // Ama selectedConversationId'yi resetleme!
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    // conversations dependency'sini kaldır - sadece selectedConversationId değiştiğinde yükle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || !user || isBlocked || sending) return;

    // selectedConversationId bir conversation_id veya userId olabilir
    // sendMessage API'si toUserId bekliyor, bu yüzden user_id'yi bul
    const selectedConv = conversations.find(
      (c) => c.conversation_id === selectedConversationId || c.user_id === selectedConversationId
    );
    const toUserId = selectedConv?.user_id || selectedConversationId;

    const text = messageText.trim();
    const now = new Date();

    // A) Optimistic mesaj ekle
    const tempMessage: DirectMessage = {
      mesaj_id: Date.now(),
      gonderen_id: user.id,
      alici_id: toUserId,
      mesaj: text,
      tarih: now.toISOString(),
      okundu_by_sender: true,
      okundu_by_receiver: false,
    };

    setMessages((prev) => [...prev, tempMessage]);
    
    // B) Conversations listesini optimistic güncelle
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.user_id === toUserId);
      
      if (idx >= 0) {
        // Mevcut konuşmayı güncelle ve en üste taşı
        const updated = [...prev];
        const updatedConv = {
          ...updated[idx],
          last_message: text,
          last_message_time: now,
          unread_count: 0,
        };
        updated.splice(idx, 1);
        return [updatedConv, ...updated];
      } else {
        // Yeni konuşma oluştur (eğer selectedConv varsa onu kullan, yoksa yeni oluştur)
        const newConv: Conversation = selectedConv || {
          conversation_id: toUserId, // Geçici olarak userId'yi conversation_id olarak kullan
          user_id: toUserId,
          user_name: selectedConv?.user_name || `Kullanıcı ${toUserId}`,
          last_message: text,
          last_message_time: now,
          unread_count: 0,
          isBlocked: false,
          isMuted: false,
        };
        return [newConv, ...prev];
      }
    });

    // C) Seçili sohbeti KORU (asla resetleme)
    // setSelectedConversationId zaten toUserId veya conversation_id, değiştirme

    // Input'u temizle
    setMessageText("");
    setSending(true);

    try {
      const newMessage = await sendMessageApi(toUserId, text);
      
      // D) Gerçek mesajla değiştir (temp id'yi gerçek id ile değiştir)
      setMessages((prev) => prev.map((m) => (m.mesaj_id === tempMessage.mesaj_id ? newMessage : m)));
      
      // E) Konuşmaları yeniden yükle (last_message güncellensin) ama boş dönerse mevcut state'i koru
      if (user?.id) {
        try {
          const updated = await fetchConversations();
          if (updated && updated.length > 0) {
            // Gerçek data geldiyse güncelle, ama selectedConversationId'yi koru
            setConversations((prev) => {
              // Mevcut optimistic conversation'ları koru
              const optimisticConvs = prev.filter((c) => 
                typeof c.conversation_id === 'number' && c.conversation_id === c.user_id
              );
              // Gerçek data ile birleştir
              const merged = [...updated];
              optimisticConvs.forEach((optConv) => {
                if (!merged.find((c) => c.user_id === optConv.user_id)) {
                  merged.push(optConv);
                }
              });
              return merged;
            });
          }
          // Boş dönerse mevcut state'i koru (setConversations yapma)
        } catch (refreshErr) {
          console.warn("Conversations refresh failed, keeping optimistic state:", refreshErr);
          // Hata olsa bile mevcut state'i koru
        }
      }
    } catch (err: any) {
      // Hata durumunda optimistic update'i geri al
      setMessages((prev) => prev.filter((m) => m.mesaj_id !== tempMessage.mesaj_id));
      setMessageText(text); // Mesajı geri yükle
      
      // Conversations'dan da optimistic update'i geri al
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.user_id === toUserId);
        if (idx >= 0 && prev[idx].last_message === text) {
          // Eğer bu mesaj en son mesajsa, önceki duruma dön
          // (Basit: sadece last_message'ı temizle veya önceki mesajı kullan)
          // Şimdilik sadece last_message'ı boş bırak
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            last_message: prev[idx].last_message === text ? "" : prev[idx].last_message,
          };
          return updated;
        }
        return prev;
      });
      
      console.error("Failed to send message:", err);
      alert(err?.response?.data?.message || "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!selectedConversationId || !user?.id) return;

    // selectedConversationId bir conversation_id veya userId olabilir
    // mute/unmute API'si targetUserId bekliyor, bu yüzden user_id'yi bul
    const selectedConv = conversations.find(
      (c) => c.conversation_id === selectedConversationId || c.user_id === selectedConversationId
    );
    const targetUserId = selectedConv?.user_id || selectedConversationId;

    try {
      if (isMuted) {
        await unmuteUser(targetUserId);
        setIsMuted(false);
      } else {
        await muteUser(targetUserId, null); // Süresiz
        setIsMuted(true);
      }
      // Konuşmaları yeniden yükle ama boş dönerse mevcut state'i koru
      try {
        const updated = await fetchConversations();
        if (updated && updated.length > 0) {
          setConversations((prev) => {
            // Mevcut optimistic conversation'ları koru
            const optimisticConvs = prev.filter((c) => 
              typeof c.conversation_id === 'number' && c.conversation_id === c.user_id
            );
            const merged = [...updated];
            optimisticConvs.forEach((optConv) => {
              if (!merged.find((c) => c.user_id === optConv.user_id)) {
                merged.push(optConv);
              }
            });
            return merged;
          });
        }
      } catch (refreshErr) {
        console.warn("Conversations refresh failed, keeping optimistic state:", refreshErr);
      }
    } catch (err) {
      console.error("Mute toggle failed:", err);
      alert("Sessize alma işlemi başarısız");
    }
  };

  const handleBlockToggle = async () => {
    if (!selectedConversationId || !user?.id) return;

    // selectedConversationId bir conversation_id veya userId olabilir
    // block/unblock API'si targetUserId bekliyor, bu yüzden user_id'yi bul
    const selectedConv = conversations.find(
      (c) => c.conversation_id === selectedConversationId || c.user_id === selectedConversationId
    );
    const targetUserId = selectedConv?.user_id || selectedConversationId;

    const confirmMessage = isBlocked
      ? "Engeli kaldırmak istediğinize emin misiniz?"
      : "Bu kullanıcıyı engellemek istediğinize emin misiniz?";

    if (!window.confirm(confirmMessage)) return;

    try {
      if (isBlocked) {
        await unblockUser(targetUserId);
        setIsBlocked(false);
      } else {
        await blockUser(targetUserId);
        setIsBlocked(true);
      }
      // Konuşmaları yeniden yükle ama boş dönerse mevcut state'i koru
      try {
        const updated = await fetchConversations();
        if (updated && updated.length > 0) {
          setConversations((prev) => {
            // Mevcut optimistic conversation'ları koru
            const optimisticConvs = prev.filter((c) => 
              typeof c.conversation_id === 'number' && c.conversation_id === c.user_id
            );
            const merged = [...updated];
            optimisticConvs.forEach((optConv) => {
              if (!merged.find((c) => c.user_id === optConv.user_id)) {
                merged.push(optConv);
              }
            });
            return merged;
          });
        }
      } catch (refreshErr) {
        console.warn("Conversations refresh failed, keeping optimistic state:", refreshErr);
      }
    } catch (err) {
      console.error("Block toggle failed:", err);
      alert("Engelleme işlemi başarısız");
    }
  };

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "Şimdi";
    try {
      const now = new Date();
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Şimdi";
      
      const diff = now.getTime() - dateObj.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return "Şimdi";
      if (minutes < 60) return `${minutes} dk önce`;
      if (hours < 24) return `${hours} sa önce`;
      if (days < 7) return `${days} gün önce`;
      return dateObj.toLocaleDateString("tr-TR");
    } catch {
      return "Şimdi";
    }
  };

  // Seçili conversation'ı bul
  // Eğer selectedConversationId bir userId ise (temp conversation), 
  // conversations içinde user_id ile eşleşeni bul
  const selectedConversation = selectedConversationId
    ? conversations.find((c) => 
        c.conversation_id === selectedConversationId || 
        c.user_id === selectedConversationId
      ) || null
    : null;

  // Sağ panel için filtrelenmiş konuşmalar
  const filteredConversations = rightSearchTerm.trim()
    ? (conversations || []).filter((c) => {
        if (!c) return false;
        const name = getDisplayName(c).toLowerCase();
        return name.includes(rightSearchTerm.toLowerCase());
      })
    : (conversations || []);

  const handleComposeClick = () => {
    setIsComposing(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleComposeCancel = () => {
    setIsComposing(false);
    setRightSearchTerm("");
  };

  const handleUserSelect = (userId: number) => {
    console.log("🔵 handleUserSelect - userId:", userId);
    
    // Önce conversations içinde bu user ile konuşma var mı kontrol et
    const existingConversation = conversations.find(
      (c) => c.user_id === userId
    );
    
    if (existingConversation) {
      // Mevcut konuşmayı seç
      console.log("✅ handleUserSelect - Existing conversation found:", existingConversation.conversation_id);
      setSelectedConversationId(existingConversation.conversation_id);
    } else {
      // Yeni konuşma - optimistic olarak ekle
      console.log("🆕 handleUserSelect - Creating new conversation for userId:", userId);
      const tempConversation: Conversation = {
        conversation_id: userId, // Geçici olarak userId'yi conversation_id olarak kullan
        user_id: userId,
        user_name: searchResults.find(u => u.kullanici_id === userId)?.ad && searchResults.find(u => u.kullanici_id === userId)?.soyad
          ? `${searchResults.find(u => u.kullanici_id === userId)?.ad} ${searchResults.find(u => u.kullanici_id === userId)?.soyad}`
          : searchResults.find(u => u.kullanici_id === userId)?.email || `Kullanıcı ${userId}`,
        last_message: "",
        last_message_time: new Date(),
        unread_count: 0,
        isBlocked: false,
        isMuted: false,
      };
      
      // Conversations listesine ekle
      setConversations((prev) => [tempConversation, ...prev]);
      
      // Seçili conversation'ı set et
      setSelectedConversationId(userId);
    }
    
    // Compose'u kapat
    setIsComposing(false);
    setRightSearchTerm("");
    setSearchResults([]);
  };

  return (
    <div className={styles.page}>
      {conversationsError && (
        <div className={styles.errorBanner}>
          <span className={styles.errorMessage}>
            {conversationsError}. {usingMock && "Geçici mock gösteriliyor."}
          </span>
          <button
            className={styles.retryButton}
            onClick={loadConversations}
            type="button"
          >
            Yeniden Dene
          </button>
        </div>
      )}
      <div className={styles.container}>
        {/* Sol Panel - Sohbet Listesi */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeaderTop}>
            <button
              className={styles.backButton}
              onClick={handleGoBack}
              aria-label="Geri"
            >
              <span className={styles.backIcon}>←</span>
              <span className={styles.backText}>Geri</span>
            </button>
            <div className={styles.sidebarHeaderSpacer}></div>
            <button
              className={styles.closeButton}
              onClick={handleGoBack}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <div className={styles.sidebarTitleWrapper}>
            <h2 className={styles.sidebarTitle}>Mesajlar</h2>
          </div>
          <div className={styles.conversationList}>
            {!conversations || conversations.length === 0 ? (
              <div className={styles.emptyConversations}>
                <p>Henüz konuşma yok</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                if (!conversation) return null;
                const displayName = getDisplayName(conversation);
                const initial = getInitial(conversation);
                const lastMessage = conversation.last_message ?? "";
                const unreadCount = conversation.unread_count ?? 0;
                
                return (
                  <div
                    key={conversation.conversation_id || conversation.user_id || Math.random()}
                    className={`${styles.conversationItem} ${
                      selectedConversationId === conversation.conversation_id ||
                      selectedConversationId === conversation.user_id
                        ? styles.conversationItemActive
                        : ""
                    }`}
                    onClick={() => setSelectedConversationId(conversation.conversation_id || conversation.user_id)}
                  >
                    <div className={styles.conversationAvatar}>
                      {initial}
                    </div>
                    <div className={styles.conversationContent}>
                      <div className={styles.conversationHeader}>
                        <span className={styles.conversationName}>
                          {displayName}
                        </span>
                        <span className={styles.conversationTime}>
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                      <div className={styles.conversationFooter}>
                        <span className={styles.conversationLastMessage}>
                          {lastMessage || ""}
                        </span>
                        <div className={styles.conversationBadges}>
                          {conversation.isMuted && (
                            <span className={styles.muteBadgeSmall} title="Sessize alındı">
                              🔕
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className={styles.unreadBadge}>
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Orta Panel - Kişi Ara ve Yeni Mesaj */}
        <div className={styles.middlePanel}>
          <div className={styles.middlePanelHeader}>
            <h3 className={styles.middlePanelTitle}>Kişi Ara</h3>
          </div>
          <div className={styles.middlePanelContent}>
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrap}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Kişi ara..."
                  value={rightSearchTerm}
                  onChange={(e) => setRightSearchTerm(e.target.value)}
                />
              </div>
              <p className={styles.searchHint}>
                Yeni mesaj başlatmak için kişi seç.
              </p>
            </div>

            {!isComposing ? (
              <button
                className={styles.composeButton}
                onClick={handleComposeClick}
              >
                + Yeni Mesaj
              </button>
            ) : (
              <div className={styles.composeMode}>
                <div className={styles.composeHeader}>
                  <span className={styles.composeTitle}>Yeni Mesaj</span>
                  <button
                    className={styles.composeCancel}
                    onClick={handleComposeCancel}
                  >
                    İptal
                  </button>
                </div>
                <div className={styles.composeUserList}>
                  {searchLoading && (
                    <div className={styles.searchLoading}>Aranıyor...</div>
                  )}
                  
                  {searchError && (
                    <div className={styles.searchError}>{searchError}</div>
                  )}
                  
                  {!searchLoading && !searchError && rightSearchTerm.trim().length >= 2 && searchResults.length === 0 && (
                    <div className={styles.composeEmpty}>
                      <p>Kişi bulunamadı</p>
                    </div>
                  )}
                  
                  {!searchLoading && !searchError && searchResults.length > 0 && (
                    <>
                      {searchResults.map((user) => {
                        // Güvenli avatar initial
                        const userInitial = (
                          (user.ad?.toString().trim().charAt(0) || 
                           user.email?.toString().trim().charAt(0) || 
                           "").toUpperCase() || "?"
                        );
                        const userName = user.ad && user.soyad 
                          ? `${user.ad} ${user.soyad}` 
                          : (user.email || `Kullanıcı ${user.kullanici_id}`);
                        
                        return (
                          <div
                            key={user.kullanici_id}
                            className={styles.composeUserItem}
                            onClick={() => handleUserSelect(user.kullanici_id)}
                          >
                            <div className={styles.composeUserAvatar}>
                              {userInitial}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className={styles.composeUserName}>
                                {userName}
                              </div>
                              {user.email && (
                                <div className={styles.composeUserEmail}>{user.email}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  {!searchLoading && !searchError && rightSearchTerm.trim().length < 2 && (
                    <div className={styles.composeEmpty}>
                      <p>Kullanıcı aramak için en az 2 karakter yazın</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedConversation && !isComposing && selectedConversationId && (
              <>
                <div className={styles.selectedUserInfo}>
                  <div className={styles.selectedUserAvatar}>
                    {getInitial(selectedConversation)}
                  </div>
                  <div className={styles.selectedUserName}>
                    {getDisplayName(selectedConversation)}
                    {isMuted && <span className={styles.muteBadge}>🔕</span>}
                  </div>
                  <div className={styles.selectedUserStatus}>Çevrimiçi</div>
                </div>

                <div className={styles.userActions}>
                  <button
                    className={`${styles.actionButton} ${isMuted ? styles.actionButtonActive : ""}`}
                    onClick={handleMuteToggle}
                    title={isMuted ? "Sessize almayı kaldır" : "Sessize al"}
                  >
                    {isMuted ? "🔔 Sessize Alındı" : "🔕 Sessize Al"}
                  </button>
                  <button
                    className={`${styles.actionButton} ${isBlocked ? styles.actionButtonDanger : ""}`}
                    onClick={handleBlockToggle}
                    title={isBlocked ? "Engeli kaldır" : "Engelle"}
                  >
                    {isBlocked ? "🔓 Engeli Kaldır" : "🚫 Engelle"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sağ Panel - Chat Alanı */}
        {selectedConversationId && selectedConversation && (
          <div className={styles.mainContent}>
            {/* Mesaj Başlığı */}
            <div className={styles.messageHeader}>
              <div className={styles.messageHeaderLeft}>
                <button
                  className={styles.backButton}
                  onClick={handleGoBack}
                  aria-label="Geri"
                >
                  <span className={styles.backIcon}>←</span>
                  <span className={styles.backText}>Geri</span>
                </button>
                <div className={styles.messageHeaderInfo}>
                  <div className={styles.messageAvatar}>
                    {getInitial(selectedConversation)}
                  </div>
                  <div>
                    <h3 className={styles.messageHeaderName}>
                      {getDisplayName(selectedConversation)}
                    </h3>
                    <span className={styles.messageHeaderStatus}>Çevrimiçi</span>
                  </div>
                </div>
              </div>
              <button
                className={styles.closeButton}
                onClick={handleGoBack}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {/* Mesaj Listesi */}
            <div className={styles.messagesContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <p>Mesajlar yükleniyor...</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.gonderen_id === user?.id;
                  const isRead = isOwn
                    ? message.okundu_by_receiver
                    : message.okundu_by_sender;
                  // Benzersiz key: mesaj_id varsa onu kullan, yoksa tarih+gonderen_id+index kombinasyonu
                  const messageKey = message.mesaj_id 
                    ? message.mesaj_id 
                    : `${message.tarih}-${message.gonderen_id}-${index}`;
                  return (
                    <div
                      key={messageKey}
                      className={`${styles.messageBubble} ${
                        isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
                      }`}
                    >
                      <div className={styles.messageContent}>
                        <p className={styles.messageText}>{message.mesaj}</p>
                        <div className={styles.messageFooter}>
                          <span className={styles.messageTime}>
                            {new Date(message.tarih).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOwn && (
                            <span className={styles.readStatus}>
                              {isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mesaj Input */}
            {user ? (
              <div className={styles.messageInputContainer}>
                {isBlocked && (
                  <div className={styles.blockedWarning}>
                    <p>Bu kullanıcıyı engellediniz. Engeli kaldırmadan mesaj atamazsınız.</p>
                  </div>
                )}
                <input
                  type="text"
                  className={styles.messageInput}
                  placeholder={isBlocked ? "Engeli kaldırmadan mesaj atamazsınız" : "Mesaj yazın..."}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isBlocked || sending}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isBlocked && !sending) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  className={styles.sendButton}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isBlocked || sending}
                >
                  {sending ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            ) : (
              <div className={styles.loginPrompt}>
                <p>
                  Mesaj göndermek için{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className={styles.linkButton}
                  >
                    giriş yapın
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

