import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase";
import { getActiveClient } from "../../../utils/currentClient";
import "../../../styles/dashboard/tickets/newTicket.css";

export default function NewTicket() {
  const [subject, setSubject] = useState("");
  const [describe, setDescribe] = useState("");
  const [lang, setLang] = useState(true);
  const [details, setDetails] = useState(true);
  const [update, setUpdate] = useState(true);
  const [response, setResponse] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !describe.trim() || submitting) return;

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
          ticket_type: "support",
          subject: subject.trim(),
          order_reference: null,
          message: describe.trim(),
          status: "open"
        }
      ]);

      if (insertError) {
        alert("Failed to create ticket: " + insertError.message);
        return;
      }

      alert("Support ticket created!");
      navigate("/dashboard/Tickets", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate("/dashboard/Tickets");
  };

  return (
    <div className="new-ticket-container">
      <div className="new-ticket-header">
        <h2>Create new Ticket</h2>
      </div>

      <form className="new-ticket-card" onSubmit={handleCreate}>
        <div className="new-ticket-inputs-body">
          <div className="new-ticket-subject">
            <input
              id="subject"
              type="text"
              placeholder="Ticket Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="new-ticket-describe">
            <textarea
              id="describe"
              placeholder="Describe your problem"
              value={describe}
              onChange={(e) => setDescribe(e.target.value)}
              required
            />
          </div>

          <div className="new-ticket-instructions">
            <div className="new-ticket-ins">
              <input
                type="checkbox"
                id="lang"
                checked={lang}
                onChange={(e) => setLang(e.target.checked)}
              />
              <label htmlFor="lang"><p>We accept English only!</p></label>
            </div>

            <div className="new-ticket-ins">
              <input
                type="checkbox"
                id="details"
                checked={details}
                onChange={(e) => setDetails(e.target.checked)}
              />
              <label htmlFor="details"><p>Provide essential details to your problem (short and concise).</p></label>
            </div>

            <div className="new-ticket-ins">
              <input
                type="checkbox"
                id="updates"
                checked={update}
                onChange={(e) => setUpdate(e.target.checked)}
              />
              <label htmlFor="updates"><p>Never request updates in tickets system.</p></label>
            </div>

            <div className="new-ticket-ins">
              <input
                type="checkbox"
                id="response"
                checked={response}
                onChange={(e) => setResponse(e.target.checked)}
              />
              <label htmlFor="response"><p>You will receive a response soon.</p></label>
            </div>
          </div>
        </div>

        <div className="new-ticket-buttons-container">
          <button id="create" type="submit" className="new-ticket-btn-create" disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </button>
          <button id="close" type="button" className="new-ticket-btn-close" onClick={handleClose} disabled={submitting}>
            Close
          </button>
        </div>
      </form>
    </div>
  );
}