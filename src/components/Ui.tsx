import { ArrowUpRight, Plus, X } from "lucide-react";

export function Metric({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: any;
  tone: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}
export function Status({ status }: { status: string }) {
  return <span className={`status ${statusClassName(status)}`}>{status}</span>;
}
function statusClassName(s: string) {
  return s.toLowerCase().replace("-", "");
}
export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: any;
}) {
  return (
    <div className="page-title-row">
      <div>
        <div className="eyebrow">BUSINESS WORKSPACE</div>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function Quick({
  icon,
  title,
  text,
  onClick,
}: {
  icon: any;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button className="quick-card" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <ArrowUpRight size={16} className="quick-arrow" />
    </button>
  );
}
export function Empty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: any;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <b>{title}</b>
      <p>{text}</p>
      <button className="btn light" onClick={onAction}>
        <Plus size={14} />
        {action}
      </button>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  printable = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: any;
  wide?: boolean;
  printable?: boolean;
}) {
  return (
    <div
      className={`modal-backdrop${printable ? " print-invoice" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
