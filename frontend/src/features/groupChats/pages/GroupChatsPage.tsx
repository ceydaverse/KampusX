import React, { useEffect, useState, useCallback } from "react";
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
          fetchMessages(selectedGroupId),
          fetchMembers(selectedGroupId),
        ]);

        setMessages(messagesData);
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
          const lastMessage = messagesData[messagesData.length - 1];
          markRead(selectedGroupId, {
            kullanici_id: user.id,
            last_mesaj_id: lastMessage.mesaj_id,
          });
        }
      } catch (err) {
        console.error("Failed to load messages/members:", err);
      }
    };

    loadData();
  }, [selectedGroupId, user?.id]);

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
      const tempMessage: GroupMessage = {
        mesaj_id: Date.now(), // Temporary ID
        grup_id: selectedGroupId,
        gonderen_id: user.id,
        mesaj: messageText,
        tarih: new Date(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      setSending(true);

      try {
        const newMessage = await sendMessage(selectedGroupId, {
          gonderen_id: user.id,
          mesaj: messageText,
        });

        // Gerçek mesajla değiştir
        setMessages((prev) => prev.map((m) => (m.mesaj_id === tempMessage.mesaj_id ? newMessage : m)));

        // Okundu işaretle
        markRead(selectedGroupId, {
          kullanici_id: user.id,
          last_mesaj_id: newMessage.mesaj_id,
        });
      } catch (err) {
        // Hata durumunda optimistic update'i geri al
        setMessages((prev) => prev.filter((m) => m.mesaj_id !== tempMessage.mesaj_id));
        console.error("Failed to send message:", err);
        alert("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
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
              {user ? (
                <MessageComposer onSubmit={handleSendMessage} disabled={sending} />
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

