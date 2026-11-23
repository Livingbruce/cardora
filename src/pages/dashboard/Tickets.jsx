import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import "../../styles/dashboard/Tickets.css";

const isFinishedStatus = (status) =>
  status === "closed" || status === "resolved";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUserTickets = useCallback(async (isMounted = () => true) => {
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userData?.user;

      if (!user) {
        if (isMounted()) {
          setTickets([]);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("uid", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const username =
        profile?.username || user.user_metadata?.username;

      // Fetch tickets
      let query = supabase
        .from("tickets")
        .select("*")
        .eq("client_uid", user.id)
        .order("id", { ascending: false });

      if (username) {
        query = query.in("username", [
          username,
          `@${username}`,
        ]);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (isMounted()) {
        setTickets(data || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error.message);
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeTickets = async () => {
      await loadUserTickets(() => isMounted);
    };

    initializeTickets();

    return () => {
      isMounted = false;
    };
  }, [loadUserTickets]);

  const activeTicketCount = tickets.filter(
    (ticket) => !isFinishedStatus(ticket.status)
  ).length;

  const maxReached = activeTicketCount >= 1;

  const handleCreateTicket = () => {
    if (maxReached) {
      alert("Maximum allowed tickets is 1.");
      return;
    }

    navigate("/dashboard/tickets/newTicket");
  };

  // Request refund
  const handleRequestRefund = () => {
    if (maxReached) {
      alert("Maximum allowed tickets is 1.");
      return;
    }

    navigate("/dashboard/tickets/refund");
  };

  // Close ticket
  const handleCloseTicket = async (ticketId) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "closed" })
        .eq("id", ticketId);

      if (error) throw error;

      await loadUserTickets();
    } catch (error) {
      console.error("Error closing ticket:", error.message);
      alert("Could not close ticket: " + error.message);
    }
  };

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <p>Tickets (maximum allowed: 1)</p>
      </div>

      <div className="tickets-card">
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            id="submit-ticket"
            className="tickets-create-btn"
            onClick={handleCreateTicket}
            disabled={maxReached}
          >
            CREATE TICKET
          </button>

          <button
            id="refund-ticket"
            className="tickets-create-btn"
            style={{
              backgroundColor: "#eab308",
              color: "#0f172a",
            }}
            onClick={handleRequestRefund}
            disabled={maxReached}
          >
            Request Refund
          </button>
        </div>

        <div className="tickets-display-box">
          {loading ? (
            "Loading tickets..."
          ) : tickets.length === 0 ? (
            "No tickets found"
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
              }}
            >
              {tickets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>#TKT-{t.id}</strong> —{" "}

                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor:
                            t.ticket_type === "refund"
                              ? "#fef08a"
                              : "#dbeafe",
                          color:
                            t.ticket_type === "refund"
                              ? "#854d0e"
                              : "#1e40af",
                        }}
                      >
                        {t.ticket_type === "refund"
                          ? "Refund Request"
                          : "Support Ticket"}
                      </span>{" "}

                      <strong>{t.subject}</strong>
                    </div>

                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      Status: {t.status}
                    </span>
                  </div>

                  {t.order_reference && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "0.85rem",
                        color: "#475569",
                      }}
                    >
                      Reference: {t.order_reference}
                    </div>
                  )}

                  <p
                    style={{
                      margin: "8px 0",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {t.message}
                  </p>

                  {!isFinishedStatus(t.status) && (
                    <button
                      type="button"
                      onClick={() => handleCloseTicket(t.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}