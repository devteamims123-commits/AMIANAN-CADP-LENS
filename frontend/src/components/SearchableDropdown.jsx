import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./SearchableDropdown.css";

export default function SearchableDropdown({
  label, value, options, onChange, placeholder = "Search or select", disabled = false,
}) {
  const id = useId();
  const trigger = useRef(null);
  const search = useRef(null);
  const list = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => options.filter((option) =>
    option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ), [options, query]);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);
  useEffect(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, [value, disabled]);
  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (option) => { onChange(option); close(); };
  const show = () => { setQuery(""); setActive(0); setOpen(true); };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((previous) => Math.max(0, Math.min(filtered.length - 1,
        previous + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); close();
    }
  };

  return (
    <div className="cadp-search-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="cadp-search-select__trigger"
        disabled={disabled} aria-label={`${label}: ${value || placeholder}`}
        aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => open ? setOpen(false) : show()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !disabled) { event.preventDefault(); show(); }
        }}>
        <span className={value ? "" : "cadp-search-select__placeholder"}>{value || placeholder}</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d={open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && !disabled && (
        <div id={`${id}-panel`} className="cadp-search-select__panel">
          <input ref={search} type="search" className="cadp-search-select__search"
            role="combobox" aria-label={`Search ${label}`} aria-autocomplete="list"
            aria-expanded="true" aria-controls={`${id}-list`}
            aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
            placeholder={placeholder} value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={onKeyDown} />
          <div ref={list} id={`${id}-list`} role="listbox" aria-label={label}
            className="cadp-search-select__options">
            {filtered.map((option, index) => (
              <div key={option} id={`${id}-option-${index}`} role="option"
                aria-selected={option === value}
                className={`cadp-search-select__option${index === active ? " is-active" : ""}${option === value ? " is-selected" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActive(index)} onClick={() => choose(option)}>
                {option}
              </div>
            ))}
          </div>
          {!filtered.length && <p className="cadp-search-select__empty" role="status">No matching options.</p>}
        </div>
      )}
    </div>
  );
}
