import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
export function ExternalLink({ href, children, className = "", ...props }) {
  const external = /^(https?:|\.\.\/)/.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
    </a>
  );
}
export function LinkRow({ title, description, href, icon = "external" }) {
  return (
    <ExternalLink href={href} className="link-row">
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <Icon name={icon} />
    </ExternalLink>
  );
}
export function SectionTitle({ children, action }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
export function LoadState({
  resource,
  children,
  message = "This source is unavailable right now.",
}) {
  if (resource.loading)
    return (
      <p className="load-state" role="status">
        Loading…
      </p>
    );
  if (resource.error)
    return (
      <div className="load-state" role="status">
        <p>{message}</p>
        <button className="text-button" onClick={resource.retry}>
          Try again <Icon name="refresh" size={15} />
        </button>
      </div>
    );
  return children(resource.data);
}
export function Dialog({ title, onClose, children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...ref.current.querySelectorAll(
        'a[href],button,input,select,textarea,[tabindex="0"]',
      ),
    ].filter(
      (el) =>
        !el.disabled &&
        el.getClientRects().length &&
        (el.type !== "radio" || el.checked),
    );
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="sheet-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
          autoFocus
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
