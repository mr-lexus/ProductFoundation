import type { HelloWorldCardModel } from "../../../entities/hello";

interface HelloWorldPanelProps {
  model: HelloWorldCardModel;
}

export function HelloWorldPanel({ model }: HelloWorldPanelProps) {
  return (
    <article className="hello-world-panel">
      <h2 className="hello-world-panel__title">{model.title}</h2>
      <p className="hello-world-panel__message">{model.message}</p>

      <div className="hello-world-panel__grid">
        <div className="hello-world-panel__meta">
          <span className="hello-world-panel__label">Platform</span>
          <p className="hello-world-panel__value">{model.platform}</p>
        </div>

        <div className="hello-world-panel__meta">
          <span className="hello-world-panel__label">Transport</span>
          <p className="hello-world-panel__value">{model.transportMeta}</p>
        </div>

        <div className="hello-world-panel__meta">
          <span className="hello-world-panel__label">Request ID</span>
          <p className="hello-world-panel__value">{model.requestId}</p>
        </div>

        <div className="hello-world-panel__meta">
          <span className="hello-world-panel__label">Served At</span>
          <p className="hello-world-panel__value">{model.servedAt}</p>
        </div>

        <div className="hello-world-panel__meta">
          <span className="hello-world-panel__label">API Base URL</span>
          <p className="hello-world-panel__value">{model.apiBaseUrl}</p>
        </div>
      </div>
    </article>
  );
}
