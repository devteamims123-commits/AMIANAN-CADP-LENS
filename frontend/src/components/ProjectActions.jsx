import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FundingRequests.css";

export default function ProjectActions({ canFund, canEdit, canDelete, onFund, onEdit, onEndorse, onDelete }) {
  const anchor = useRef(null);
  const menu = useRef(null);
  const [position, setPosition] = useState(null);
  useEffect(() => {
    if (!position) return;
    const close = (event) => {
      if (!anchor.current?.contains(event.target) && !menu.current?.contains(event.target)) setPosition(null);
    };
    const escape = (event) => {
      if (event.key === "Escape") { setPosition(null); anchor.current?.focus(); }
    };
    const scroll = () => setPosition(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", scroll);
    window.addEventListener("scroll", scroll, true);
    menu.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [position]);
  const run = (callback) => { setPosition(null); callback(); };
  if (!canFund && !canEdit && !canDelete) return <span>—</span>;
  return <>
    <button type="button" className="cadp-action-toggle" ref={anchor} aria-expanded={Boolean(position)} aria-haspopup="true"
      onClick={() => {
        const rect = anchor.current.getBoundingClientRect();
        const height = 190;
        setPosition(position ? null : {
          left: Math.max(8, Math.min(rect.right - 210, window.innerWidth - 218)),
          top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 6,
        });
      }}>Actions ▾</button>
    {position && createPortal(<div ref={menu} className="cadp-action-menu" style={position}>
      {canFund && <button type="button" onClick={() => run(onFund)}>Add Fund</button>}
      {canEdit && <button type="button" onClick={() => run(onEdit)}>Edit Project</button>}
      {canEdit && <button type="button" onClick={() => run(onEndorse)}>Endorse for Funding</button>}
      {canDelete && <button type="button" className="cadp-danger" onClick={() => run(onDelete)}>Delete</button>}
    </div>, document.body)}
  </>;
}
