
import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { clearTabSessionId, getTabSessionId } from "../utils/sessionGuard";
import Notification from "./Notifications";
import Rules from "../pages/dashboard/Rules";
import Faq from "../pages/dashboard/Faq";
import CcChecker from "../pages/dashboard/checker/ccChecker";
import DumpChecker from "../pages/dashboard/checker/dumpChecker";
import "../styles/dashboard/layout.css";

const belongsToCurrentUser = (row, uid, username) => {
  const handles = new Set([username, `@${username}`].filter(Boolean));
  const rowHandle = row.client_handle || row.username;

  if (row.client_uid) {
    return row.client_uid === uid && (!rowHandle || handles.has(rowHandle));
  }

  return Boolean(rowHandle && handles.has(rowHandle));
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [cumulativeOrderPrice, setCumulativeOrderPrice] = useState(0);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isLoggingOutRef = useRef(false);
  const activeUidRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const terminateSessionAndLogout = useCallback(
    async (uidToClear = null) => {
      if (isLoggingOutRef.current) return;

      isLoggingOutRef.current = true;

      clearTabSessionId();
      setSidebarOpen(false);
      setPendingPayment(null);
      setCheckingAuth(true);

      const targetUid = uidToClear || activeUidRef.current;

      activeUidRef.current = null;
      setUserId(null);

      const withTimeout = (promise, ms = 2500) =>
        Promise.race([
          promise,
          new Promise((resolve) => setTimeout(resolve, ms)),
        ]);

      try {
        if (targetUid) {
          await withTimeout(
            supabase
              .from("profiles")
              .update({ active_session_id: null })
              .eq("uid", targetUid)
          );
        }

        await withTimeout(supabase.auth.signOut({ scope: "local" }));
      } catch (err) {
        console.error("Logout cleanup warning:", err);
      } finally {
        navigate("/login", { replace: true });

        setTimeout(() => {
          isLoggingOutRef.current = false;
        }, 300);
      }
    },
    [navigate]
  );

  const verifySessionAndProfile = useCallback(
    async (isActiveRef = { current: true }) => {
      if (isLoggingOutRef.current || !isActiveRef.current) return;

      const tabSessionId = getTabSessionId();

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!isActiveRef.current || isLoggingOutRef.current) return;

      const currentUser = sessionData?.session?.user;

      if (!tabSessionId || sessionError || !currentUser) {
        if (isActiveRef.current) {
          await terminateSessionAndLogout();
        }
        return;
      }

      activeUidRef.current = currentUser.id;
      setUserId(currentUser.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("uid, username, active_session_id, balance")
        .eq("uid", currentUser.id)
        .maybeSingle();

      if (!isActiveRef.current || isLoggingOutRef.current) return;

      if (
        profileError ||
        !profile ||
        !profile.active_session_id ||
        profile.active_session_id !== tabSessionId
      ) {
        await terminateSessionAndLogout(currentUser.id);
        return;
      }

      const resolvedUsername =
        profile.username || currentUser.user_metadata?.username || "user";

      const [
        pendingRes,
        shopRes,
        ccRes,
        dumpRes,
        avsRes,
        vbvRes,
        balRes,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("client_uid", currentUser.id)
          .eq("status", "pending")
          .order("id", { ascending: false })
          .limit(1),

        supabase
          .from("shop_orders")
          .select("price, client_uid, username, client_handle"),

        supabase
          .from("cc_checker_orders")
          .select("fee, client_uid, username, client_handle"),

        supabase
          .from("dump_checker_orders")
          .select("fee, client_uid, username, client_handle"),

        supabase
          .from("avs_checker_orders")
          .select("fee, client_uid, username, client_handle"),

        supabase
          .from("vbv_checker_orders")
          .select("fee, client_uid, username, client_handle"),

        supabase
          .from("balance_checker_orders")
          .select("fee, client_uid, username, client_handle"),
      ]);

      if (!isActiveRef.current || isLoggingOutRef.current) return;

      const activePending =
        pendingRes.data && pendingRes.data.length > 0
          ? pendingRes.data[0]
          : null;

      setPendingPayment(activePending);
      setUsername(resolvedUsername);
      setRemainingBalance(Number(profile.balance || 0));

      const ownedOrders = [
        ...(shopRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.price || 0)),

        ...(ccRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.fee ?? 0.75)),

        ...(dumpRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.fee ?? 0.75)),

        ...(avsRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.fee ?? 0.75)),

        ...(vbvRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.fee ?? 0.99)),

        ...(balRes.data || [])
          .filter((r) =>
            belongsToCurrentUser(r, currentUser.id, resolvedUsername)
          )
          .map((row) => Number(row.fee ?? 0.99)),
      ];

      setOrderCount(ownedOrders.length);

      setCumulativeOrderPrice(
        ownedOrders.reduce((sum, amount) => sum + amount, 0)
      );

      setCheckingAuth(false);
    },
    [terminateSessionAndLogout]
  );

  useEffect(() => {
    const activeRef = { current: true };

    // Defer the initial verification until after the effect's synchronous execution.
    Promise.resolve().then(() => {
      if (activeRef.current) {
        void verifySessionAndProfile(activeRef);
      }
    });

    const onPaymentEvent = () => {
      if (activeRef.current) {
        void verifySessionAndProfile(activeRef);
      }
    };

    window.addEventListener("cardora:payment-updated", onPaymentEvent);

    const pollInterval = setInterval(() => {
      if (activeRef.current) {
        void verifySessionAndProfile(activeRef);
      }
    }, 8000);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_OUT" ||
          (!session?.user && !isLoggingOutRef.current)
        ) {
          if (activeRef.current) {
            void terminateSessionAndLogout();
          }
        }
      }
    );

    return () => {
      activeRef.current = false;

      window.removeEventListener(
        "cardora:payment-updated",
        onPaymentEvent
      );

      clearInterval(pollInterval);
      authListener?.subscription?.unsubscribe();
    };
  }, [
    verifySessionAndProfile,
    terminateSessionAndLogout,
    location.pathname,
  ]);

  const handleLogout = (e) => {
    e.preventDefault();
    terminateSessionAndLogout(activeUidRef.current);
  };

  if (checkingAuth) {
    return null;
  }

  return (
    <div className="dashboard-container">
      {/* Full-Screen Lock Prompt While Payment Is Being Processed */}
      {pendingPayment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(2, 6, 23, 0.92)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#0f172a",
              color: "#f8fafc",
              border: "1px solid #334155",
              borderRadius: "14px",
              padding: "28px",
              textAlign: "center",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                margin: "0 auto 16px",
                borderRadius: "9999px",
                border: "4px solid #334155",
                borderTopColor: "#f3ba2f",
                animation: "spin 1s linear infinite",
              }}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "1.4rem",
                color: "#ffffff",
              }}
            >
              Payment is being processed
            </h2>

            <p
              style={{
                margin: "0 0 18px",
                fontSize: "0.95rem",
                color: "#cbd5e1",
                lineHeight: 1.5,
              }}
            >
              Your Binance deposit of{" "}
              <strong style={{ color: "#f3ba2f" }}>
                ${Number(pendingPayment.package_amount || 0).toFixed(2)} USDT
              </strong>{" "}
              ({pendingPayment.network}) is awaiting admin approval. Access to
              the web app is locked until your payment is approved and credited
              to your balance.
            </p>

            <div
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "0.85rem",
                textAlign: "left",
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div>
                <span style={{ color: "#94a3b8" }}>Reference: </span>
                <strong>{pendingPayment.order_reference}</strong>
              </div>

              <div style={{ wordBreak: "break-all" }}>
                <span style={{ color: "#94a3b8" }}>Tx Hash: </span>
                <span style={{ fontFamily: "monospace" }}>
                  {pendingPayment.tx_hash}
                </span>
              </div>

              <div>
                <span style={{ color: "#94a3b8" }}>Status: </span>
                <strong style={{ color: "#facc15" }}>
                  Pending Admin Approval
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #475569",
                backgroundColor: "transparent",
                color: "#e2e8f0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Mobile Top Navigation Header */}
      <header className="dashboard-header">
        <div className="mobile-header-left">
          <button
            type="button"
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          <Notification
            uid={userId}
            username={username}
            variant="mobile"
            onOpenTrigger={closeSidebar}
          />
        </div>

        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>CARDORA</h2>
      </header>

      {/* Backdrop overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top-notif">
          <Notification
            uid={userId}
            username={username}
            variant="sidebar"
          />
        </div>

        <div className="sidebar-welcome">
          <p>Welcome @{username}</p>
        </div>

        <nav className="dashboard-nav">
          <Link
            to="/dashboard/Funds"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Add Funds
          </Link>

          <Link
            to="/dashboard/source/source1"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Buy CVV
          </Link>

          <Link
            to="/dashboard/Dumps"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Buy DUMPS
          </Link>

          <Link
            to="/dashboard/Novbv"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Buy NOVBV BINS
          </Link>

          {/* Card Checker Dropdown Section */}
          <div className="nav-dropdown-container">
            <button
              type="button"
              className="nav-dropdown-header"
              onClick={() => setCheckerOpen(!checkerOpen)}
            >
              <div className="nav-dropdown-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Card Checker
              </div>

              <span className={`dropdown-arrow ${checkerOpen ? "open" : ""}`}>
                ▼
              </span>
            </button>

            {checkerOpen && (
              <div className="nav-submenu">
                <Link
                  to="/dashboard/checker/ccChecker"
                  className="nav-submenu-link"
                  onClick={closeSidebar}
                >
                  CC checker
                </Link>

                <Link
                  to="/dashboard/checker/dumpChecker"
                  className="nav-submenu-link"
                  onClick={closeSidebar}
                >
                  Dump checker
                </Link>

                <Link
                  to="/dashboard/checker/3dsvbv"
                  className="nav-submenu-link"
                  onClick={closeSidebar}
                >
                  3DS [VBV] Checker
                </Link>

                <Link
                  to="/dashboard/checker/balanceChecker"
                  className="nav-submenu-link"
                  onClick={closeSidebar}
                >
                  Balance Checker
                </Link>

                <Link
                  to="/dashboard/checker/avsChecker"
                  className="nav-submenu-link"
                  onClick={closeSidebar}
                >
                  AVS Checker
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/dashboard/Rules"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Rules
          </Link>

          <Link
            to="/dashboard/Faq"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            F.A.Q
          </Link>

          <Link
            to="/dashboard/Tickets"
            className="dashboard-nav-link"
            onClick={closeSidebar}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Tickets
          </Link>

          <button
            type="button"
            className="dashboard-nav-link"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
            onClick={handleLogout}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-stats-grid">
            <div className="stat-card">
              <h4>Your Balance</h4>
              <p>${remainingBalance.toFixed(2)}</p>
            </div>

            <div className="stat-card">
              <h4>Your Cart</h4>
              <p>{`${orderCount}($${cumulativeOrderPrice.toFixed(2)})`}</p>
            </div>

            <div className="stat-card">
              <h4>Shop Stats</h4>
              <p>Active</p>
            </div>

            <div className="stat-card">
              <h4>Latest Update</h4>
              <p>v1.0 Online</p>
            </div>
          </div>

          {/* Dynamic Page Display Area */}
          <div className="dashboard-view-area">
            <Outlet />
          </div>
        </div>
      </main>

      {location.pathname === "/dashboard/Rules" && <Rules />}
      {location.pathname === "/dashboard/Faq" && <Faq />}
      {location.pathname === "/dashboard/checker/ccChecker" && <CcChecker />}
      {location.pathname === "/dashboard/checker/dumpChecker" && (
        <DumpChecker />
      )}
    </div>
  );
}
