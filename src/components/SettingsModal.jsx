// 设置弹层：云同步状态（key 已内置固定）
export default function SettingsModal({ syncedAt, onClose }) {
  return (
    <div className="history-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        <h3 className="settings-title">设置</h3>

        <div className="settings-section">
          <p className="settings-label">☁️ 云同步</p>
          <p className="settings-ok">✓ 已配置云端共享（固定 key，所有浏览器共用同一份数据）</p>
          <p className="settings-hint">
            保存卡片自动上传云端；换浏览器点工具栏「☁️ 同步」即可拉取。每 5 秒自动刷新。
          </p>
          {syncedAt > 0 && (
            <p className="settings-hint">上次同步：{new Date(syncedAt).toLocaleString()}</p>
          )}
        </div>

        <div className="settings-divider" />

        <div className="settings-section">
          <p className="settings-label">✨ AI 整理</p>
          <p className="settings-ok">✓ 已内置 DeepSeek（无需配置，纯静态部署也可用）</p>
        </div>

        <button type="button" className="btn btn-ghost settings-close" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
