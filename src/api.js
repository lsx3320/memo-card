// AI 文案整理 API：优先后端代理；后端不可用时前端直连 DeepSeek
// 真实 key 从网站根目录的 config.json 读取（部署时放一次，不进代码/仓库）

let cachedKey = '';

// 读取网站根目录的 config.json（相对路径，适配部署在任意子路径）
async function getDeepSeekKey() {
  if (cachedKey) return cachedKey;
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      cachedKey = String(j.deepseekKey || '').trim();
    }
  } catch { /* 未部署 config.json */ }
  return cachedKey;
}

const buildPrompt = (text) =>
  '你是文案排版助手。请把下面的原始文案整理成一张「文字卡片」的规整内容，要求：\n' +
  '1. 识别并保留核心标题（若无则提炼一个，不超过 14 字）；\n' +
  '2. 正文按语义分自然段，每段一句或几句，逻辑连贯；\n' +
  '3. 规范标点与空格（统一全角标点、去掉多余空行与空格）；\n' +
  '4. 保持原意与语气，不增删内容、不润色过度、不评论；\n' +
  '5. 短句金句可单独成段。\n\n' +
  '严格输出如下 JSON，不要任何额外文字：\n' +
  '{"title":"标题","content":"第一段\\n\\n第二段\\n\\n…（按原意分段，\n为换行）"}\n\n' +
  '原始文案：\n' + text;

const parseResult = (rawText) => {
  const m = String(rawText || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('模型返回格式异常');
  const parsed = JSON.parse(m[0]);
  return {
    title: String(parsed.title || '').trim(),
    content: String(parsed.content || '').trim(),
  };
};

// 前端直连 DeepSeek（key 从 config.json 读）
async function viaDirect(text) {
  const key = await getDeepSeekKey();
  if (!key) {
    const e = new Error('未配置 AI key：请在网站根目录放置 config.json');
    e.noKey = true;
    throw e;
  }
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildPrompt(text) }],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek API ${r.status}`);
  const data = await r.json();
  return parseResult(data?.choices?.[0]?.message?.content);
}

// 主入口：优先后端代理；后端不可用（纯静态部署）时前端直连
export async function formatWithAI(text) {
  try {
    const res = await fetch('/api/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return await res.json();
  } catch { /* 后端不可达，走直连 */ }
  return await viaDirect(text);
}
