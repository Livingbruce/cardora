import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../../utils/currentClient";
import "../../../styles/dashboard/checker/balanceChecker.css";

export default function BalanceChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [amount, setAmount] = useState("");
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

    const trimmedCard = cardNumber.trim();
    const trimmedMonth = expMonth.trim();
    const trimmedYear = expYear.trim();
    const trimmedCvv = cvv.trim();
    const numericAmount = Number(amount);

    if (!trimmedCard || !trimmedMonth || !trimmedYear || !amount.trim()) {
      alert("Please fill in Card Number, Exp. Month, Exp. Year, and Amount (CVV is optional).");
      return;
    }

    if (trimmedMonth.length !== 2 || Number(trimmedMonth) < 1 || Number(trimmedMonth) > 12) {
      alert("Please enter a valid 2-digit expiration month (01-12).");
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 10000) {
      alert("Please enter a valid check amount between 1 and 10000.");
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
        exp_month: trimmedMonth,
        exp_year: trimmedYear,
        cvv: trimmedCvv || null,
        check_amount: numericAmount,
        fee,
        status: "pending"
      };

      const { error } = await supabase
        .from("balance_checker_orders")
        .insert([payload]);

      if (error) {
        alert("Error submitting balance check to database: " + error.message);
        setSubmitting(false);
        return;
      }

      alert(
        `Balance check submitted ($0.99 fee). Remaining balance: $${charge.nextBalance.toFixed(2)}`
      );
      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      setCvv("");
      setAmount("");
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bal-checker-modal-overlay" onClick={handleClose}>
      <div className="bal-checker-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="bal-checker-modal-header">
          <h3 className="bal-checker-modal-title">Balance checker</h3>
          <button className="bal-checker-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleCheck} className="bal-checker-modal-body">
          <p className="bal-checker-description">
            Balance Checker is to check if the requested amount is available on card, if the pre-auth amount gets approved or will be auto cancelled and funds returned to card.
          </p>

          <div className="bal-checker-form-grid">
            <div className="bal-checker-row">
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

            <div className="bal-checker-row">
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

            <div className="bal-checker-row">
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

            <div className="bal-checker-row">
              <label htmlFor="cvv">CVV</label>
              <input 
                id="cvv"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="CVV [Optional]"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="bal-checker-row">
              <label htmlFor="amount">Amount</label>
              <input 
                id="amount"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Max: 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          </div>

          <div className="bal-checker-footer">
            <button type="submit" className="bal-checker-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Check for $0.99"}
            </button>
            <button type="button" className="bal-checker-btn-close" onClick={handleClose} disabled={submitting}>
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}