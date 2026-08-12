// 设置弹层：云同步（jsonbin）+ AI 直连 key
import { useState } from 'react';

export default function SettingsModal({
  cloudKey,
  cloudBin,
  aiKey,
  syncedAt,
  onClose,
  onSaveCloud,
  onSaveAI,
  onSyncNow,
}) {
  const [cloudInput, setCloudInput] = useState(cloudKey);
  const [aiInput, setAiInput] = useState(aiKey);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const saveCloud = async () => {
    setBusy(true);
    setMsg('');
    try {
      onSaveCloud(cloudInput.trim());
      setMsg('已保存云同步 key');
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setMsg('');
    try {
      await onSyncNow(cloudInput.trim());
      setMsg('✅ 已同步到云端');
    } catch (e) {
      setMsg(`✗ ${e.message || '同步失败'}`);
    } finally {
      setBusy(false);
    }
  };

  const saveAI = () => {
    onSaveAI(aiInput.trim());
    setMsg('已保存 AI key');
  };

  return (
    <div className="history-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <h3 className="settings-title">设置</h3>

        {/* 云同步 */}
        <div className="settings-section">
          <p className="settings-label">☁️ 云同步（jsonbin.io）</p>
          <p className="settings-hint">
            保存的卡片会存到云端，换浏览器/设备自动恢复。需要 jsonbin.io 的 Master Key。
          </p>
          <input
            type="password"
            className="settings-input"
            placeholder="jsonbin.io Master Key"
            value={cloudInput}
            onChange={(e) => setCloudInput(e.target.value)}
          />
          {cloudBin && <p className="settings-ok">✓ 已连接云端</p>}
          {syncedAt && <p className="settings-hint">上次同步：{new Date(syncedAt).toLocaleString()}</p>}
          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={saveCloud} disabled={busy}>保存 Key</button>
            <button type="button" className="btn btn-primary" onClick={syncNow} disabled={busy || !cloudInput.trim()}>
              {busy ? '同步中…' : '立即同步'}
            </button>
          </div>
        </div>

        <div className="settings-divider" />

        {/* AI 直连 */}
        <div className="settings-section">
          <p className="settings-label">✨ AI 整理（DeepSeek key，纯静态部署时直连用）</p>
          <input
            type="password"
            className="settings-input"
            placeholder="DeepSeek API key（sk-...）"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />
          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={saveAI}>保存</button>
          </div>
        </div>

        {msg && <p className="settings-msg">{msg}</p>}

        <button type="button" className="btn btn-ghost settings-close" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
