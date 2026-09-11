// localStorage：草稿 + 历史卡片
const DRAFT_KEY = 'memo-card:draft';
const HISTORY_KEY = 'memo-card:history';

export function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch { /* ignore */ }
}

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function addHistory(item) {
  const list = loadHistory();
  list.unshift(item);
  // 最多保留 50 条（返回截断后的列表，保证 UI 与存储一致）
  const capped = list.slice(0, 50);
  saveHistory(capped);
  return capped;
}

export function removeHistory(id) {
  const list = loadHistory().filter((x) => x.id !== id);
  saveHistory(list);
  return list;
}

// ========== 云同步（jsonbin.io，所有设备共享同一份数据） ==========
// 部署策略：
// 1. 纯静态部署（Claudefer 等，无后端）→ 前端直连 jsonbin，key 以内置默认值打包
//    （可用构建环境变量 PUBLIC_JSONBIN_KEY / PUBLIC_JSONBIN_BIN / PUBLIC_JSONBIN_DELETED_BIN 覆盖）
// 2. Docker / 有后端部署 → 优先后端代理（key 只存服务端 env），前端 bundle 不含 key
//
// 同步语义：云端权威 + 删除名单（tombstone）自愈
// - 拉取：以云端为准覆盖本地；本地残留的旧卡片不会被上传
// - 删除：写入云端「删除名单」bin，任何设备同步时都会排除该卡片
// - 自愈：若云端被旧版客户端弹回已删卡片，新版同步时会自动清理并回写
const CLOUD_BIN = import.meta.env.PUBLIC_JSONBIN_BIN || '6a7c55c5f5f4af5e290b8e09';
const CLOUD_KEY = import.meta.env.PUBLIC_JSONBIN_KEY || '$2a$10$Iyqn3eO8f2SOtdwE9A9k1uY7MIXfb5k1Z7pYYkWZW9lYtxc1bJlbi';
const DELETED_BIN = import.meta.env.PUBLIC_JSONBIN_DELETED_BIN || '6aa41946ac6210605ac1038c';
const BIN_URL = 'https://api.jsonbin.io/v3/b';
const DELETED_KEY = 'memo-card:deleted';

// 后端代理可用性探测（纯静态部署下避免每次都白发代理请求）
let proxyAvailable = null;

async function viaProxy(path, options) {
  if (proxyAvailable === false) return null;
  try {
    const r = await fetch(path, options);
    const ct = r.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    if (proxyAvailable === null) proxyAvailable = isJson;
    if (r.ok && isJson) return await r.json();
  } catch { proxyAvailable = false; }
  return null;
}

// 已删除标记（本地 tombstone）
export function getDeletedIds() {
  try {
    const arr = JSON.parse(localStorage.getItem(DELETED_KEY));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDeletedIds(set) {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...set].slice(-300)));
  } catch { /* ignore */ }
}

function addDeletedId(id) {
  const set = getDeletedIds();
  set.add(id);
  saveDeletedIds(set);
  return set;
}

// —— 卡片读取：后端代理优先，失败降级直连 ——
async function cloudGet() {
  const proxied = await viaProxy('/api/cards', { headers: { Accept: 'application/json' } });
  if (proxied) return Array.isArray(proxied.record) ? proxied.record : [];

  const r = await fetch(`${BIN_URL}/${CLOUD_BIN}/latest`, { headers: { 'X-Master-Key': CLOUD_KEY } });
  if (!r.ok) throw new Error(`云读取失败（${r.status}）`);
  const j = await r.json();
  return Array.isArray(j.record) ? j.record : [];
}

async function cloudPut(data) {
  const proxied = await viaProxy('/api/cards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  if (proxied) return;

  const r = await fetch(`${BIN_URL}/${CLOUD_BIN}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': CLOUD_KEY },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`云写入失败（${r.status}）`);
}

// —— 云端删除名单 ——
async function cloudGetDeleted() {
  const proxied = await viaProxy('/api/deleted', { headers: { Accept: 'application/json' } });
  if (proxied) return Array.isArray(proxied.deleted) ? proxied.deleted : [];

  const r = await fetch(`${BIN_URL}/${DELETED_BIN}/latest`, { headers: { 'X-Master-Key': CLOUD_KEY } });
  if (!r.ok) throw new Error(`删除名单读取失败（${r.status}）`);
  const j = await r.json();
  return Array.isArray(j.record?.deleted) ? j.record.deleted : [];
}

async function cloudPutDeleted(ids) {
  const body = { deleted: [...new Set(ids)].slice(-300) };
  const proxied = await viaProxy('/api/deleted', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (proxied) return;

  const r = await fetch(`${BIN_URL}/${DELETED_BIN}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': CLOUD_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`删除名单写入失败（${r.status}）`);
}

// 本地 + 云端删除名单并集；并把本地新增的删除标记同步到云端
async function resolveTombstones() {
  const local = getDeletedIds();
  let cloudIds = [];
  try {
    cloudIds = await cloudGetDeleted();
  } catch { /* 云端不可达时仅用本地名单 */ }

  const merged = new Set([...cloudIds, ...local]);
  const cloudSet = new Set(cloudIds);
  const hasNewLocal = [...local].some((id) => !cloudSet.has(id));
  if (hasNewLocal) {
    try { await cloudPutDeleted([...merged]); } catch { /* ignore */ }
  }
  return merged;
}

// 云端权威拉取：本地缓存跟随云端；并自愈被旧客户端弹回的已删卡片
export async function cloudPull() {
  const cloud = await cloudGet();
  const tombstones = await resolveTombstones();
  const cleaned = cloud.filter((x) => x && x.id && x.id !== '_init' && !tombstones.has(x.id));
  saveHistory(cleaned);
  // 自愈：云端含已删卡片（或占位脏数据）→ 回写干净列表
  if (cleaned.length !== cloud.length) {
    cloudPut(cleaned).catch(() => {});
  }
  return cleaned;
}

// 上传新增卡片：云端 ∪ 新增（过滤删除名单，不把本地残留旧卡片带回去）
export async function cloudAdd(items) {
  const cloud = await cloudGet();
  const tombstones = await resolveTombstones();
  const cleaned = cloud.filter((x) => x && x.id && x.id !== '_init' && !tombstones.has(x.id));
  const seen = new Set(cleaned.map((x) => x.id));
  (Array.isArray(items) ? items : [items]).forEach((x) => {
    if (x && x.id && !seen.has(x.id) && !tombstones.has(x.id)) {
      cleaned.push(x);
      seen.add(x.id);
    }
  });
  cleaned.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const capped = cleaned.slice(0, 50);
  await cloudPut(capped);
  return capped;
}

// 删除卡片：写入云端删除名单（跨设备生效）+ 从云端移除
export async function cloudRemove(id) {
  const local = addDeletedId(id);
  try {
    const cloudIds = await cloudGetDeleted().catch(() => []);
    await cloudPutDeleted([...new Set([...cloudIds, ...local, id])]);
  } catch { /* 云端名单写入失败也不影响本地标记 */ }

  try {
    const cloud = await cloudGet();
    await cloudPut(cloud.filter((x) => x && x.id !== id));
  } catch { /* 云端删除失败：删除名单仍会拦住弹回 */ }
}
