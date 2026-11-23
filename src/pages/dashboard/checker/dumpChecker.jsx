import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../../utils/currentClient";
import "../../../styles/dashboard/checker/dumpChecker.css";

export default function DumpChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [track, setTrack] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleCheck = async (e) => {
    e.preventDefault();

    const trimmedCard = cardNumber.trim();
    const trimmedMonth = expMonth.trim();
    const trimmedYear = expYear.trim();
    const trimmedTrack = track.trim();

    const hasCardDetails = trimmedCard && trimmedMonth && trimmedYear;
    const hasTrack2 = Boolean(trimmedTrack);

    if (!hasCardDetails && !hasTrack2) {
      alert("Please provide either Card Number + Exp (MM/YY) OR Track 2 data.");
      return;
    }

    if (trimmedMonth && (trimmedMonth.length !== 2 || Number(trimmedMonth) < 1 || Number(trimmedMonth) > 12)) {
      alert("Please enter a valid 2-digit expiration month (01-12).");
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

      const fee = 0.75;
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
        card_number: trimmedCard || null,
        exp_month: trimmedMonth || null,
        exp_year: trimmedYear || null,
        track2: trimmedTrack || null,
        fee,
        status: "pending"
      };

      const { error } = await supabase
        .from("dump_checker_orders")
        .insert([payload]);

      if (error) {
        alert("Error submitting dump check to database: " + error.message);
        setSubmitting(false);
        return;
      }

      alert(
        `Dump check submitted ($0.75 fee). Remaining balance: $${charge.nextBalance.toFixed(2)}`
      );
      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      setTrack("");
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dump-checker-modal-overlay" onClick={handleClose}>
      <div className="dump-checker-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="dump-checker-modal-header">
          <h3 className="dump-checker-modal-title">Dump checker</h3>
          <button className="dump-checker-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleCheck} className="dump-checker-modal-body">
          <p className="dump-checker-description">
            Dump Checker is to check the card/track2 validity with the bank.
          </p>

          <div className="dump-checker-form-grid">
            <div className="dump-checker-row">
              <label htmlFor="cardNumber">Card Number</label>
              <input 
                id="cardNumber"
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="dump-checker-row">
              <label htmlFor="expMonth">Exp. Month</label>
              <input 
                id="expMonth"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="dump-checker-row">
              <label htmlFor="expYear">Exp. Year</label>
              <input 
                id="expYear"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="YY"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="dump-checker-alternative">
              <h2>OR</h2>
            </div>

            <div className="dump-checker-row">
              <label htmlFor="track">Track 2</label>
              <input 
                id="track"
                type="text"
                maxLength={50}
                placeholder="4444555566668888=YYMM00000000000"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              />
            </div>
          </div>

          <div className="dump-checker-footer">
            <button type="submit" className="dump-checker-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Check for $0.75"}
            </button>
            <button type="button" className="dump-checker-btn-close" onClick={handleClose} disabled={submitting}>
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}