import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "./FundingRequests.css";

const normalize = (value) => value?.trim().toLowerCase() || "";

function Dialog({ title, children, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')];
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className="cadp-request-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cadp-request-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>
      <div className="cadp-request-heading"><h2>{title}</h2><button type="button" aria-label="Close" onClick={onClose}>×</button></div>
      {children}
    </section>
  </div>, document.body);
}

export default function FundingRequests({ profile, endorsementProject, onCloseEndorsement, onAccepted }) {
  const [requests, setRequests] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [inbox, setInbox] = useState(false);
  const [tab, setTab] = useState("received");
  const [selectedId, setSelectedId] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAgency, setTransferAgency] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const closeInbox = useCallback(() => { setInbox(false); setSelectedId(null); setTransferOpen(false); }, []);
  const closeEndorsement = useCallback(() => { if (!busy) onCloseEndorsement(); }, [busy, onCloseEndorsement]);
  const load = useCallback(async () => {
    const result = await supabase.from("funding_endorsements").select("*").order("created_at", { ascending: false });
    if (result.error) throw result.error;
    setRequests(result.data || []);
  }, []);
  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const refresh = async () => {
      try { await load(); if (active) setError(""); }
      catch (err) { if (active) setError(err.message || "Unable to load requests. Run funding_endorsements.sql first."); }
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [profile?.id, load]);
  useEffect(() => {
    if (!endorsementProject && !transferOpen) return;
    let active = true;
    if (endorsementProject) { setRecipient(""); setMessage(""); }
     setError(""); setNotice(""); setAgencies([]); setLoading(true);
    supabase.rpc("funding_recipient_agencies").then(({ data, error: err }) => {
      if (!active) return;
      if (err) setError(err.message);
      else setAgencies(data || []);
      setLoading(false);
    }).catch((err) => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; };
  }, [endorsementProject, transferOpen]);
  const received = requests.filter((item) => normalize(item.recipient_agency) === normalize(profile?.agency) && !item.recipient_deleted);
  const sent = requests.filter((item) => item.sender_id === profile?.id);
  const pending = received.filter((item) => item.status === "pending").length;
  const visible = tab === "sent" ? sent : received;
  const selected = visible.find((item) => item.id === selectedId);
  const isReceiver = Boolean(selected && !selected.recipient_deleted
    && normalize(selected.recipient_agency) === normalize(profile?.agency)
    && ["super_admin", "admin", "user"].includes(profile?.role));
  const mayRespond = isReceiver && selected?.status === "pending";
  const transferOptions = agencies.filter((item) => ![
    normalize(profile?.agency), normalize(selected?.sender_agency),
    normalize(selected?.original_sender_agency || selected?.sender_agency),
  ].includes(normalize(item.agency)));
  async function send(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: err } = await supabase.rpc("send_funding_endorsement", {
        p_project_id: String(endorsementProject.id), p_recipient_agency: recipient, p_message: message.trim(),
      });
      if (err) throw err;
      onCloseEndorsement(); setInbox(true); setTab("sent"); setSelectedId(null);
      setNotice("Funding request sent successfully.");
      await load();
    } catch (err) { setError(err.message || "Unable to send request."); }
    finally { setBusy(false); }
  }
  async function respond(status) {
    if (busy || !selected || !mayRespond) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: err } = await supabase.rpc("respond_funding_endorsement", { p_request_id: selected.id, p_status: status, p_reply: reply.trim() });
      if (err) throw err;
      setNotice(status === "accepted" ? "Request accepted. The project is now in your Programs / Projects list." : "Request declined.");
      setReply(""); await load();
      if (status === "accepted") await onAccepted?.();
    } catch (err) { setError(err.message || "Unable to respond."); }
    finally { setBusy(false); }
  }
  async function transfer(event) {
    event.preventDefault();
    if (busy || !mayRespond || !transferOptions.some((item) => item.agency === transferAgency)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: err } = await supabase.rpc("transfer_funding_endorsement", {
        p_request_id: selected.id, p_recipient_agency: transferAgency, p_message: transferMessage.trim(),
      });
      if (err) throw err;
      setTransferOpen(false); setSelectedId(null); setTab("sent");
      setNotice("Request transferred successfully."); await load();
    } catch (err) { setError(err.message || "Unable to transfer request."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="cadp-inbox-button" title="Funding requests" aria-label={`Funding inbox, ${pending} pending requests`}
      onClick={() => { setInbox(true); setTab("received"); setSelectedId(null); setNotice(""); }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>
      {pending > 0 && <span className="cadp-inbox-badge">{pending > 99 ? "99+" : pending}</span>}
    </button>
    {endorsementProject && <Dialog title="Endorse for Funding" onClose={closeEndorsement}>
      <form onSubmit={send} className="cadp-request-form">
        <p><strong>{endorsementProject.intervention}</strong></p>
        <label>Receiving agency<select required value={recipient} disabled={busy || loading} onChange={(event) => setRecipient(event.target.value)}>
          <option value="">{loading ? "Loading agencies…" : "Select an agency"}</option>
          {agencies.filter((item) => normalize(item.agency) !== normalize(profile?.agency)).map((item) => <option key={item.agency} value={item.agency}>{item.agency}</option>)}
        </select></label>
        {!loading && agencies.filter((item) => normalize(item.agency) !== normalize(profile?.agency)).length === 0 && <p>No other agencies with eligible accounts are available.</p>}
        <label>Message<textarea required maxLength={4000} rows={5} value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} placeholder="Explain the funding request…" /></label>
        {error && <p role="alert" className="cadp-request-error">{error}</p>}
        <div className="cadp-request-footer"><button type="button" disabled={busy} onClick={closeEndorsement}>Cancel</button><button className="cadp-primary" disabled={busy || loading || !recipient || !message.trim()}>{busy ? "Sending…" : "Send Request"}</button></div>
      </form>
    </Dialog>}
    {inbox && <Dialog title="Funding Requests" onClose={closeInbox}>
      <div className="cadp-request-tabs"><button type="button" aria-pressed={tab === "received"} onClick={() => { setTab("received"); setSelectedId(null); setTransferOpen(false); }}>Inbox ({pending})</button><button type="button" aria-pressed={tab === "sent"} onClick={() => { setTab("sent"); setSelectedId(null); setTransferOpen(false); }}>Sent</button><button type="button" disabled={busy} onClick={() => load().then(() => setError("")).catch((err) => setError(err.message))}>Refresh</button></div>
      {error && <p role="alert" className="cadp-request-error">{error}</p>}
      {notice && <p role="status" className="cadp-request-notice">{notice}</p>}
      {selected ? <div className="cadp-request-detail">
        <button type="button" onClick={() => { setSelectedId(null); setTransferOpen(false); }}>← Back to requests</button>
        <h3>{selected.project_title}</h3>
        <p>From: <strong>{selected.sender_agency}</strong><br/>To: <strong>{selected.recipient_agency}</strong></p>
        <p className="cadp-request-status" data-status={selected.recipient_deleted ? "deleted" : selected.status}>{selected.recipient_deleted ? "Deleted by receiver" : selected.status}</p>
        {selected.forwarded_to && <p>Transferred to: <strong>{selected.forwarded_to}</strong></p>}
        {selected.parent_request_id && <p>Originally sent by: <strong>{selected.original_sender_agency}</strong></p> }
        <p className="cadp-request-message">{selected.message}</p>
        <small>Sent {new Date(selected.created_at).toLocaleString()}</small>
        {selected.responded_at && <p>Response ({new Date(selected.responded_at).toLocaleString()}): <span className="cadp-request-message">{selected.reply || "No reply message."}</span></p>}
        {mayRespond && !transferOpen && <><label>Reply (optional)<textarea rows={3} maxLength={4000} value={reply} disabled={busy} onChange={(event) => setReply(event.target.value)} /></label><p className="cadp-request-help">Accept adds the shared project to your agency's Programs / Projects list. Record funding separately through Add Fund.</p></>}
        {mayRespond && !transferOpen && <div className="cadp-request-footer">
          <button type="button" disabled={busy} onClick={() => { setTransferOpen(true); setTransferAgency(""); setTransferMessage(selected.message); setError(""); }}>Transfer</button>
          <button type="button" className="cadp-primary" disabled={busy} onClick={() => respond("accepted")}>{busy ? "Saving…" : "Accept"}</button>
        </div>}
        {transferOpen && mayRespond && <form className="cadp-request-transfer" onSubmit={transfer}>
          <h4>Transfer to another agency</h4>
          <label>Receiving agency<select required disabled={busy || loading} value={transferAgency} onChange={(event) => setTransferAgency(event.target.value)}>
            <option value="">{loading ? "Loading agencies…" : "Select another agency"}</option>
            {transferOptions.map((item) => <option key={item.agency} value={item.agency}>{item.agency}</option>)}
          </select></label>
          {!loading && transferOptions.length === 0 && <p>No other eligible agencies are available.</p>}
          <label>Message<textarea required rows={3} maxLength={4000} disabled={busy} value={transferMessage} onChange={(event) => setTransferMessage(event.target.value)} /></label>
          <div className="cadp-request-footer"><button type="button" disabled={busy} onClick={() => setTransferOpen(false)}>Cancel</button><button className="cadp-primary" disabled={busy || loading || !transferAgency || !transferMessage.trim()}>{busy ? "Transferring…" : "Transfer Request"}</button></div>
        </form>}

      </div> : <div className="cadp-request-list">
        {visible.length === 0 && <p>No {tab === "sent" ? "sent" : "received"} requests yet.</p>}
        {visible.map((item) => <button type="button" key={item.id} onClick={() => { setSelectedId(item.id); setTransferOpen(false); setReply(""); setNotice(""); }}>
          <strong>{item.project_title}</strong><span>{tab === "sent" ? `To: ${item.recipient_agency}` : `From: ${item.sender_agency}`}</span><span className="cadp-request-preview">{item.message}</span><span className="cadp-request-status" data-status={item.recipient_deleted ? "deleted" : item.status}>{item.recipient_deleted ? "Deleted by receiver" : item.status}</span><small>{new Date(item.created_at).toLocaleString()}</small>
        </button>)}
      </div>}
    </Dialog>}
  </>;
}
