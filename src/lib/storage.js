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
  // 最多保留 50 条
  saveHistory(list.slice(0, 50));
  return list;
}

export function removeHistory(id) {
  const list = loadHistory().filter((x) => x.id !== id);
  saveHistory(list);
  return list;
}

// ========== 云同步（jsonbin.io，浏览器直连） ==========
const CLOUD_KEY = 'memo-card:cloudkey';
const CLOUD_BIN = 'memo-card:cloudbin';
const BIN_URL = 'https://api.jsonbin.io/v3/b';

export function getCloudKey() {
  try {
    return localStorage.getItem(CLOUD_KEY) || '';
  } catch {
    return '';
  }
}

export function setCloudKey(k) {
  try {
    localStorage.setItem(CLOUD_KEY, k);
  } catch { /* ignore */ }
}

export function getCloudBin() {
  try {
    return localStorage.getItem(CLOUD_BIN) || '';
  } catch {
    return '';
  }
}

export function setCloudBin(id) {
  try {
    localStorage.setItem(CLOUD_BIN, id);
  } catch { /* ignore */ }
}

// 上传历史到云端（首次自动创建 bin）
export async function cloudPush(key, binId, data) {
  const isUpdate = !!binId;
  const res = await fetch(isUpdate ? `${BIN_URL}/${binId}` : BIN_URL, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': key,
      'X-Bin-Name': 'memo-card-notes',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`云同步失败（${res.status}）`);
  const j = await res.json();
  // 创建时 bin id 在 metadata.id（record 是数据本体）
  return isUpdate ? binId : (j.metadata?.id || j.record?.id || '');
}

// 从云端拉取历史
export async function cloudPull(key, binId) {
  if (!binId) return null;
  const res = await fetch(`${BIN_URL}/${binId}/latest`, {
    headers: { 'X-Master-Key': key },
  });
  if (!res.ok) throw new Error(`云读取失败（${res.status}）`);
  const j = await res.json();
  return j.record;
}
