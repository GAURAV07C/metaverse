import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Trash2, X } from 'lucide-react';
import type { MediaDiagnostics } from '../../utils/mediasoupClient';

interface MediaDiagnosticsPanelProps {
  open: boolean;
  onClose: () => void;
  getDiagnostics: () => Promise<MediaDiagnostics | null>;
  storageKey?: string;
}

type QualityHistoryEntry = {
  timestamp: string;
  warningCount: number;
  warnings: string[];
  producers: number;
  consumers: number;
  queuedProducers: number;
  liveTransports?: number;
  liveProducers?: number;
  liveConsumers?: number;
};

function formatNumber(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value > 1000 ? value.toLocaleString() : String(Math.round(value * 100) / 100);
}

function StatRow({ label, value }: { label: string; value?: number | string | boolean }) {
  return (
    <div className="media-diagnostic-stat">
      <span>{label}</span>
      <strong>{typeof value === 'number' ? formatNumber(value) : String(value ?? '-')}</strong>
    </div>
  );
}

function getQualityWarnings(diagnostics: MediaDiagnostics | null) {
  if (!diagnostics) return [];
  const warnings: string[] = [];
  const streams = [
    ...diagnostics.producers.map(item => ({ label: `Sending ${item.type}`, trackState: item.trackState, stats: item.stats })),
    ...diagnostics.consumers.map(item => ({ label: `Receiving ${item.type || item.kind || 'media'}`, trackState: item.trackState, stats: item.stats })),
  ];

  if (!diagnostics.hasSendTransport || !diagnostics.hasRecvTransport) {
    warnings.push('One or more mediasoup transports are missing.');
  }
  if (diagnostics.pendingRemoteProducers > 0) {
    warnings.push(`${diagnostics.pendingRemoteProducers} remote producer(s) are still queued.`);
  }
  diagnostics.serverLifecycle?.networkWarnings?.forEach(warning => warnings.push(warning));

  streams.forEach(({ label, trackState, stats }) => {
    if (trackState === 'ended') warnings.push(`${label} track has ended.`);
    if (typeof stats.packetsLost === 'number' && stats.packetsLost > 10) warnings.push(`${label} has packet loss (${stats.packetsLost}).`);
    if (typeof stats.jitter === 'number' && stats.jitter > 0.08) warnings.push(`${label} has high jitter (${formatNumber(stats.jitter)}).`);
    if (typeof stats.roundTripTime === 'number' && stats.roundTripTime > 0.45) warnings.push(`${label} has high RTT (${formatNumber(stats.roundTripTime)}s).`);
    if (typeof stats.framesPerSecond === 'number' && stats.framesPerSecond > 0 && stats.framesPerSecond < 12) warnings.push(`${label} has low FPS (${formatNumber(stats.framesPerSecond)}).`);
  });

  return Array.from(new Set(warnings));
}

function summarizeDiagnostics(diagnostics: MediaDiagnostics | null): QualityHistoryEntry | null {
  if (!diagnostics) return null;
  const warnings = getQualityWarnings(diagnostics);
  return {
    timestamp: new Date().toISOString(),
    warningCount: warnings.length,
    warnings,
    producers: diagnostics.producers.length,
    consumers: diagnostics.consumers.length,
    queuedProducers: diagnostics.pendingRemoteProducers,
    liveTransports: diagnostics.serverLifecycle?.liveTransports,
    liveProducers: diagnostics.serverLifecycle?.liveProducers,
    liveConsumers: diagnostics.serverLifecycle?.liveConsumers,
  };
}

function readHistory(storageKey: string): QualityHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 25) : [];
  } catch {
    return [];
  }
}

function writeHistory(storageKey: string, entries: QualityHistoryEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 25)));
}

export function MediaDiagnosticsPanel({ open, onClose, getDiagnostics, storageKey = 'metaverse_media_quality' }: MediaDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<MediaDiagnostics | null>(null);
  const [history, setHistory] = useState<QualityHistoryEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastSavedAtRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextDiagnostics = await getDiagnostics();
      setDiagnostics(nextDiagnostics);
      const snapshot = summarizeDiagnostics(nextDiagnostics);
      if (snapshot && Date.now() - lastSavedAtRef.current > 10000) {
        lastSavedAtRef.current = Date.now();
        setHistory(prev => {
          const next = [snapshot, ...prev].slice(0, 25);
          writeHistory(storageKey, next);
          return next;
        });
      }
    } catch (err) {
      console.error('Media diagnostics failed', err);
      setError('Unable to read WebRTC stats right now.');
    } finally {
      setLoading(false);
    }
  }, [getDiagnostics, storageKey]);

  useEffect(() => {
    if (!open) return;
    setHistory(readHistory(storageKey));
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(timer);
  }, [load, open, storageKey]);

  if (!open) return null;

  const qualityWarnings = getQualityWarnings(diagnostics);
  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `media-quality-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const clearHistory = () => {
    localStorage.removeItem(storageKey);
    setHistory([]);
  };

  return (
    <div className="media-diagnostics-backdrop" role="presentation" onClick={onClose}>
      <section className="media-diagnostics-panel" role="dialog" aria-modal="true" aria-labelledby="media-diagnostics-title" onClick={event => event.stopPropagation()}>
        <header>
          <div>
            <strong id="media-diagnostics-title">Media diagnostics</strong>
            <span>Live mediasoup transport, track, and RTP stats</span>
          </div>
          <div className="media-diagnostics-actions">
            <button type="button" onClick={() => void load()} disabled={loading} title="Refresh diagnostics" aria-label="Refresh diagnostics">
              <RefreshCw size={16} />
            </button>
            <button type="button" onClick={exportHistory} disabled={!history.length} title="Export quality history" aria-label="Export quality history">
              <Download size={16} />
            </button>
            <button type="button" onClick={clearHistory} disabled={!history.length} title="Clear quality history" aria-label="Clear quality history">
              <Trash2 size={16} />
            </button>
            <button type="button" onClick={onClose} title="Close diagnostics" aria-label="Close diagnostics">
              <X size={16} />
            </button>
          </div>
        </header>

        {error && <p className="media-diagnostics-error">{error}</p>}

        <div className={`media-quality-banner ${qualityWarnings.length ? 'warning' : 'healthy'}`}>
          <strong>{qualityWarnings.length ? 'Media quality needs attention' : 'Media quality looks normal'}</strong>
          {qualityWarnings.length ? (
            <ul>
              {qualityWarnings.slice(0, 4).map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          ) : (
            <span>No packet loss, jitter, RTT, or track-state warning detected from current stats.</span>
          )}
        </div>

        <div className="media-diagnostics-summary">
          <StatRow label="Send transport" value={diagnostics?.hasSendTransport ? 'ready' : 'missing'} />
          <StatRow label="Receive transport" value={diagnostics?.hasRecvTransport ? 'ready' : 'missing'} />
          <StatRow label="Local producers" value={diagnostics?.producers.length || 0} />
          <StatRow label="Remote consumers" value={diagnostics?.consumers.length || 0} />
          <StatRow label="Queued producers" value={diagnostics?.pendingRemoteProducers || 0} />
        </div>

        <div className="media-diagnostics-sections">
          <div>
            <h3>Sending</h3>
            {diagnostics?.producers.length ? diagnostics.producers.map(producer => (
              <article key={producer.id} className="media-diagnostic-card">
                <b>{producer.type} - {producer.kind}</b>
                <small>{producer.trackState || 'unknown'} track</small>
                <StatRow label="Bytes sent" value={producer.stats.bytesSent} />
                <StatRow label="Packets sent" value={producer.stats.packetsSent} />
                <StatRow label="RTT" value={producer.stats.roundTripTime} />
                <StatRow label="FPS" value={producer.stats.framesPerSecond} />
              </article>
            )) : <p className="media-diagnostics-empty">No local media is being sent.</p>}
          </div>

          <div>
            <h3>Receiving</h3>
            {diagnostics?.consumers.length ? diagnostics.consumers.map(consumer => (
              <article key={consumer.id} className="media-diagnostic-card">
                <b>{consumer.type || consumer.kind} - {consumer.kind}</b>
                <small>{consumer.trackState || 'unknown'} track</small>
                <StatRow label="Bytes received" value={consumer.stats.bytesReceived} />
                <StatRow label="Packets received" value={consumer.stats.packetsReceived} />
                <StatRow label="Packets lost" value={consumer.stats.packetsLost} />
                <StatRow label="Jitter" value={consumer.stats.jitter} />
                <StatRow label="Decoded frames" value={consumer.stats.framesDecoded} />
              </article>
            )) : <p className="media-diagnostics-empty">No remote media is connected.</p>}
          </div>

          <div>
            <h3>Server lifecycle</h3>
            {diagnostics?.serverLifecycle ? (
              <article className="media-diagnostic-card">
                <b>{diagnostics.serverLifecycle.available ? 'Mediasoup available' : 'Mediasoup unavailable'}</b>
                <small>{diagnostics.serverLifecycle.unavailableReason || `RTC ${diagnostics.serverLifecycle.rtcMinPort}-${diagnostics.serverLifecycle.rtcMaxPort}`}</small>
                <StatRow label="Live transports" value={diagnostics.serverLifecycle.liveTransports} />
                <StatRow label="Live producers" value={diagnostics.serverLifecycle.liveProducers} />
                <StatRow label="Live consumers" value={diagnostics.serverLifecycle.liveConsumers} />
                <StatRow label="Producers created" value={diagnostics.serverLifecycle.producersCreated} />
                <StatRow label="Consumers created" value={diagnostics.serverLifecycle.consumersCreated} />
                <StatRow label="Announced IP" value={diagnostics.serverLifecycle.announcedIp || 'not set'} />
              </article>
            ) : <p className="media-diagnostics-empty">Server lifecycle metrics are not available.</p>}
          </div>

          <div>
            <h3>Quality history</h3>
            {history.length ? history.slice(0, 6).map(entry => (
              <article key={entry.timestamp} className="media-diagnostic-card">
                <b>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b>
                <small>{entry.warningCount ? `${entry.warningCount} warning(s)` : 'healthy snapshot'}</small>
                <StatRow label="Sending" value={entry.producers} />
                <StatRow label="Receiving" value={entry.consumers} />
                <StatRow label="Queued" value={entry.queuedProducers} />
                {entry.warnings.slice(0, 2).map(warning => <small key={warning}>{warning}</small>)}
              </article>
            )) : <p className="media-diagnostics-empty">No saved quality snapshots yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
