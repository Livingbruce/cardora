import { useState } from "react";
import { supabase } from "../../utils/supabase";
import { getActiveClient } from "../../utils/currentClient";
import "../../styles/dashboard/AddFunds.css";

const MIN_DEPOSIT = 25;
const PRESET_PACKAGES = [25, 50, 75, 100];

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

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
const ERC20_TX_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;

const normalizeAndValidateTxId = (rawValue, networkKey) => {
  const trimmed = String(rawValue || "").trim();

  if (!trimmed) {
    return { valid: false, normalized: "", reason: "Transaction ID (TxID) is required." };
  }

  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed) || /^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      reason: "That is a wallet address, not a Transaction ID. Paste the Transaction id (TxID)."
    };
  }

  if (networkKey === "ERC20") {
    if (!ERC20_TX_REGEX.test(trimmed)) {
      return {
        valid: false,
        normalized: trimmed,
        reason: "Invalid ERC20 TxID."
      };
    }
    const normalized = trimmed.toLowerCase().startsWith("0x")
      ? `0x${trimmed.slice(2).toLowerCase()}`
      : `0x${trimmed.toLowerCase()}`;
    return { valid: true, normalized, reason: "" };
  }

  // TRC20 / default 64-char hex hash
  const cleanedHex = trimmed.startsWith("0x") || trimmed.startsWith("0X")
    ? trimmed.slice(2)
    : trimmed;

  if (!HEX_64_REGEX.test(cleanedHex)) {
    return {
      valid: false,
      normalized: trimmed,
      reason: "Invalid TRC20 TxID."
    };
  }

  return { valid: true, normalized: cleanedHex.toLowerCase(), reason: "" };
};

export default function AddFunds() {
  const [custom, setCustom] = useState("");
  const [amount, setAmount] = useState(50);
  const [amountError, setAmountError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("binance");

  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [step, setStep] = useState("select"); // "select" | "pay"
  const [selectedPackage, setSelectedPackage] = useState("50");
  const [networkKey, setNetworkKey] = useState("TRC20");
  const [orderRef, setOrderRef] = useState("");
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePresetClick = (val) => {
    setAmount(val);
    setCustom("");
    setAmountError("");
  };

  const handleCustomChange = (e) => {
    const rawValue = e.target.value;

    if (rawValue === "") {
      setCustom("");
      setAmountError("");
      return;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return;
    }

    if (PRESET_PACKAGES.includes(parsed)) {
      setAmount(parsed);
      setCustom("");
      setAmountError("");
      return;
    }

    setCustom(rawValue);

    if (parsed < MIN_DEPOSIT) {
      setAmountError(`Minimum deposit amount is $${MIN_DEPOSIT}.00.`);
    } else {
      setAmountError("");
    }
  };

  const handleCustomBlur = () => {
    if (custom === "") return;
    const parsed = Number(custom);
    if (Number.isNaN(parsed) || parsed < MIN_DEPOSIT) {
      setCustom(String(MIN_DEPOSIT));
      setAmount(MIN_DEPOSIT);
      setAmountError("");
      return;
    }
    if (PRESET_PACKAGES.includes(parsed)) {
      setAmount(parsed);
      setCustom("");
      setAmountError("");
    }
  };

  const parsedCustom = custom !== "" ? Number(custom) : null;
  const hasValidCustom =
    parsedCustom !== null && !Number.isNaN(parsedCustom) && parsedCustom >= MIN_DEPOSIT;

  const currentTotal = hasValidCustom
    ? parsedCustom
    : Math.max(MIN_DEPOSIT, Number(amount || MIN_DEPOSIT));

  const packageOptions = Array.from(
    new Set([...PRESET_PACKAGES, currentTotal])
  ).sort((a, b) => a - b);

  const handleOpenCryptoPrompt = () => {
    if (custom !== "" && (!hasValidCustom || parsedCustom < MIN_DEPOSIT)) {
      setAmountError(`Minimum deposit amount is $${MIN_DEPOSIT}.00.`);
      return;
    }

    const safePkg = Math.max(MIN_DEPOSIT, currentTotal);
    setSelectedPackage(String(safePkg));
    setNetworkKey("TRC20");
    setOrderRef(`BN-${Math.floor(100000000 + Math.random() * 900000000)}`);
    setTxHash("");
    setTxError("");
    setCopied(false);
    setStep("select");
    setCryptoModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setCryptoModalOpen(false);
    setStep("select");
    setTxError("");
    setCopied(false);
  };

  const handleContinueToPayment = (e) => {
    e.preventDefault();
    setTxError("");
    setCopied(false);
    setStep("pay");
  };

  const activeWallet = WALLET_ADDRESSES[networkKey] || WALLET_ADDRESSES.TRC20;
  const paymentAmount = Math.max(
    MIN_DEPOSIT,
    Number(selectedPackage || currentTotal || MIN_DEPOSIT)
  );

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Address: " + activeWallet.address);
    }
  };

  const handleTxPaste = (e) => {
    const pastedText = e.clipboardData?.getData("text") ?? "";
    const check = normalizeAndValidateTxId(pastedText, networkKey);

    if (!check.valid) {
      e.preventDefault();
      setTxError(check.reason);
      return;
    }

    e.preventDefault();
    setTxHash(check.normalized);
    setTxError("");
  };

  const handleTxChange = (e) => {
    const nextVal = e.target.value;
    // Allow only hex characters and leading '0x' while typing up to 66 chars
    const sanitized = nextVal.replace(/[^0-9a-fA-Fx]/g, "").slice(0, 66);
    setTxHash(sanitized);

    if (!sanitized) {
      setTxError("");
      return;
    }

    const check = normalizeAndValidateTxId(sanitized, networkKey);
    if (check.valid) {
      setTxError("");
    } else if (sanitized.length >= 64) {
      setTxError(check.reason);
    } else {
      setTxError("");
    }
  };

  const txValidation = normalizeAndValidateTxId(txHash, networkKey);

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    const check = normalizeAndValidateTxId(txHash, networkKey);
    if (!check.valid) {
      setTxError(check.reason);
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
          tx_hash: check.normalized,
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
      setTxError("");
      window.dispatchEvent(new Event("cardora:payment-updated"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="funds-container">
      <div className="funds-header">
        <h2>Add Funds</h2>
        <p>Choose your preferred deposit amount (minimum ${MIN_DEPOSIT}.00).</p>
      </div>

      <div className="funds-body-grid">
        <div className="funds-left-column">
          <div className="funds-options-grid">
            {PRESET_PACKAGES.map((val) => {
              const isSelected = !custom && Number(amount) === val;
              return (
                <div
                  key={val}
                  className={`funds-option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePresetClick(val)}
                >
                  <p>${val}</p>
                  <span>Deposit</span>
                </div>
              );
            })}
          </div>

          <div className="custom-amount-group">
            <label htmlFor="custom-amount">Custom amount (Min ${MIN_DEPOSIT})</label>
            <input
              id="custom-amount"
              type="number"
              min={MIN_DEPOSIT}
              step="any"
              className="custom-amount-input"
              placeholder={`Min $${MIN_DEPOSIT}`}
              value={custom}
              onChange={handleCustomChange}
              onBlur={handleCustomBlur}
              onWheel={(e) => e.target.blur()}
            />
            {amountError && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "block"
                }}
              >
                {amountError}
              </span>
            )}
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
          <p className="summary-total-amount">${currentTotal}</p>
        </div>
        <button
          type="button"
          className="add-funds-btn"
          onClick={handleOpenCryptoPrompt}
          disabled={currentTotal < MIN_DEPOSIT || Boolean(amountError)}
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
                    onChange={(e) => {
                      setNetworkKey(e.target.value);
                      setTxHash("");
                      setTxError("");
                    }}
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
                    Transaction ID
                  </label>
                  <input
                    id="tx-hash-input"
                    type="text"
                    value={txHash}
                    onChange={handleTxChange}
                    onPaste={handleTxPaste}
                    placeholder={
                      networkKey === "ERC20"
                        ? "Paste your Transaction id"
                        : "Paste your Transaction id (TxID)"
                    }
                    required
                    style={{
                      padding: "11px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${txError ? "#dc2626" : "#cbd5e1"}`,
                      fontFamily: "monospace",
                      fontSize: "0.88rem",
                      color: "#FFF"
                    }}
                  />
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Paste the blockchain TxID / hash from your withdrawal history.
                  </span>
                  {txError && (
                    <span
                      style={{
                        color: "#dc2626",
                        fontSize: "0.82rem",
                        fontWeight: 600
                      }}
                    >
                      {txError}
                    </span>
                  )}
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
                    disabled={submitting || !txValidation.valid}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: txValidation.valid ? "#2563eb" : "#94a3b8",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      cursor: txValidation.valid && !submitting ? "pointer" : "not-allowed"
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