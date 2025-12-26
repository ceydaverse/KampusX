import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import Header from "../../../MainLayout/components/Header/Header";
import { GroupSidebar } from "../components/GroupSidebar";
import { ChatHeader } from "../components/ChatHeader";
import { MessageList } from "../components/MessageList";
import { MessageComposer } from "../components/MessageComposer";
import { MembersPanel } from "../components/MembersPanel";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { fetchGroups, fetchMessages, sendMessage, fetchMembers, markRead } from "../api/groupChatsApi";
import type { Group, GroupMessage, GroupMember } from "../types";
import { useSocket } from "../../../providers/SocketProvider";
import styles from "../styles/groupChats.module.css";

export default function GroupChatsPage() {
  const { grupId } = useParams<{ grupId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberNames, setMemberNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const { socket } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Grupları yükle
  const loadGroups = useCallback(async () => {
    // Gerçek login user'ı kullan
    if (!user?.id) {
      console.warn("⚠️ loadGroups - No user found, skipping");
      setLoading(false);
      return;
    }

    const userId = user.id;
    console.log("🔵 GroupChats userId used:", userId);

    try {
      setLoading(true);
      const data = await fetchGroups(userId);
      console.log("✅ loadGroups - Fetched groups:", data);
      setGroups(data);

      // URL'den grupId varsa seç, yoksa ilk grubu seç
      if (grupId) {
        const parsedId = Number(grupId);
        if (!Number.isNaN(parsedId) && data.some((g) => g.grup_id === parsedId)) {
          setSelectedGroupId(parsedId);
        } else {
          // Geçersiz grupId, ilk grubu seç
          if (data.length > 0) {
            navigate(`/kategori/grup-sohbetleri/${data[0].grup_id}`, { replace: true });
          }
        }
      } else if (data.length > 0) {
        // URL'de grupId yok, ilk grubu seç ve URL'i güncelle
        navigate(`/kategori/grup-sohbetleri/${data[0].grup_id}`, { replace: true });
      }
    } catch (err: any) {
      console.error("❌ loadGroups - Failed to load groups:", {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      
      // 500 olsa bile UI bozulmasın - mevcut listeyi silme
      // Sadece error göster (toast veya console)
      // setGroups([]) yapma - mevcut gruplar kalsın
      
      // Eğer hiç grup yoksa ve hata varsa, kullanıcıya bilgi ver
      if (groups.length === 0) {
        // İlk yüklemede hata varsa boş liste göster
        setGroups([]);
      }
      // Eğer zaten gruplar varsa, onları koru
    } finally {
      setLoading(false);
    }
  }, [user?.id, grupId, navigate]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Seçili grup değiştiğinde mesajları ve üyeleri yükle
  useEffect(() => {
    if (!selectedGroupId || !user?.id) {
      setMessages([]);
      setMembers([]);
      return;
    }

    const loadData = async () => {
      try {
        const [messagesData, membersData] = await Promise.all([
          fetchMessages(selectedGroupId, { userId: user.id }), // userId query param ekle
          fetchMembers(selectedGroupId),
        ]);

        // Mesajları unique yap (messageId ile) ve overwrite et (append etme)
        const uniqueMessages = messagesData.filter((msg, index, self) =>
          index === self.findIndex((m) => m.messageId === msg.messageId)
        );
        setMessages(uniqueMessages);
        setMembers(membersData);

        // Üye isimlerini map'le
        const names: Record<number, string> = {};
        membersData.forEach((member) => {
          if (member.ad && member.soyad) {
            names[member.kullanici_id] = `${member.ad} ${member.soyad}`;
          } else {
            names[member.kullanici_id] = `Kullanıcı ${member.kullanici_id}`;
          }
        });
        setMemberNames(names);

        // Mesajları okundu işaretle
        if (messagesData.length > 0) {
          markRead(selectedGroupId);
        }
      } catch (err) {
        console.error("Failed to load messages/members:", err);
      }
    };

    loadData();
  }, [selectedGroupId, user?.id]);

  // Socket.IO: Grup odasına katıl/ayrıl ve typing indicator
  useEffect(() => {
    if (!socket?.socket || !selectedGroupId || !user?.id) return;

    const socketInstance = socket.socket;
    socketInstance.emit("group:join", { groupId: selectedGroupId });

    // Typing indicator event'leri
    const handleTyping = (data: { groupId: number; userId: number }) => {
      if (data.groupId === selectedGroupId && data.userId !== user.id) {
        const userName = memberNames[data.userId] || `Kullanıcı ${data.userId}`;
        setTypingUsers((prev) => ({ ...prev, [data.userId]: userName }));

        // 3 saniye sonra otomatik kaldır (stopTyping gelmezse)
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
        }, 3000);
      }
    };

    const handleStopTyping = (data: { groupId: number; userId: number }) => {
      if (data.groupId === selectedGroupId && data.userId !== user.id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    // Read update event'i
    const handleReadUpdate = (data: { groupId: number }) => {
      if (data.groupId === selectedGroupId) {
        // Mesajları yeniden yükle (read receipt güncellenmesi için)
        fetchMessages(selectedGroupId).then((messagesData) => {
          setMessages(messagesData);
        });
      }
    };

    // Yeni mesaj event'i (diğer kullanıcılardan gelen)
    const handleNewMessage = (data: { groupId: number; messageId: number; senderId: number; text: string; sentAt: string }) => {
      if (data.groupId === selectedGroupId && data.senderId !== user.id) {
        // Eğer aktif gruptaysa, mesajı listeye ekle
        const newMessage: GroupMessage = {
          messageId: data.messageId,
          groupId: data.groupId,
          senderId: data.senderId,
          text: data.text,
          sentAt: data.sentAt,
          senderUsername: memberNames[data.senderId] || null,
        };
        setMessages((prev) => {
          // Duplicate kontrolü (messageId ile)
          if (prev.some(m => m.messageId === data.messageId)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        // Mesajları okundu işaretle (aktif gruptaysak)
        markRead(selectedGroupId);
      } else if (data.groupId !== selectedGroupId) {
        // Eğer aktif grup değilse, unread count'u artır
        setGroups((prev) =>
          prev.map((g) =>
            g.grup_id === data.groupId
              ? { ...g, unreadCount: (g.unreadCount || 0) + 1 }
              : g
          )
        );
      }
    };

    // Presence update event'i
    const handlePresenceUpdate = (data: { userId: number; status: 'online' | 'offline'; lastSeen?: Date }) => {
      // Online/offline durumunu state'e kaydet
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.status === 'online') {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    // Presence snapshot event'i (grup odasına katıldığımızda)
    const handlePresenceSnapshot = (data: { onlineUserIds: number[] }) => {
      // Online üyeleri state'e kaydet
      setOnlineUsers(new Set(data.onlineUserIds));
    };

    socketInstance.on("group:typing", handleTyping);
    socketInstance.on("group:stopTyping", handleStopTyping);
    socketInstance.on("group:readUpdate", handleReadUpdate);
    socketInstance.on("group:newMessage", handleNewMessage);
    socketInstance.on("presence:update", handlePresenceUpdate);
    socketInstance.on("presence:snapshot", handlePresenceSnapshot);

    return () => {
      socketInstance.emit("group:leave", { groupId: selectedGroupId });
      socketInstance.off("group:typing", handleTyping);
      socketInstance.off("group:stopTyping", handleStopTyping);
      socketInstance.off("group:readUpdate", handleReadUpdate);
      socketInstance.off("group:newMessage", handleNewMessage);
      socketInstance.off("presence:update", handlePresenceUpdate);
      socketInstance.off("presence:snapshot", handlePresenceSnapshot);
    };
  }, [socket, selectedGroupId, user?.id, memberNames]);

  const handleSelectGroup = useCallback(
    (grupId: number) => {
      setSelectedGroupId(grupId);
      navigate(`/kategori/grup-sohbetleri/${grupId}`);
    },
    [navigate]
  );

  const handleCloseChat = useCallback(() => {
    setSelectedGroupId(null);
    setMessages([]);
    setMembers([]);
    setMemberNames({});
    navigate("/kategori/grup-sohbetleri");
  }, [navigate]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!selectedGroupId || !user?.id || sending) return;

      // Optimistic update
      const tempMessageId = Date.now(); // Temporary ID
      const tempMessage: GroupMessage = {
        messageId: tempMessageId,
        groupId: selectedGroupId,
        senderId: user.id,
        text: messageText,
        sentAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      setSending(true);

      try {
        const newMessage = await sendMessage(selectedGroupId, {
          text: messageText,
        });

        // Gerçek mesajla değiştir (tempMessageId ile eşleştir)
        setMessages((prev) => prev.map((m) => (m.messageId === tempMessageId ? newMessage : m)));

        // Okundu işaretle (backend'de tüm mesajlar otomatik işaretlenir)
      } catch (err: any) {
        // Hata durumunda optimistic update'i geri al
        setMessages((prev) => prev.filter((m) => m.messageId !== tempMessageId));
        console.error("Failed to send message:", err);
        const errorMessage = err?.response?.data?.message || err?.message || "Mesaj gönderilemedi. Lütfen tekrar deneyin.";
        alert(errorMessage);
      } finally {
        setSending(false);
      }
    },
    [selectedGroupId, user?.id, sending]
  );

  const selectedGroup = groups.find((g) => g.grup_id === selectedGroupId);

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.loadingContainer}>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <GroupSidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectGroup}
          onCreateGroup={() => setCreateGroupModalOpen(true)}
        />

        <div className={styles.mainContent}>
          {selectedGroup ? (
            <>
              <ChatHeader
                group={selectedGroup}
                memberCount={members.length}
                onToggleMembers={() => setMembersPanelOpen(!membersPanelOpen)}
                onCloseChat={handleCloseChat}
              />
              <MessageList
                messages={messages}
                currentUserId={user?.id || null}
                memberNames={memberNames}
              />
              {typingUsers && Object.keys(typingUsers).length > 0 && (
                <div className={styles.typingIndicator}>
                  {Object.values(typingUsers).join(", ")} yazıyor...
                </div>
              )}
              {user ? (
                <MessageComposer
                  onSubmit={handleSendMessage}
                  disabled={sending}
                  socket={socket}
                  groupId={selectedGroupId}
                />
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
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Bir grup seçerek sohbet etmeye başlayın</p>
            </div>
          )}
        </div>

        <MembersPanel
          members={members}
          isOpen={membersPanelOpen}
          onClose={() => setMembersPanelOpen(false)}
          groupName={selectedGroup?.grup_adi}
        />

        <CreateGroupModal
          isOpen={createGroupModalOpen}
          onClose={() => setCreateGroupModalOpen(false)}
          onSuccess={async (newGrupId) => {
            console.log("✅ GroupChatsPage - Group created, grupId:", newGrupId);
            
            // Optimistic update: Yeni grubu hemen listeye ekle
            const newGroup: Group = {
              grup_id: newGrupId,
              grup_adi: "", // API'den gelecek
              lastMessage: null,
              unreadCount: 0,
            };
            setGroups((prev) => [newGroup, ...prev]);
            
            // Grupları yeniden yükle (gerçek data için)
            try {
              await loadGroups();
            } catch (err) {
              console.error("Failed to reload groups after creation:", err);
            }
            
            // Yeni gruba yönlendir
            navigate(`/kategori/grup-sohbetleri/${newGrupId}`);
          }}
        />
      </div>
    </div>
  );
}

