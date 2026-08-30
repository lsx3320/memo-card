# 便签卡片 · Memo Card

苹果备忘录风格的**文字卡片应用**——随手记下收藏的句子和感悟，自动排版，云端同步，多设备一致。

## 功能

- ✍️ **备忘录式写作**：标题 + 正文，手机端全屏书写体验（移动端优先）
- 📐 **自动排版**：本地规则识别标题 / 金句 / 列表 / 段落，零负担
- ✨ **AI 整理**（可选）：DeepSeek 把零散文案整理成规整的标题 + 分段
- 🖼️ **历史卡片**：保存到本页 → 历史列表 → 点击放大预览 / 下载 PNG 图片（1080×1350）
- ☁️ **云端同步**：所有设备共用同一份数据，以云端为准，多设备展示一致
- 🔒 **安全**：jsonbin key 只存服务端（有后端时）；登录密码哈希存储

## 快速开始

```bash
npm install
npm run dev          # http://localhost:5173（后端 8010）
```

- 预览示例：`http://localhost:5173/?demo=1`

## Docker 部署（推荐，key 零暴露）

```bash
cp .env.example .env   # 填入 JSONBIN_MASTER_KEY / JSONBIN_BIN（jsonbin.io 生成）
docker compose up -d --build   # http://localhost:8010
```

云同步 key 只存在于**服务端环境变量**（`.env`），前端 bundle 不含任何 key。

## 纯静态托管（如 Claudefer）

```bash
npm run build          # 产物在 dist/
```

- 访问根 `/` 自动跳转 `/dist/index.html`
- **云同步降级**：无后端时前端直连 jsonbin，构建时需注入 key：
  ```bash
  PUBLIC_JSONBIN_BIN=6a7c55c5... PUBLIC_JSONBIN_KEY='$2a$10$...' npm run build
  ```
  > ⚠️ 此模式下 key 会进入前端 bundle（纯静态部署的固有取舍）。推荐用 Docker/后端部署。

### AI 整理配置

- **有后端**：在服务端设 `DEEPSEEK_API_KEY`（见 `.env.example`），前端零配置、key 零暴露
- **纯静态**：点 ⚙️ 设置填 DeepSeek key（存本浏览器 localStorage）

### 云同步机制

- 保存卡片自动上传云端；换设备点「☁️ 同步」拉取
- **以云端为准**：任何设备打开都拉云端覆盖本地，删除在云端生效 → 所有设备看到一致
- 登录密码：`src/components/LoginGate.jsx` 中 `PASSWORD_HASH`（SHA-256），改密码先算哈希替换

## 技术

- 前端：React 19 + Vite（`html-to-image` 懒加载，首屏不含）
- 后端：Express（`/api/cards` jsonbin 代理 + `/api/format` DeepSeek 代理 + 静态托管）
- 数据：localStorage（草稿 + 历史）+ jsonbin.io（云端共享）
- 移动端优先响应式布局，支持 iPhone 安全区
