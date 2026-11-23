
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../utils/supabase";

const formatNotifDate = (iso) => {
  if (!iso) return "N/A";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return iso;

  return d.toISOString().slice(0, 16).replace("T", " ");
};

const getSeenStorageKey = (uid) =>
  `cardora_seen_notifications_${uid || "guest"}`;

export default function Notification({
  uid,
  username,
  variant = "mobile",
  onOpenTrigger,
}) {
  const [notifications, setNotifications] = useState([]);
  const [seenIds, setSeenIds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);

  const loadSeenIds = useCallback((targetUid) => {
    try {
      const raw = localStorage.getItem(getSeenStorageKey(targetUid));
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const persistSeenIds = useCallback((targetUid, ids) => {
    try {
      localStorage.setItem(
        getSeenStorageKey(targetUid),
        JSON.stringify(ids)
      );
    } catch {
      // Ignore storage quota errors.
    }
  }, []);

  const fetchNotifications = useCallback(
    async (activeRef) => {
      if (!uid || !activeRef.current) return;

      const userHandles = new Set(
        [username, `@${username}`].filter(Boolean)
      );

      try {
        const [deliveriesRes, ticketsRes] = await Promise.all([
          supabase
            .from("order_deliveries")
            .select("*")
            .order("id", { ascending: false }),

          supabase
            .from("tickets")
            .select("*")
            .eq("client_uid", uid)
            .order("id", { ascending: false }),
        ]);

        // Stop if the component has unmounted.
        if (!activeRef.current) return;

        if (deliveriesRes.error) {
          console.error(
            "Error fetching order deliveries:",
            deliveriesRes.error
          );
        }

        if (ticketsRes.error) {
          console.error(
            "Error fetching ticket notifications:",
            ticketsRes.error
          );
        }

        const built = [];

        (deliveriesRes.data || [])
          .filter(
            (delivery) =>
              delivery.client_handle &&
              userHandles.has(delivery.client_handle)
          )
          .forEach((delivery) => {
            const rawTs =
              delivery.created_at || delivery.delivered_at || null;

            built.push({
              id: `delivery-${delivery.id}`,
              category: delivery.category
                ? `Order (${delivery.category})`
                : "Order Delivery",
              orderId: `#ORD-${delivery.source_order_id ?? delivery.id}`,
              subject:
                delivery.subject ||
                `Order #${delivery.source_order_id ?? delivery.id} Delivery`,
              date: formatNotifDate(rawTs),
              rawDate: rawTs,
              message:
                delivery.response_message ||
                delivery.message ||
                "Your order has been delivered.",
            });
          });

        (ticketsRes.data || [])
          .filter(
            (ticket) =>
              Boolean(
                ticket.admin_reply &&
                String(ticket.admin_reply).trim()
              )
          )
          .forEach((ticket) => {
            const rawTs = ticket.updated_at || ticket.created_at || null;

            built.push({
              id: `ticket-reply-${ticket.id}`,
              category: "Ticket Response",
              orderId: `#TKT-${ticket.id}`,
              subject:
                ticket.subject || `Ticket #${ticket.id} Response`,
              date: formatNotifDate(rawTs),
              rawDate: rawTs,
              message: ticket.admin_reply.trim(),
            });
          });

        built.sort(
          (a, b) =>
            new Date(b.rawDate || 0) - new Date(a.rawDate || 0)
        );

        // Read the latest saved values after the requests complete.
        if (!activeRef.current) return;

        setSeenIds(loadSeenIds(uid));
        setNotifications(built);
      } catch (error) {
        if (activeRef.current) {
          console.error("Notification loading failed:", error);
        }
      }
    },
    [uid, username, loadSeenIds]
  );

  useEffect(() => {
    const activeRef = { current: true };

    // Schedule the initial fetch outside the synchronous effect body.
    const initialFetch = setTimeout(() => {
      if (activeRef.current) {
        void fetchNotifications(activeRef);
      }
    }, 0);

    // Refresh notifications every 8 seconds.
    const interval = setInterval(() => {
      if (activeRef.current) {
        void fetchNotifications(activeRef);
      }
    }, 8000);

    return () => {
      activeRef.current = false;
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !seenIds.includes(notification.id)
  ).length;

  const handleToggleDropdown = () => {
    if (onOpenTrigger) {
      onOpenTrigger();
    }

    setDropdownOpen((prev) => !prev);
  };

  const handleSelectNotification = (notification) => {
    if (!seenIds.includes(notification.id)) {
      const updated = [...seenIds, notification.id];

      setSeenIds(updated);
      persistSeenIds(uid, updated);
    }

    setDropdownOpen(false);
    setActiveNotification(notification);
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map(
      (notification) => notification.id
    );

    setSeenIds(allIds);
    persistSeenIds(uid, allIds);
  };

  const isSidebar = variant === "sidebar";

  return (
    <>
      <div
        className={
          isSidebar
            ? "sidebar-notif-wrapper"
            : "mobile-notif-wrapper"
        }
      >
        <button
          type="button"
          className={`notif-icon-btn ${
            isSidebar ? "sidebar-notif-btn" : ""
          }`}
          onClick={handleToggleDropdown}
          aria-label="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>

          {unreadCount > 0 && (
            <span className="notif-badge">+{unreadCount}</span>
          )}
        </button>

        {dropdownOpen && (
          <div
            className={`notif-preview-popover ${
              isSidebar ? "sidebar-popover" : ""
            }`}
          >
            <div className="notif-preview-header">
              <span>Notifications ({notifications.length})</span>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-read-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="notif-preview-empty">
                No order deliveries or ticket responses yet.
              </div>
            ) : (
              <div className="notif-preview-list">
                {notifications.map((notification) => {
                  const isUnread = !seenIds.includes(notification.id);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notif-preview-item ${
                        isUnread ? "unread" : ""
                      }`}
                      onClick={() =>
                        handleSelectNotification(notification)
                      }
                    >
                      <div className="notif-preview-top">
                        <span className="notif-item-category">
                          {notification.category}
                        </span>

                        <span className="notif-item-id">
                          {notification.orderId}
                        </span>
                      </div>

                      <div className="notif-item-date">
                        {notification.date}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {activeNotification &&
        createPortal(
          <div className="notif-fullpage-overlay">
            <div className="notif-fullpage-card">
              <div className="notif-fullpage-topbar">
                <button
                  type="button"
                  className="notif-back-btn"
                  onClick={() => setActiveNotification(null)}
                >
                  &larr; Back to Dashboard
                </button>

                <span className="notif-category-pill">
                  {activeNotification.category}
                </span>
              </div>

              <div className="notif-fullpage-meta">
                <div>
                  <span className="notif-meta-label">ID: </span>
                  <strong>{activeNotification.orderId}</strong>
                </div>

                <div>
                  <span className="notif-meta-label">Received: </span>
                  <strong>{activeNotification.date}</strong>
                </div>
              </div>

              <h2 className="notif-fullpage-subject">
                {activeNotification.subject}
              </h2>

              <div className="notif-fullpage-body">
                {activeNotification.message}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
