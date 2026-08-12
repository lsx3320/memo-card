// 登录门禁：股票操盘风格（密码固定）
import { useState } from 'react';

const PASSWORD = 'yc031213';

const TICKERS = [
  { name: '上证指数', code: 'SH000001', val: '3245.78', chg: '+0.86%', up: true },
  { name: '深证成指', code: 'SZ399001', val: '10456.32', chg: '-0.32%', up: false },
  { name: '创业板指', code: 'SZ399006', val: '2134.55', chg: '+1.24%', up: true },
  { name: '恒生指数', code: 'HKHSI', val: '19432.11', chg: '+0.45%', up: true },
  { name: '沪深300', code: 'SH000300', val: '3812.09', chg: '-0.12%', up: false },
  { name: '中证500', code: 'SH000905', val: '5789.23', chg: '+0.68%', up: true },
  { name: '科创50', code: 'SH000688', val: '987.42', chg: '-0.85%', up: false },
  { name: '北证50', code: 'BJ899050', val: '1456.77', chg: '+2.03%', up: true },
];

// K线/走势装饰（上涨趋势折线）
const KLINE_POINTS = '0,120 40,105 80,112 120,90 160,98 200,72 240,80 280,55 320,64 360,40 400,48 440,22';

export default function LoginGate({ onLogin }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = () => {
    if (pass === PASSWORD) {
      sessionStorage.setItem('memo-login', '1');
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="login">
      {/* 背景氛围 */}
      <div className="login-atmosphere" />

      {/* 顶部行情滚动条 */}
      <div className="login-ticker">
        <div className="login-ticker-inner">
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <span key={i} className="ticker-item">
              <b className="ticker-name">{t.name}</b>
              <span className="ticker-code">{t.code}</span>
              <span className={`ticker-val ${t.up ? 'up' : 'down'}`}>{t.val}</span>
              <span className={`ticker-chg ${t.up ? 'up' : 'down'}`}>{t.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 中部：K线装饰 + 登录面板 */}
      <div className="login-body">
        {/* 背景走势装饰 */}
        <svg className="login-kline" viewBox="0 0 440 130" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="kfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e03333" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e03333" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,130 ${KLINE_POINTS} 440,130`} fill="url(#kfill)" />
          <polyline points={KLINE_POINTS} fill="none" stroke="#e03333" strokeWidth="2" />
          {/* 网格 */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" y1={i * 32} x2="440" y2={i * 32} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
        </svg>

        {/* 登录面板 */}
        <div className={`login-panel ${shake ? 'login-shake' : ''}`}>
          <div className="login-brand">
            <div className="login-logo">📈</div>
            <h1 className="login-title">操盘终端</h1>
            <p className="login-sub">QUANT · 量化交易系统</p>
          </div>

          <div className="login-field">
            <label htmlFor="login-pass" className="login-label">交易密码</label>
            <input
              id="login-pass"
              type="password"
              className={`login-input ${error ? 'login-input-err' : ''}`}
              placeholder="请输入交易密码"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoFocus
            />
          </div>

          <button type="button" className="login-btn" onClick={submit}>进入系统</button>

          {error && <p className="login-err">✕ 密码错误，请重试</p>}

          <div className="login-status">
            <span className="status-dot" /> 系统在线 · 行情实时更新中
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="login-footer">
        <span>CONN 已连接</span>
        <span className="mono">{new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
        <span className="up">▲ 综合指数 +0.86%</span>
      </div>
    </div>
  );
}
