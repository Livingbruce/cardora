import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient } from "../../../utils/currentClient";
import "../../../styles/dashboard/tickets/refund.css";

export default function Refund() {
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [policyConfirm, setPolicyConfirm] = useState(true);
  const [englishOnly, setEnglishOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || submitting) return;

    setSubmitting(true);
    try {
      const client = await getActiveClient();
      if (client.error) {
        alert(client.error);
        return;
      }

      const { data: existingTickets, error: checkError } = await supabase
        .from("tickets")
        .select("id, status")
        .eq("client_uid", client.uid)
        .neq("status", "closed");

      if (checkError) {
        alert("Could not verify existing tickets: " + checkError.message);
        return;
      }

      if (existingTickets && existingTickets.length >= 1) {
        alert("Maximum allowed tickets is 1.");
        navigate("/dashboard/Tickets", { replace: true });
        return;
      }

      const { error: insertError } = await supabase.from("tickets").insert([
        {
          client_uid: client.uid,
          username: client.username,
          client_handle: client.clientHandle,
          ticket_type: "refund",
          subject: orderId.trim()
            ? `Refund Request (${orderId.trim()})`
            : "Refund Request",
          order_reference: orderId.trim() || null,
          message: reason.trim(),
          status: "open"
        }
      ]);

      if (insertError) {
        alert("Failed to submit refund request: " + insertError.message);
        return;
      }

      alert("Refund request submitted!");
      navigate("/dashboard/Tickets", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate("/dashboard/Tickets");
  };

  return (
    <div className="refund-container">
      <div className="refund-header">
        <h2>Request Refund</h2>
      </div>

      <form className="refund-card" onSubmit={handleRefundSubmit}>
        <div className="refund-inputs-body">
          <div className="refund-order-input">
            <input
              id="orderId"
              type="text"
              placeholder="Enter Order ID / Card Details"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>

          <div className="refund-reason-textarea">
            <textarea
              id="reason"
              placeholder="Describe the reason for your refund request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="refund-instructions">
            <div className="refund-ins">
              <input
                type="checkbox"
                id="policy"
                checked={policyConfirm}
                onChange={(e) => setPolicyConfirm(e.target.checked)}
              />
              <label htmlFor="policy"><p>I understand shop policies regarding card validation.</p></label>
            </div>
            <div className="refund-ins">
              <input
                type="checkbox"
                id="english"
                checked={englishOnly}
                onChange={(e) => setEnglishOnly(e.target.checked)}
              />
              <label htmlFor="english"><p>We accept English only!</p></label>
            </div>
          </div>
        </div>

        <div className="refund-buttons-container">
          <button id="submit" type="submit" className="refund-btn-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
          <button id="close" type="button" className="refund-btn-close" onClick={handleClose} disabled={submitting}>
            Close
          </button>
        </div>
      </form>
    </div>
  );
}