import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { ApiError } from "../api/client";
import { deleteAdminAd, getAdminAds } from "../api/ads";
import { getAdminServices, deleteAdminService } from "../api/services";
import { getAdminAdChats, getAdminAdChat } from "../api/adChat";
import { verifyUser, getAdminOrders, approveAdminOrder, getAdminStats, getAdminUsers, deleteAdminUser, blockAdminUser } from "../api/admin";
import type { AdminOrder, AdminStats, AdminUser } from "../api/admin";
import type { Ad, User, Service } from "../types";
import { formatPrice } from "../lib/formatters";

type AdminAdsPageProps = {
  token: string | null;
  user: User | null;
};

export function AdminAdsPage({ token, user }: AdminAdsPageProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "ads" | "users" | "chats" | "services" | "orders">("dashboard");
  const [ads, setAds] = useState<Ad[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    let isActive = true;
    setIsLoading(true);
    setError("");

    if (activeTab === "dashboard") {
      getAdminStats(token)
        .then((data) => {
          if (isActive) setStats(data);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    } else if (activeTab === "users") {
      getAdminUsers(token, userFilter || undefined)
        .then((items) => {
          if (isActive) setAdminUsers(items);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    } else if (activeTab === "ads") {
      getAdminAds(token)
        .then((items) => {
          if (isActive) setAds(items);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    } else if (activeTab === "services") {
      getAdminServices(token)
        .then((items) => {
          if (isActive) setServices(items);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    } else if (activeTab === "orders") {
      getAdminOrders(token)
        .then((items) => {
          if (isActive) setOrders(items);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    } else {
      getAdminAdChats(token)
        .then((items) => {
          if (isActive) setChats(items);
        })
        .catch(handleErrors)
        .finally(() => {
          if (isActive) setIsLoading(false);
        });
    }

    function handleErrors(err: unknown) {
      if (err instanceof ApiError && isActive) {
        setError(err.message);
      }
    }

    return () => {
      isActive = false;
    };
  }, [token, user?.isAdmin, activeTab, userFilter]);

  async function loadChatDetails(adId: number) {
    if (!token) return;
    setIsLoading(true);
    setSelectedChat(null);
    try {
      const data = await getAdminAdChat(adId, token);
      setSelectedChat(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="section-grid">
        <p className="error-box">{t("admin.auth_warning")}</p>
        <Link className="primary" to="/profile">
          {t("publish.login_btn")}
        </Link>
      </section>
    );
  }

  if (!user?.isAdmin) {
    return (
      <section className="section-grid">
        <p className="error-box">{t("admin.no_access")}</p>
        <Link className="ghost" to="/">
          {t("admin.btn.home")}
        </Link>
      </section>
    );
  }

  async function handleDelete(adId: number) {
    if (!token) return;
    setError("");
    try {
      await deleteAdminAd(adId, token);
      setAds((prev) => prev.filter((ad) => ad.id !== adId));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  async function handleVerify(userId: number, verified: boolean) {
    if (!token) return;
    setError("");
    try {
      await verifyUser(userId, token, verified);
      setAds((prev) =>
        prev.map((ad) =>
          ad.user?.id === userId
            ? { ...ad, user: { ...ad.user, verified } }
            : ad
        )
      );
      setServices((prev) =>
        prev.map((service) =>
          service.user?.id === userId
            ? { ...service, user: { ...service.user, verified } }
            : service
        )
      );
      setAdminUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isVerified: verified, verificationStatus: verified ? "approved" : "rejected" }
            : u
        )
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  async function handleDeleteService(serviceId: number) {
    if (!token) return;
    setError("");
    try {
      await deleteAdminService(serviceId, token);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  async function handleApproveOrder(orderId: number) {
    if (!token) return;
    setError("");
    try {
      await approveAdminOrder(orderId, token);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "completed" } : o));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!token) return;
    setError("");
    try {
      await deleteAdminUser(userId, token);
      setAdminUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  async function handleBlockUser(userId: number, blocked: boolean) {
    if (!token) return;
    setError("");
    try {
      await blockAdminUser(userId, token, blocked);
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: blocked } : u));
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  const statusLabels: Record<string, string> = {
    active: t("admin.status.active"),
    archived: t("admin.status.archived"),
    sold: t("admin.status.sold"),
  };

  const verificationStatusColors: Record<string, string> = {
    pending: "#FFA000",
    approved: "#388E3C",
    rejected: "#D32F2F",
  };

  const verificationStatusLabels: Record<string, string> = {
    pending: "⏳ На проверке",
    approved: "✅ Одобрен",
    rejected: "❌ Отклонён",
  };

  return (
    <section className="section-grid">
      <div style={{ marginBottom: "2rem" }}>
        <p className="eyebrow">{t("admin.eyebrow")}</p>
        <h1 style={{ marginBottom: "0.5rem" }}>{t("admin.title")}</h1>
      </div>

      {isLoading && <p className="muted">{t("admin.loading")}</p>}
      {error && <p className="error-box">{error}</p>}

      <div style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {(["dashboard", "users", "ads", "services", "orders", "chats"] as const).map((tab) => (
          <button
            key={tab}
            className={`ghost ${activeTab === tab ? "active" : ""}`}
            onClick={() => { setActiveTab(tab); setSelectedChat(null); }}
            style={{
              borderColor: activeTab === tab ? "var(--md-primary)" : "var(--md-outline-variant)",
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
              position: "relative",
            }}
          >
            {tab === "dashboard" && "📊 Дашборд"}
            {tab === "users" && `👥 Пользователи${stats?.pendingVerifications ? ` (${stats.pendingVerifications})` : ""}`}
            {tab === "ads" && t("admin.tab.ads")}
            {tab === "services" && t("admin.tab.services")}
            {tab === "orders" && "📦 Заказы"}
            {tab === "chats" && t("admin.tab.chats", { count: chats.length.toString() })}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {activeTab === "dashboard" && stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-icon">👥</span>
            <span className="admin-stat-value">{stats.users}</span>
            <span className="admin-stat-label">Пользователей</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">📋</span>
            <span className="admin-stat-value">{stats.ads}</span>
            <span className="admin-stat-label">Объявлений</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">🛠️</span>
            <span className="admin-stat-value">{stats.services}</span>
            <span className="admin-stat-label">Услуг</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">📦</span>
            <span className="admin-stat-value">{stats.orders}</span>
            <span className="admin-stat-label">Заказов</span>
          </div>
          <div className="admin-stat-card" style={{ background: "linear-gradient(135deg, #FFA000 0%, #FFD54F 100%)", color: "#fff" }}>
            <span className="admin-stat-icon" style={{ background: "rgba(255,255,255,0.25)" }}>⏳</span>
            <span className="admin-stat-value">{stats.pendingVerifications}</span>
            <span className="admin-stat-label" style={{ color: "rgba(255,255,255,0.9)" }}>Ждут верификации</span>
          </div>
          <div className="admin-stat-card" style={{ background: "linear-gradient(135deg, #1B5E20 0%, #43A047 100%)", color: "#fff" }}>
            <span className="admin-stat-icon" style={{ background: "rgba(255,255,255,0.25)" }}>💰</span>
            <span className="admin-stat-value">{formatPrice(stats.totalRevenue)}</span>
            <span className="admin-stat-label" style={{ color: "rgba(255,255,255,0.9)" }}>Общий оборот</span>
          </div>
        </div>
      )}

      {/* ═══ USERS ═══ */}
      {activeTab === "users" && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {[
              { value: "", label: "Все" },
              { value: "pending", label: "⏳ На проверке" },
              { value: "approved", label: "✅ Одобренные" },
              { value: "rejected", label: "❌ Отклонённые" },
              { value: "blocked", label: "🚫 Заблокированные" },
            ].map((f) => (
              <button
                key={f.value}
                className={`ghost small ${userFilter === f.value ? "active" : ""}`}
                onClick={() => setUserFilter(f.value)}
                style={{
                  borderColor: userFilter === f.value ? "var(--md-primary)" : "var(--md-outline-variant)",
                  fontSize: "0.8rem",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {!isLoading && adminUsers.length === 0 && <p className="muted">Нет пользователей</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {adminUsers.map((u) => (
              <div key={u.id} className="admin-user-card">
                <div className="admin-user-card-header" onClick={() => setExpandedCardId(expandedCardId === u.id ? null : u.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      width: 44, height: 44, borderRadius: "50%", 
                      background: "var(--md-primary-container)", 
                      color: "var(--md-on-primary-container)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "1.1rem", flexShrink: 0,
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{u.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--md-on-surface-variant)" }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {u.isBlocked && (
                      <span style={{ background: "#D32F2F", color: "#fff", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>
                        ЗАБЛОКИРОВАН
                      </span>
                    )}
                    <span style={{
                      background: `${verificationStatusColors[u.verificationStatus]}18`,
                      color: verificationStatusColors[u.verificationStatus],
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: `1px solid ${verificationStatusColors[u.verificationStatus]}40`,
                    }}>
                      {verificationStatusLabels[u.verificationStatus]}
                    </span>
                    <span style={{ fontSize: "1.2rem", cursor: "pointer", transition: "transform 0.2s", transform: expandedCardId === u.id ? "rotate(180deg)" : "none" }}>▾</span>
                  </div>
                </div>

                {expandedCardId === u.id && (
                  <div className="admin-user-card-details">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)" }}>ИИН (ЖСН)</span>
                        <p style={{ margin: "2px 0", fontWeight: 600, fontFamily: "monospace", fontSize: "0.95rem" }}>{u.iin || "—"}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)" }}>Полное имя</span>
                        <p style={{ margin: "2px 0", fontWeight: 600, fontSize: "0.95rem" }}>{u.fullName || "—"}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)" }}>Баланс</span>
                        <p style={{ margin: "2px 0", fontWeight: 600, fontSize: "0.95rem" }}>{u.balance.toLocaleString()} ₸</p>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)" }}>Дата регистрации</span>
                        <p style={{ margin: "2px 0", fontSize: "0.85rem" }}>{new Date(u.createdAt).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>

                    {u.idCardUrl && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)" }}>ID-карта Yessenov</span>
                        <div style={{ marginTop: "4px", border: "1px solid var(--md-outline-variant)", borderRadius: "var(--md-radius-md)", overflow: "hidden" }}>
                          <img src={u.idCardUrl} alt="ID Card" style={{ width: "100%", maxHeight: "250px", objectFit: "contain", background: "#f5f5f5" }} />
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                      {u.verificationStatus === "pending" && (
                        <>
                          <button className="primary small" onClick={() => handleVerify(u.id, true)}>
                            ✅ Одобрить
                          </button>
                          <button className="ghost small" onClick={() => handleVerify(u.id, false)} style={{ color: "#D32F2F" }}>
                            ❌ Отклонить
                          </button>
                        </>
                      )}
                      {u.verificationStatus === "rejected" && (
                        <button className="primary small" onClick={() => handleVerify(u.id, true)}>
                          ✅ Одобрить
                        </button>
                      )}
                      {u.verificationStatus === "approved" && (
                        <button className="ghost small" onClick={() => handleVerify(u.id, false)} style={{ color: "#D32F2F" }}>
                          ❌ Отозвать верификацию
                        </button>
                      )}
                      <button
                        className="ghost small"
                        onClick={() => handleBlockUser(u.id, !u.isBlocked)}
                        style={{ color: u.isBlocked ? "#388E3C" : "#D32F2F" }}
                      >
                        {u.isBlocked ? "🔓 Разблокировать" : "🔒 Заблокировать"}
                      </button>
                      <button className="ghost small" onClick={() => handleDeleteUser(u.id)} style={{ color: "#D32F2F" }}>
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ ADS ═══ */}
      {activeTab === "ads" && (
        <div className="admin-ads-grid">
          {!isLoading && ads.length === 0 && <p className="muted">{t("admin.empty.ads")}</p>}
          {ads.map((ad) => (
            <article key={ad.id} className="admin-ad-card">
              <div className="admin-ad-main">
                <div>
                  <h3>{ad.title}</h3>
                  <p className="muted">{ad.category}</p>
                </div>
                <span className={`status-chip status-${ad.status || "active"}`}>
                  {statusLabels[ad.status || "active"]}
                </span>
              </div>
              <div className="admin-ad-meta">
                <span className="price">{formatPrice(ad.price)}</span>
                <span className="muted">{ad.user?.name}</span>
                {ad.user?.verified && <span className="verified-badge small">{t("admin.ad.verified")}</span>}
              </div>
              <div className="admin-ad-actions">
                <Link className="ghost small" to={`/ad/${ad.id}`}>
                  {t("admin.btn.open")}
                </Link>
                {ad.user?.id && !ad.user?.verified && (
                  <button className="ghost small" onClick={() => handleVerify(ad.user?.id as number, true)}>
                    {t("admin.btn.verify")}
                  </button>
                )}
                <button className="ghost small" onClick={() => handleDelete(ad.id)}>
                  {t("admin.btn.delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ═══ SERVICES ═══ */}
      {activeTab === "services" && (
        <div className="admin-ads-grid">
          {!isLoading && services.length === 0 && <p className="muted">{t("admin.empty.services")}</p>}
          {services.map((service) => (
            <article key={service.id} className="admin-ad-card">
              <div className="admin-ad-main">
                <div>
                  <h3>{service.title}</h3>
                  <p className="muted">{service.category}</p>
                </div>
              </div>
              <div className="admin-ad-meta">
                <span className="price">{formatPrice(service.price)}</span>
                <span className="muted">{service.user?.name}</span>
                {service.user?.verified && <span className="verified-badge small">{t("admin.ad.verified")}</span>}
              </div>
              <div className="admin-ad-actions">
                <Link className="ghost small" to={`/services/${service.id}`}>
                  {t("admin.btn.open")}
                </Link>
                {service.user?.id && !service.user?.verified && (
                  <button className="ghost small" onClick={() => handleVerify(service.user?.id as number, true)}>
                    {t("admin.btn.verify")}
                  </button>
                )}
                <button className="ghost small" onClick={() => handleDeleteService(service.id as number)}>
                  {t("admin.btn.delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ═══ CHATS ═══ */}
      {activeTab === "chats" && !selectedChat && (
        <div className="admin-ads-grid">
          {!isLoading && chats.length === 0 && <p className="muted">{t("admin.empty.chats")}</p>}
          {chats.map((chat) => (
            <article key={chat.id} className="admin-ad-card">
              <div className="admin-ad-main">
                <div>
                  <h3>{chat.title}</h3>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                    {t("admin.chat.msg_count")}<b>{chat.messageCount}</b>
                  </p>
                </div>
                <span className={`status-chip status-${chat.status || "active"}`}>
                  {statusLabels[chat.status || "active"]}
                </span>
              </div>
              <div className="admin-ad-meta">
                <span className="muted">{t("admin.chat.owner", { name: chat.ownerName })}</span>
              </div>
              <div className="admin-ad-actions">
                <button className="primary small" onClick={() => loadChatDetails(chat.id)}>
                  {t("admin.btn.view_chat")}
                </button>
                <Link className="ghost small" to={`/ad/${chat.id}`}>
                  {t("admin.btn.open_ad")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "chats" && selectedChat && (
        <div className="admin-chat-viewer" style={{ background: "var(--md-surface)", padding: "2rem", borderRadius: "var(--md-radius-xl)", border: "1px solid var(--md-outline-variant)", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>{t("admin.chat.title", { title: selectedChat.adTitle })}</h2>
              <p className="muted">{t("admin.chat.owner", { name: selectedChat.ownerName })}</p>
            </div>
            <button className="ghost" onClick={() => setSelectedChat(null)}>{t("admin.btn.back_to_list")}</button>
          </div>

          <div style={{ background: "var(--md-surface-container)", padding: "1rem", borderRadius: "12px", height: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.8rem", border: "1px solid var(--md-outline-variant)" }}>
            {selectedChat.messages.length === 0 ? (
              <p className="muted">{t("admin.chat.empty")}</p>
            ) : (
              selectedChat.messages.map((msg: any) => (
                <div key={msg.id} style={{ alignSelf: msg.senderId === selectedChat.ownerId ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)", marginBottom: "3px", textAlign: msg.senderId === selectedChat.ownerId ? "right" : "left" }}>
                    {msg.senderName} {msg.senderId === selectedChat.ownerId && t("admin.chat.author")}
                  </div>
                  <div style={{ background: msg.senderId === selectedChat.ownerId ? "var(--md-primary)" : "white", color: msg.senderId === selectedChat.ownerId ? "white" : "var(--md-on-surface)", padding: "0.6rem 0.9rem", borderRadius: "12px", border: msg.senderId === selectedChat.ownerId ? "none" : "1px solid var(--md-outline-variant)" }}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ ORDERS ═══ */}
      {activeTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!isLoading && orders.length === 0 && <p className="muted">{t("admin.empty.orders")}</p>}
          {orders.map((order) => (
            <div
              key={order.id}
              className="order-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "2rem",
                background: "var(--md-surface)",
                borderRadius: "var(--md-radius-lg)",
                border: "1px solid var(--md-outline-variant)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>{t("admin.order.title", { id: String(order.id), title: order.serviceTitle })}</h3>
                  <p className="muted" style={{ margin: "0 0 0.5rem 0" }}>
                    {t("admin.order.client")}<strong>{order.clientName}</strong> | {t("admin.order.provider")}<strong>{order.providerName}</strong>
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`status-chip status-${order.status}`}>
                      {order.status === "under_review" ? t("admin.order.status.under_review") : order.status === "completed" ? t("admin.order.status.completed") : order.status === "pending" ? t("admin.order.status.pending") : order.status === "accepted" ? t("admin.order.status.accepted") : order.status}
                    </span>
                    <strong style={{ color: "var(--md-primary)" }}>{formatPrice(order.price)}</strong>
                  </div>
                </div>
                <div>
                  {order.status === "under_review" && (
                    <button className="primary" onClick={() => handleApproveOrder(order.id)}>
                      {t("admin.btn.approve_payout")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
