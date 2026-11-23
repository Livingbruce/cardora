import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../../utils/currentClient";
import "../../../styles/dashboard/checker/avsChecker.css";

export default function AVSChecker() {
  const [isOpen, setIsOpen] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [code, setCode] = useState("");
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

    if (
      !cardNumber.trim() ||
      !expMonth.trim() ||
      !expYear.trim() ||
      !fName.trim() ||
      !lName.trim() ||
      !addr.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zip.trim() ||
      !code.trim()
    ) {
      alert("Please fill in all required AVS fields (CVV is optional).");
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
        cvv: cvv.trim() || null,
        first_name: fName.trim(),
        last_name: lName.trim(),
        address: addr.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country_code: code.trim().toUpperCase(),
        fee,
        status: "pending"
      };

      const { error } = await supabase
        .from("avs_checker_orders")
        .insert([payload]);

      if (error) {
        alert("Error submitting AVS check to database: " + error.message);
        setSubmitting(false);
        return;
      }

      alert(
        `AVS check submitted ($0.75 fee). Remaining balance: $${charge.nextBalance.toFixed(2)}`
      );
      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      setCvv("");
      setFName("");
      setLName("");
      setAddr("");
      setCity("");
      setState("");
      setZip("");
      setCode("");
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="avs-checker-modal-overlay" onClick={handleClose}>
      <div className="avs-checker-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="avs-checker-modal-header">
          <h3 className="avs-checker-modal-title">AVS Checker</h3>
          <button className="avs-checker-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleCheck} className="avs-checker-modal-body">
          <p className="avs-checker-description">
            AVS Checker validates card billing address and postal code details against the cardholder&apos;s issuing bank records.
          </p>

          <div className="avs-checker-form-grid">
            <div className="avs-checker-row">
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

            <div className="avs-checker-row">
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

            <div className="avs-checker-row">
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

            <div className="avs-checker-row">
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

            <div className="avs-checker-row">
              <label htmlFor="Fname">First Name</label>
              <input 
                id="Fname"
                type="text"
                placeholder="First Name"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="Lname">Last Name</label>
              <input 
                id="Lname"
                type="text"
                placeholder="Last Name"
                value={lName}
                onChange={(e) => setLName(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="addr">Address</label>
              <input 
                id="addr"
                type="text"
                placeholder="Address"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="city">City</label>
              <input 
                id="city"
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="state">State</label>
              <input 
                id="state"
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="zip">Zip/Postal</label>
              <input 
                id="zip"
                type="text"
                placeholder="Zip/Postal"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                required
              />
            </div>

            <div className="avs-checker-row">
              <label htmlFor="code">Country (2 char code)</label>
              <input 
                id="code"
                type="text"
                maxLength={3}
                placeholder="e.g. US"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

          </div>

          <div className="avs-checker-footer">
            <button type="submit" className="avs-checker-btn-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Check for $0.75"}
            </button>
            <button type="button" className="avs-checker-btn-close" onClick={handleClose} disabled={submitting}>
              Close
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}