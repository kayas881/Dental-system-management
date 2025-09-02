import React, { useEffect, useState } from 'react';
import { dentalLabService } from '../services/dentalLabService';

// Listens for window event 'openRevisionHistory' with detail { workOrder }
const RevisionPanelManager = ({ formatDate }) => {
  const [visible, setVisible] = useState(false);
  const [workOrder, setWorkOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // No debug state in production version

  const fetchHistory = async (wo) => {
    if (!wo) return;
    setLoading(true);
    setError(null);
    const res = await dentalLabService.getRevisionHistory(wo.id);
    if (res.success) {
      setHistory(res.data || []);
    } else {
      setError(res.error || 'Failed to load revision history');
    }
    setLoading(false);
  };
  useEffect(() => {
    const handler = async (e) => {
      const wo = e.detail?.workOrder;
      if (!wo) return;
      setWorkOrder(wo);
      setVisible(true);
      await fetchHistory(wo);
    };
    window.addEventListener('openRevisionHistory', handler);
    return () => window.removeEventListener('openRevisionHistory', handler);
  }, []);

  const close = () => {
      setVisible(false);
      setWorkOrder(null);
      setHistory([]);
  };

  if (!visible) return null;

  return (
    <div className="revision-history-panel shadow" style={{ top: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Revisions – {workOrder?.serial_number}</h6>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" onClick={() => fetchHistory(workOrder)} disabled={loading}>↻</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={close}>✕</button>
        </div>
      </div>
      {loading && <div className="small text-muted">Loading...</div>}
      {error && <div className="alert alert-danger py-1 small mb-2">{error}</div>}
      {!loading && !error && history.length === 0 && <div className="small text-muted">No revisions yet.</div>}
      {!loading && history.length > 0 && (
        <ul className="list-group small" style={{maxHeight:'45vh', overflowY:'auto'}}>
          {history.map((rev, i) => {
            const last = i === history.length - 1;
            const active = last && workOrder.status !== 'completed';
            return (
              <li key={rev.id} className="list-group-item py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>#{rev.revision_number}</strong>
                  <span className="text-muted">{formatDate ? formatDate(rev.return_date) : rev.return_date}</span>
                </div>
                <div className="mt-1">
                  <span className="me-2"><strong>Reason:</strong> {rev.return_reason || '—'}</span>
                  {rev.previous_completion_date && <span className="me-2"><strong>Prev:</strong> {formatDate ? formatDate(rev.previous_completion_date) : rev.previous_completion_date}</span>}
                  {rev.new_expected_completion_date && <span className="me-2"><strong>New ETA:</strong> {formatDate ? formatDate(rev.new_expected_completion_date) : rev.new_expected_completion_date}</span>}
                  {rev.revision_notes && <div className="text-muted"><em>{rev.revision_notes}</em></div>}
                  <div className="mt-1">
                                        {active ? <span className="badge bg-info text-dark">Active</span> : <span className="badge bg-success">Done</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default RevisionPanelManager;