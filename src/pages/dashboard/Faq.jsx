import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard/Faq.css";

export default function Faq() {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsOpen(false);
    navigate("/dashboard");
  };

  if (!isOpen) return null;

  return (
    <div className="faq-modal-overlay" onClick={handleClose}>
      <div className="faq-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="faq-modal-header">
          <h3 className="faq-modal-title">
            Frequently Answered Questions <span className="faq-timestamp">(Last updated at 10 Nov 2026 17:36)</span>
          </h3>
          <button className="faq-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="faq-modal-body">
          <div className="faq-heading">F.A.Q.</div>

          <div className="faq-list">
            <div className="faq-item">
              <p className="faq-question">- I have just registered, where should I start from?</p>
              <p className="faq-answer">Carefully read “Rules” and “F.A.Q.” web-pages. After that go to “Add Funds” to Top-Up your account.</p>
            </div>

            <div className="faq-item">
              <p className="faq-question">- I have questions, how can I ask it?</p>
              <p className="faq-answer">Use our ticket system, but carefully read “Rules” and “FAQ” before</p>
            </div>

            <div className="faq-item">
              <p className="faq-question">- My orders are missing, how did this happen?</p>
              <p className="faq-answer">We keep orders for indefinite time. They might be erased without notification. Please always save the orders on your side.</p>
            </div>

            <div className="faq-item">
              <p className="faq-question">- Can I have multiuser account?</p>
              <p className="faq-answer">No</p>
            </div>

            <div className="faq-item">
              <p className="faq-question">- I got my account BANNED, what to do now?</p>
              <p className="faq-answer">Apply a ticket request. We will process investigation on Your case and if You've been banned occasionally we will bring our apologies.</p>
            </div>

            <div className="faq-item">
              <p className="faq-question">- I lost access to my account or it has been stolen. What should I fill in ticket request?</p>
              <p className="faq-answer">Please register new account and create ticket with username of stolen account, provide email or any other info you registered with, last 3 cards you bought before your account was stolen and last know balance of your account. If we verify you, you'll get your account back, but we don't make any compensation, if balance was spent.</p>
            </div>
          </div>

          <div className="faq-footer-action">
            <button className="faq-footer-close-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}