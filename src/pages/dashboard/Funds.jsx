import { useState } from "react";
import { supabase } from "../../utils/supabase";
import { getActiveClient } from "../../utils/currentClient";
import "../../styles/dashboard/AddFunds.css";

const WALLET_ADDRESSES = {
  TRC20: {
    label: "USDT — TRON (TRC20)",
    shortNetwork: "TRON (TRC20)",
    address: "TK16NK3WnuHBvaujTeGMsaLUshq8s3ywmK",
    note: "Send USDT using the TRON / TRC20 network only."
  },
  ERC20: {
    label: "USDT — Ethereum (ERC20)",
    shortNetwork: "Ethereum (ERC20)",
    address: "0xd454D1077B6F76Cf4416fE8E0a426e47B21b97A8",
    note: "Send USDT using the Ethereum / ERC20 network only."
  }
};

export default function AddFunds() {
  const [custom, setCustom] = useState("");
  const [amount, setAmount] = useState(50);
  const [selectedMethod, setSelectedMethod] = useState("binance");

  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [step, setStep] = useState("select"); // "select" | "pay"
  const [selectedPackage, setSelectedPackage] = useState("50");
  const [networkKey, setNetworkKey] = useState("TRC20");
  const [orderRef, setOrderRef] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePresetClick = (val) => {
    setAmount(val);
    setCustom("");
  };

  const handleCustomChange = (e) => {
    setCustom(e.target.value);
  };

  const numericTotal = Number(custom) > 0 ? Number(custom) : Number(amount || 0);
  const currentTotal = numericTotal > 0 ? numericTotal : 0;

  const packageOptions = Array.from(
    new Set([25, 50, 75, 100, currentTotal > 0 ? currentTotal : 50])
  ).sort((a, b) => a - b);

  const handleOpenCryptoPrompt = () => {
    const initialPkg = currentTotal > 0 ? String(currentTotal) : "25";
    setSelectedPackage(initialPkg);
    setNetworkKey("TRC20");
    setOrderRef(`BN-${Math.floor(100000000 + Math.random() * 900000000)}`);
    setTxHash("");
    setCopied(false);
    setStep("select");
    setCryptoModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setCryptoModalOpen(false);
    setStep("select");
    setCopied(false);
  };

  const handleContinueToPayment = (e) => {
    e.preventDefault();
    setCopied(false);
    setStep("pay");
  };

  const activeWallet = WALLET_ADDRESSES[networkKey] || WALLET_ADDRESSES.TRC20;
  const paymentAmount = Number(selectedPackage || currentTotal || 25);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Address: " + activeWallet.address);
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    const cleanHash = txHash.trim();
    if (!cleanHash) {
      alert("Please paste your transaction ID / hash.");
      return;
    }

    setSubmitting(true);
    try {
      const client = await getActiveClient();
      if (client.error) {
        alert(client.error);
        return;
      }

      const { error } = await supabase.from("payments").insert([
        {
          client_uid: client.uid,
          username: client.username,
          client_handle: client.clientHandle,
          order_reference: orderRef,
          provider: "Binance",
          package_amount: paymentAmount,
          network: activeWallet.shortNetwork,
          wallet_address: activeWallet.address,
          tx_hash: cleanHash,
          status: "pending"
        }
      ]);

      if (error) {
        alert("Could not submit payment: " + error.message);
        return;
      }

      setCryptoModalOpen(false);
      setStep("select");
      setTxHash("");
      window.dispatchEvent(new Event("cardora:payment-updated"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="funds-container">
      <div className="funds-header">
        <h2>Add Funds</h2>
        <p>Choose your preferred deposit amount.</p>
      </div>

      <div className="funds-body-grid">
        <div className="funds-left-column">
          <div className="funds-options-grid">
            {[25, 50, 75, 100].map((val) => (
              <div
                key={val}
                className={`funds-option-card ${amount === val && !custom ? "selected" : ""}`}
                onClick={() => handlePresetClick(val)}
              >
                <p>${val}</p>
                <span>Deposit</span>
              </div>
            ))}
          </div>

          <div className="custom-amount-group">
            <label htmlFor="custom-amount">Custom amount</label>
            <input
              id="custom-amount"
              type="number"
              min="1"
              step="any"
              className="custom-amount-input"
              placeholder="Enter amount"
              value={custom}
              onChange={handleCustomChange}
              onWheel={(e) => e.target.blur()}
            />
          </div>
        </div>

        <div className="funds-right-column">
          <h3 className="funds-section-title">Payment method</h3>
          <div className="payment-methods-list">
            <div
              className={`payment-method-card ${selectedMethod === "binance" ? "selected" : ""}`}
              onClick={() => setSelectedMethod("binance")}
            >
              <label className="payment-method-label" htmlFor="binance">
                <span
                  className="payment-method-icon"
                  style={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#f3ba2f",
                    color: "#0b0e11"
                  }}
                >
                  BNB / USDT
                </span>
                Binance
              </label>
              <input
                type="radio"
                id="binance"
                name="payment"
                value="binance"
                checked={selectedMethod === "binance"}
                onChange={() => setSelectedMethod("binance")}
                className="payment-method-radio"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Total Summary & Submit Button */}
      <div className="funds-summary-card">
        <div className="summary-total-row">
          <h3 style={{ color: "#000" }}>Total deposit</h3>
          <p className="summary-total-amount">${currentTotal || 0}</p>
        </div>
        <button
          type="button"
          className="add-funds-btn"
          onClick={handleOpenCryptoPrompt}
          disabled={currentTotal <= 0}
        >
          Continue
        </button>
      </div>

      {cryptoModalOpen && (
        <div
          onClick={handleCloseModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "560px",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px"
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#2563eb",
                    textTransform: "uppercase",
                    marginBottom: "4px"
                  }}
                >
                  CARDORA BINANCE CRYPTO
                </div>
                <h3 style={{ margin: 0, fontSize: "1.5rem", color: "#0f172a" }}>
                  Pay with cryptocurrency
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#475569" }}>
                  {step === "select"
                    ? "Select your package, choose your Binance USDT network, and follow the payment instructions."
                    : "Send your payment to the Binance wallet address below and enter your transaction hash."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  lineHeight: 1,
                  color: "#64748b",
                  cursor: "pointer"
                }}
              >
                &times;
              </button>
            </div>

            {step === "select" ? (
              <form onSubmit={handleContinueToPayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="crypto-package" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Select package
                  </label>
                  <select
                    id="crypto-package"
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.95rem",
                      backgroundColor: "#fff",
                      color: "#0f172a"
                    }}
                  >
                    {packageOptions.map((pkg) => (
                      <option key={pkg} value={String(pkg)}>
                        Deposit package — ${Number(pkg).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="crypto-network" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Payment network
                  </label>
                  <select
                    id="crypto-network"
                    value={networkKey}
                    onChange={(e) => setNetworkKey(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.95rem",
                      backgroundColor: "#fff",
                      color: "#0f172a"
                    }}
                  >
                    <option value="TRC20">{WALLET_ADDRESSES.TRC20.label}</option>
                    <option value="ERC20">{WALLET_ADDRESSES.ERC20.label}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: "4px",
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer"
                  }}
                >
                  Continue to payment
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitVerification} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                    Send your payment
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {paymentAmount.toFixed(2)} USDT
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "#64748b" }}>Network</span>
                  <strong style={{ color: "#0f172a" }}>{activeWallet.shortNetwork}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "#64748b" }}>Order reference</span>
                  <strong style={{ color: "#0f172a" }}>{orderRef}</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    Receiving wallet address
                  </label>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px dashed #94a3b8",
                      backgroundColor: "#f8fafc",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      wordBreak: "break-all",
                      color: "#0f172a"
                    }}
                  >
                    {activeWallet.address}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#e0ecff",
                      color: "#1d4ed8",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {copied ? "Wallet address copied!" : "Copy wallet address"}
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {activeWallet.note}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="tx-hash-input" style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    Transaction ID / hash
                  </label>
                  <input
                    id="tx-hash-input"
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste the transaction hash after sending"
                    required
                    style={{
                      padding: "11px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.92rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setStep("select")}
                    disabled={submitting}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: "pointer"
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit transaction for verification"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}