import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../../utils/currentClient";
import "../../../styles/dashboard/checker/3dsvbvChecker.css";

export default function VbvChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [card, setCard] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleCheck = async (e) => {
    e.preventDefault();

    const trimmedCard = card.trim();
    if (!trimmedCard) {
      alert("Please enter a Card Number.");
      return;
    }

    setSubmitting(true);

    try {
      const client = await getActiveClient();
      if (client.error) {
        alert(client.error);
        setSubmitting(false);
        return;
      }

      const fee = 0.99;
      const charge = await chargeClientBalance(client.uid, client.balance, fee);
      if (charge.error) {
        alert(charge.error);
        setSubmitting(false);
        return;
      }

      const payload = {
        client_uid: client.uid,
        username: client.username,
        client_handle: client.clientHandle,
        card_number: trimmedCard,
        fee,
        status: "pending"
      };

      const { error } = await supabase
        .from("vbv_checker_orders")
        .insert([payload]);

      if (error) {
        alert("Error submitting 3DS VBV check to database: " + error.message);
        setSubmitting(false);
        return;
      }

      alert(
        `3DS VBV check submitted ($0.99 fee). Remaining balance: $${charge.nextBalance.toFixed(2)}`
      );
      setCard("");
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="vbv-checker-modal-overlay" onClick={handleClose}>
      <div className="vbv-checker-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="vbv-checker-modal-header">
          <h3 className="vbv-checker-modal-title">3DS Card Checker</h3>
          <button className="vbv-checker-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleCheck} className="vbv-checker-modal-body">
          <p className="vbv-checker-description">
            3DS Checker is to check if your card has &apos;Verified by visa&apos; or &apos;MasterCard Security Code&apos; enabled or disabled.
          </p>

          <div className="vbv-checker-form-grid">
            <div className="vbv-checker-row">
              <label htmlFor="card">Card Number</label>
              <input
                id="card"
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="Card Number"
                value={card}
                onChange={(e) => setCard(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          </div>

          <div className="vbv-checker-footer">
            <button type="submit" className="vbv-checker-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Check for $0.99"}
            </button>
            <button type="button" className="vbv-checker-btn-close" onClick={handleClose} disabled={submitting}>
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}