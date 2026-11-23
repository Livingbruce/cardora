import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard/Rules.css";

export default function Rules() {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsOpen(false);
    navigate("/dashboard/Funds");
  };

  if (!isOpen) return null;

  return (
    <div className="rules-modal-overlay" onClick={handleClose}>
      <div className="rules-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="rules-modal-header">
          <h3 className="rules-modal-title">
            Shop Rules <span className="rules-timestamp">(Last updated at 10 Nov 2026 17:07)</span>
          </h3>
          <button className="rules-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="rules-modal-body">
          <div className="rules-warning-title">WARNING!</div>
          
          <div className="rules-links-block">
            <p style={{ fontWeight: 600, marginBottom: "4px" }}>OUR LINKS IS ONLY:</p>
            <p>WEB: wizardshop.cc</p>
            <p>TOR: wizardkikfp2xz66k53god4dmmf7osk4zpmxhoyaszvpwflgm42u3mid.onion</p>
            <p>TELEGRAM NEWS: <a href="https://t.me/WizardShop_News" target="_blank" rel="noreferrer">https://t.me/WizardShop_News</a></p>
          </div>

          <div className="cc-rules-heading">CC RULES:</div>

          <div className="rules-list">
            <p>1. We are dont have refunds at all. All tickets with cards will be ignored</p>
            <p>2. Prices in the shop can change on random days of sales, these days in the shop there are good discounts on the cards. Don't miss these discounts - follow the news in the shop, the NEWS tab. and our telegram channel https://t.me/WizardShop_News</p>
            <p>3. If you have any issues, use the ticket system.</p>
            <p>4. We do not provide credit for accounts.</p>
            <p>5. If you add funds via BTC, 3 transaction confirmation is required, for LTC - 4. At the same time, the conversion of the cryptocurrency rate to the usd takes place.</p>
            <p>6. The password in the cards is - the password that the card holder indicated when registering with the store from which the card came in. It may not be used anywhere, it's just is.</p>
            <p>7. Withdrawal of funds is impossible. Dont refill more than you want to spend.</p>
            <p>8. You automatically agree with all our rules.</p>
            <p>9. Rules can be changed at any time.</p>
            <p>10. We have the right to refuse service without giving reasons.</p>
          </div>

          <div className="rules-footer-action">
            <button className="rules-footer-close-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}