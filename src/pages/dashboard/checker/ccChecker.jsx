import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../../utils/currentClient";
import "../../../styles/dashboard/checker/ccChecker.css";

export default function CcChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleNumericInput = (setter) => (e) => {
    const numericValue = e.target.value.replace(/\D/g, "");
    setter(numericValue);
  };

  const handleCheck = async (e) => {
    e.preventDefault();

    if (!cardNumber || !expMonth || !expYear || !cvv) {
      alert("Please fill in Card Number, Exp. Month, Exp. Year, and CVV.");
      return;
    }

    if (expMonth.length !== 2 || Number(expMonth) < 1 || Number(expMonth) > 12) {
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
        card_number: cardNumber.trim(),
        exp_month: expMonth.trim(),
        exp_year: expYear.trim(),
        cvv: cvv.trim(),
        fee,
        status: "pending"
      };

      const { error } = await supabase
        .from("cc_checker_orders")
        .insert([payload]);

      if (error) {
        alert("Error submitting CC check to database: " + error.message);
        setSubmitting(false);
        return;
      }

      alert(
        `Credit card check submitted ($0.75 fee). Remaining balance: $${charge.nextBalance.toFixed(2)}`
      );
      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      setCvv("");
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cc-checker-modal-overlay" onClick={handleClose}>
      <div className="cc-checker-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="cc-checker-modal-header">
          <h3 className="cc-checker-modal-title">Credit card checker</h3>
          <button className="cc-checker-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleCheck} className="cc-checker-modal-body">
          <p className="cc-checker-description">
            Card Checker is to check card validity and if the CVV used match with the issuing bank&apos;s information on file for that cardholder.
          </p>

          <div className="cc-checker-form-grid">
            <div className="cc-checker-row">
              <label htmlFor="cardNumber">Card Number</label>
              <input 
                id="cardNumber"
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="Card Number"
                value={cardNumber}
                onInput={handleNumericInput(setCardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>

            <div className="cc-checker-row">
              <label htmlFor="expMonth">Exp. Month</label>
              <input 
                id="expMonth"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>

            <div className="cc-checker-row">
              <label htmlFor="expYear">Exp. Year</label>
              <input 
                id="expYear"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="YY"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>

            <div className="cc-checker-row">
              <label htmlFor="cvv">CVV</label>
              <input 
                id="cvv"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          </div>

          <div className="cc-checker-footer">
            <button type="submit" className="cc-checker-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Check for $0.75"}
            </button>
            <button type="button" className="cc-checker-btn-close" onClick={handleClose} disabled={submitting}>
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}