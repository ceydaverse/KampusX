import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useTheme } from "../../../features/theme/ThemeProvider";
import { Toast } from "../../../shared/components/Toast/Toast";
import { useNotifications } from "../../../features/notifications/useNotifications";
import { NotificationsPanel } from "../../../features/notifications/components/NotificationsPanel";
import { search, type SearchResult } from "../../../services/searchService";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // unmount gecikmesi için
  const [isAuthSwitching, setIsAuthSwitching] = useState(false);
  const [menuExiting, setMenuExiting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { unreadCount } = useNotifications();

  // Scroll shrink animasyonu
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dropdown açma/kapama yönetimi
  useEffect(() => {
    if (dropdownOpen) {
      // Açılış: önce DOM'a ekle, sonra animasyonu başlat
      setMenuVisible(true);
      setMenuExiting(false);
      // requestAnimationFrame ile animasyonun düzgün çalışmasını sağla
      requestAnimationFrame(() => {
        // menuEnter class'ı otomatik uygulanacak
      });
    } else if (menuVisible) {
      // Kapanış: animasyonu başlat, sonra DOM'dan kaldır
      setMenuExiting(true);
      const timer = setTimeout(() => {
        setMenuVisible(false);
        setMenuExiting(false);
      }, 170); // 170ms sonra unmount

      return () => clearTimeout(timer);
    }
  }, [dropdownOpen, menuVisible]);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (menuVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuVisible]);

  // ESC tuşu ile kapat
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuVisible) {
          setDropdownOpen(false);
        }
        if (searchOpen) {
          setSearchOpen(false);
        }
      }
    };

    if (menuVisible) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuVisible]);

  // Dışarı tıklama - search dropdown için
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen]);

  const handleProfileClick = () => {
    navigate("/account/profile");
    setDropdownOpen(false);
  };

  const handleLikesClick = () => {
    navigate("/account/likes");
    setDropdownOpen(false);
  };

  const handleSavedClick = () => {
    navigate("/account/saved");
    setDropdownOpen(false);
  };

  const handleSecurityClick = () => {
    navigate("/account/guvenlik-gizlilik");
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    // 1. Dropdown menüyü animasyonlu kapat
    setDropdownOpen(false);

    // 2. Buton fade-out animasyonu başlat
    setIsAuthSwitching(true);
    
    // 3. 200ms sonra logout işlemini yap (buton fade-out tamamlanırken)
    setTimeout(() => {
      logout();
      
      // 4. Toast göster
      setToastMessage("Çıkış yapıldı");
      setShowToast(true);
      
      // 5. Ana sayfaya yönlendir
      navigate("/");
      
      // 6. 50ms sonra yeni buton fade-in olur (geçiş için kısa bekleme)
      setTimeout(() => {
        setIsAuthSwitching(false);
      }, 50);
    }, 200);
  };

  const handleAuthClick = () => {
    navigate("/auth");
  };

  const handleBrandClick = () => {
    navigate("/");
  };

  const handleNotificationClick = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const handleMessageClick = () => {
    navigate("/dm");
  };

  // Arama sonuçlarına git
  const handleResultNavigate = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);

    switch (result.type) {
      case "question":
        navigate(`/soru/${result.id}`);
        break;
      case "user":
        navigate(`/users/${result.id}`);
        break;
      case "group":
        navigate(`/kategori/grup-sohbetleri/${result.id}`);
        break;
      case "category":
        navigate(`/kategori/${result.id}`);
        break;
      default:
        break;
    }
  };

  // Debounce ile arama
  useEffect(() => {
    if (!searchOpen) return;

    const q = searchQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await search(q, 10);
        setSearchResults(results);
        setSearchError(null);
      } catch (err: any) {
        console.error("Search error:", err);
        setSearchError(err?.message || "Arama hatası");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchResults.length > 0) {
        handleResultNavigate(searchResults[0]);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <div className={styles.headerWrapper}>
      <header
        className={`${styles.header} ${
          isScrolled ? styles.headerScrolled : ""
        }`}
      >
        {/* Sol: KAMPÜS81 */}
        <div className={styles.brand} onClick={handleBrandClick}>
          KAMPÜS81
        </div>

        {/* Orta: arama çubuğu */}
        <div className={styles.searchWrapper} ref={searchWrapperRef}>
          <div className={styles.searchBarWrapper}>
            <span 
              className={styles.searchIcon}
              onClick={() => inputRef.current?.focus()}
            >
              🔍
            </span>
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="Arama çubuğu"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchOpen) setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          {searchOpen && (
            <div className={styles.searchDropdown}>
              {searchLoading ? (
                <div className={styles.searchMessage}>Aranıyor...</div>
              ) : searchError ? (
                <div className={styles.searchMessage}>Arama hatası: {searchError}</div>
              ) : searchQuery.trim().length < 2 ? (
                <div className={styles.searchMessage}>En az 2 karakter yazın</div>
              ) : searchResults.length === 0 ? (
                <div className={styles.searchMessage}>Sonuç bulunamadı</div>
              ) : (
                <ul className={styles.searchResults}>
                  {searchResults.map((item) => (
                    <li
                      key={`${item.type}-${item.id}`}
                      className={styles.searchResultItem}
                      onClick={() => handleResultNavigate(item)}
                    >
                      <div className={styles.searchResultType}>
                        {item.type === "question" && "Soru"}
                        {item.type === "user" && "Kullanıcı"}
                        {item.type === "group" && "Grup"}
                        {item.type === "category" && "Kategori"}
                      </div>
                      <div className={styles.searchResultTitle}>{item.title}</div>
                      {item.snippet && item.snippet.trim() && (
                        <div className={styles.searchResultSnippet}>{item.snippet}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Sağ: Giriş Yap / Üye Ol veya Hesabım */}
        <div className={styles.authWrapper}>
          <div className={styles.authButtonContainer}>
            {user ? (
              // ✅ Kullanıcı giriş yaptıysa - İkonlar + Dropdown menü
              <div
                className={`${styles.dropdownContainer} ${
                  isAuthSwitching ? styles.authFadeOut : styles.authVisible
                }`}
                ref={dropdownRef}
              >
                {/* Sağ taraftaki tüm aksiyonlar: İkonlar + Hesabım butonu */}
                <div className={styles.rightActions}>
                  {/* Tema Toggle Butonu */}
                  <button
                    className={styles.themeToggleButton}
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === "light" ? "Dark mode'a geç" : "Light mode'a geç"}
                    title={theme === "light" ? "Dark mode'a geç" : "Light mode'a geç"}
                  >
                    {theme === "light" ? "🌙" : "☀️"}
                  </button>
                  {/* Bildirim ve Mesaj İkonları */}
                  <div className={styles.notificationButtonWrapper}>
                    <button
                      className={styles.iconButton}
                      type="button"
                      onClick={handleNotificationClick}
                      aria-label="Bildirimler"
                    >
                      🔔
                    </button>
                    {unreadCount > 0 && (
                      <span className={styles.notificationBadge}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <button
                    className={styles.iconButton}
                    type="button"
                    onClick={handleMessageClick}
                    aria-label="Direct Messages"
                  >
                    ✉️
                  </button>
                  <button
                    className={styles.authButton}
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span className={styles.userIcon}>👤</span>
                    Hesabım
                  </button>
                </div>
                {menuVisible && (
                  <div
                    className={`${styles.dropdown} ${styles.menuBase} ${
                      menuExiting ? styles.menuExit : styles.menuEnter
                    }`}
                  >
                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleProfileClick}
                    >
                      Kişisel Bilgiler
                    </button>
                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleLikesClick}
                    >
                      Beğendiklerim
                    </button>
                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleSavedClick}
                    >
                      Kaydedilenler
                    </button>
                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleSecurityClick}
                    >
                      Güvenlik & Gizlilik
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      type="button"
                      onClick={handleLogout}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // ✅ Kullanıcı yoksa
              <div className={styles.rightActions}>
                {/* Tema Toggle Butonu */}
                <button
                  className={styles.themeToggleButton}
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === "light" ? "Dark mode'a geç" : "Light mode'a geç"}
                  title={theme === "light" ? "Dark mode'a geç" : "Light mode'a geç"}
                >
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
                <button
                  className={`${styles.authButton} ${
                    isAuthSwitching ? styles.authFadeIn : styles.authVisible
                  }`}
                  type="button"
                  onClick={handleAuthClick}
                >
                  <span className={styles.userIcon}>👤</span>
                  Giriş Yap / Üye Ol
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      <Toast
        message={toastMessage || ""}
        show={showToast}
        duration={3000}
        onClose={() => {
          setShowToast(false);
          setToastMessage(null);
        }}
      />
    </div>
  );
};

export default Header;
