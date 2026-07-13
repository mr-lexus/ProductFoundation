import type { SystemStatusModel } from "../../../entities/system";

interface SystemStatusPanelProps {
  model: SystemStatusModel;
}

export function SystemStatusPanel({ model }: SystemStatusPanelProps) {
  return (
    <article className="system-status-panel">
      <h2 className="system-status-panel__title">{model.title}</h2>
      <p className="system-status-panel__message">{model.message}</p>

      <div className="system-status-panel__grid">
        <div className="system-status-panel__meta">
          <span className="system-status-panel__label">Platform</span>
          <p className="system-status-panel__value">{model.platform}</p>
        </div>

        <div className="system-status-panel__meta">
          <span className="system-status-panel__label">Transport</span>
          <p className="system-status-panel__value">{model.transportMeta}</p>
        </div>

        <div className="system-status-panel__meta">
          <span className="system-status-panel__label">Request ID</span>
          <p className="system-status-panel__value">{model.requestId}</p>
        </div>

        <div className="system-status-panel__meta">
          <span className="system-status-panel__label">Served At</span>
          <p className="system-status-panel__value">{model.servedAt}</p>
        </div>

        <div className="system-status-panel__meta">
          <span className="system-status-panel__label">API Base URL</span>
          <p className="system-status-panel__value">{model.apiBaseUrl}</p>
        </div>
      </div>
    </article>
  );
}
