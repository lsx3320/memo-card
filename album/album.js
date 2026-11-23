/* 相册页：内置照片 + 本机上传（IndexedDB）合并渲染 + 分类筛选 + 搜索 + 灯箱 */
(function () {
  "use strict";

  /* ================= 内置照片 ================= */
  var BASE = [
    {
      id: "guhaishouzhang-desktop", title: "股海手账 · 登录门",
      desc: "站点首页。暗色玻璃拟态卡片 + 行情跑马灯，密码门后是手账主页。（1280×800）",
      tag: "应用", date: "2026-11-23", w: 1280, h: 800, file: "guhaishouzhang-desktop"
    },
    {
      id: "enso-board", title: "共生气象 · 厄尔尼诺看板",
      desc: "子页面 /enso/ 的实时信息流：多源采集 + 研判打分，条目按相关度排序。（1280×800）",
      tag: "数据", date: "2026-11-23", w: 1280, h: 800, file: "enso-board"
    },
    {
      id: "guhaishouzhang-mobile", title: "移动端 · 390×844",
      desc: "iPhone 视口下的首屏，安全区与圆角都保留完好，说明响应式是通的。（390×844）",
      tag: "应用", date: "2026-11-23", w: 390, h: 844, file: "guhaishouzhang-mobile"
    },
    {
      id: "shared-demo", title: "跨浏览器云共享 Demo",
      desc: "demo-shared.html：共享留言板，同一 jsonbin 容器在任意设备读写，用来验证云端同步链路。（1280×800）",
      tag: "开发", date: "2026-11-23", w: 1280, h: 800, file: "shared-demo"
    },
    {
      id: "github-repo", title: "GitHub · memo-card",
      desc: "仓库根目录，dist/ 即线上产物；默认分支 master，414 次提交。（1280×800）",
      tag: "开发", date: "2026-11-23", w: 1280, h: 800, file: "github-repo"
    },
    {
      id: "commit-marker", title: "标注点那次提交",
      desc: "「test: 添加 YC 连接标注点」——提交后 20 秒内线上生效，用来验证 Git → Cloudflare 自动部署。（1280×800）",
      tag: "开发", date: "2026-11-23", w: 1280, h: 800, file: "commit-marker"
    },
    {
      id: "album-desktop", title: "相册页 · 桌面端",
      desc: "就是你现在看的这一页——瀑布流、分类筛选、悬停浮层，灯箱支持 ← → 翻页。（1280×820）",
      tag: "应用", date: "2026-11-23", w: 1280, h: 820, file: "album-desktop"
    },
    {
      id: "album-mobile", title: "相册页 · 移动端",
      desc: "单列瀑布流，灯箱翻页按钮改为左右悬浮，390px 视口下无横向溢出。（390×844）",
      tag: "应用", date: "2026-11-23", w: 390, h: 844, file: "album-mobile"
    }
  ];

  var UNTAGGED = "未分类";

  /* ================= 小工具 ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  var toastTimer = null;
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ================= IndexedDB ================= */
  var DB_NAME = "yc-album";
  var STORE = "photos";
  var dbPromise = null;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("这个浏览器不支持 IndexedDB"));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var s = d.createObjectStore(STORE, { keyPath: "id" });
          s.createIndex("date", "date");
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function dbAll() {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var tx = d.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).openCursor();
        req.onsuccess = function (e) {
          var c = e.target.result;
          if (c) { out.push(c.value); c.continue(); } else { resolve(out); }
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function dbPut(rec) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = function () { resolve(rec); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function dbDelete(id) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ================= 状态 ================= */
  var local = [];              /* 本机添加的照片 */
  var state = { tag: "全部", q: "", list: [] };

  function all() { return local.concat(BASE); }

  function tagsOf(list) {
    var out = [], seen = {};
    list.forEach(function (p) { if (!seen[p.tag]) { seen[p.tag] = 1; out.push(p.tag); } });
    return out;
  }

  /* ================= 渲染：分类 / 统计 ================= */
  function renderFilters() {
    var list = all();
    var names = ["全部"].concat(tagsOf(list));
    $("filters").innerHTML = "";
    names.forEach(function (name) {
      var n = name === "全部" ? list.length : list.filter(function (p) { return p.tag === name; }).length;
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.tag === name));
      b.innerHTML = esc(name) + '<span class="n">' + n + "</span>";
      b.addEventListener("click", function () {
        state.tag = name;
        renderFilters();
        render();
      });
      $("filters").appendChild(b);
    });
  }

  function renderStats() {
    var list = all();
    var updated = list.map(function (p) { return p.date; }).sort().pop() || "-";
    $("stats").innerHTML =
      stat(list.length, "张照片") +
      stat(tagsOf(list).length, "个分类") +
      stat(local.length, "张本机添加") +
      stat(updated, "最近更新");
  }

  function stat(v, label) {
    return '<div class="stat"><b>' + esc(v) + "</b><span>" + label + "</span></div>";
  }

  /* ================= 渲染：网格 ================= */
  function matches(p) {
    if (state.tag !== "全部" && p.tag !== state.tag) return false;
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    return (p.title + " " + p.desc + " " + p.tag).toLowerCase().indexOf(q) > -1;
  }

  var io = null;
  function reveal() {
    var cards = $("grid").querySelectorAll(".card:not(.in)");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(cards, function (c) { c.classList.add("in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "80px 0px" });
    }
    Array.prototype.forEach.call(cards, function (c, i) {
      c.style.transitionDelay = Math.min(i * 40, 240) + "ms";
      io.observe(c);
    });
  }

  function thumbSrc(p) { return p.local ? p.thumbURL : "./photos/thumb/" + p.file + ".jpg"; }
  function fullSrc(p) { return p.local ? p.fullURL : "./photos/full/" + p.file + ".jpg"; }

  function render() {
    state.list = all().filter(matches);
    var grid = $("grid");
    grid.innerHTML = "";
    state.list.forEach(function (p, i) {
      var btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      btn.setAttribute("aria-label", "查看 " + p.title);
      btn.innerHTML =
        '<span class="tag">' + esc(p.tag) + "</span>" +
        (p.local ? '<span class="badge-local">本机</span>' : "") +
        '<img src="' + thumbSrc(p) + '" alt="' + esc(p.title) + '" width="' + p.w + '" height="' + p.h +
        '" loading="lazy" decoding="async" />' +
        '<span class="overlay"><h3>' + esc(p.title) + "</h3><p>" + esc(p.desc) + "</p></span>";
      btn.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(btn);
    });
    $("empty").hidden = state.list.length > 0;
    reveal();
  }

  /* ================= 灯箱 ================= */
  var lb, cur = 0;
  function openLightbox(idx) {
    cur = idx;
    paint();
    lb.hidden = false;
    void lb.offsetWidth;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    $("lbClose").focus();
  }
  function paint() {
    var p = state.list[cur];
    if (!p) return;
    $("lbImg").src = fullSrc(p);
    $("lbImg").alt = p.title;
    $("lbTitle").textContent = p.title;
    $("lbDesc").textContent = p.desc || "";
    $("lbCounter").textContent = (cur + 1) + " / " + state.list.length;
    $("lbDownload").href = fullSrc(p);
    $("lbDownload").setAttribute("download", (p.title || "photo") + ".jpg");
    $("lbDel").hidden = !p.local;
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { lb.hidden = true; }, 200);
  }
  function step(d) {
    if (!state.list.length) return;
    cur = (cur + d + state.list.length) % state.list.length;
    paint();
  }

  /* ================= 添加照片 ================= */
  var queue = [];   /* {id, file, url, title, tag, desc} */
  var sheet, drop;

  function openSheet() {
    queue = [];
    renderQueue();
    sheet.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    sheet.hidden = true;
    queue.forEach(function (q) { if (q.url) URL.revokeObjectURL(q.url); });
    queue = [];
    renderQueue();
    document.body.style.overflow = "";
  }

  function addFiles(files) {
    var rejected = [];
    Array.prototype.forEach.call(files, function (f) {
      if (!f.type || f.type.indexOf("image/") !== 0) { rejected.push(f.name + "（不是图片）"); return; }
      if (f.size > 20 * 1024 * 1024) { rejected.push(f.name + "（超过 20MB）"); return; }
      var name = f.name.replace(/\.[^.]+$/, "");
      queue.push({
        id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        file: f, url: URL.createObjectURL(f),
        title: name.slice(0, 60),
        tag: state.tag !== "全部" ? state.tag : UNTAGGED,
        desc: ""
      });
    });
    if (rejected.length) toast("已跳过：" + rejected.join("、"));
    renderQueue();
  }

  function renderQueue() {
    var ul = $("queue");
    ul.innerHTML = "";
    queue.forEach(function (q, i) {
      var li = document.createElement("li");
      li.className = "q-item";
      li.innerHTML =
        '<img src="' + q.url + '" alt="" />' +
        '<div class="q-fields">' +
        '<input class="q-title" maxlength="60" placeholder="给这张图起个名字" value="' + esc(q.title) + '" />' +
        '<div class="q-row">' +
        '<select class="q-tag"></select>' +
        '<input class="q-desc" maxlength="120" placeholder="一句话说明（可留空）" value="' + esc(q.desc) + '" />' +
        "</div></div>" +
        '<button class="q-remove" type="button" aria-label="移除">✕</button>';
      var sel = li.querySelector(".q-tag");
      tagsOf(all()).concat([UNTAGGED]).forEach(function (n) {
        var o = document.createElement("option");
        o.value = n; o.textContent = n;
        if (n === q.tag) o.selected = true;
        sel.appendChild(o);
      });
      li.querySelector(".q-title").addEventListener("input", function (e) { q.title = e.target.value; });
      li.querySelector(".q-desc").addEventListener("input", function (e) { q.desc = e.target.value; });
      sel.addEventListener("change", function (e) { q.tag = e.target.value; });
      li.querySelector(".q-remove").addEventListener("click", function () {
        URL.revokeObjectURL(q.url);
        queue.splice(i, 1);
        renderQueue();
      });
      ul.appendChild(li);
    });
    $("queueEmpty").hidden = queue.length > 0;
    $("queueCount").textContent = queue.length + " 张待添加";
    $("sheetSave").disabled = queue.length === 0;
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file).catch(function () { return loadImg(file); });
    }
    return loadImg(file);
  }
  function loadImg(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  function makeThumb(src, maxSide) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    var cw = Math.round(w * scale), ch = Math.round(h * scale);
    var c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    c.getContext("2d").drawImage(src, 0, 0, cw, ch);
    return new Promise(function (resolve) {
      c.toBlob(function (b) { resolve({ blob: b, w: w, h: h }); }, "image/jpeg", 0.84);
    });
  }

  function saveQueue() {
    if (!queue.length) return;
    var btn = $("sheetSave");
    btn.disabled = true;
    btn.textContent = "保存中…";
    var items = queue.slice();
    var chain = Promise.resolve();
    items.forEach(function (q) {
      chain = chain.then(function () {
        return loadBitmap(q.file).then(function (bmp) {
          return makeThumb(bmp, 900).then(function (t) {
            return dbPut({
              id: q.id, title: q.title || "未命名", desc: q.desc || "",
              tag: q.tag || UNTAGGED, date: today(), w: t.w, h: t.h,
              thumb: t.blob, full: q.file, type: q.file.type
            });
          });
        });
      });
    });
    chain.then(function () {
      var saved = items.length;
      closeSheet();
      if (state.tag !== "全部" && items.every(function (q) { return q.tag !== state.tag; })) {
        state.tag = "全部";
      }
      return loadLocal().then(function () {
        renderFilters(); renderStats(); render();
        toast(saved + " 张照片已添加到本机相册");
      });
    }).catch(function (e) {
      console.error(e);
      toast("保存失败：" + (e && e.message ? e.message : e));
      btn.disabled = false;
      btn.textContent = "保存到相册";
    }).then(function () {
      btn.textContent = "保存到相册";
    });
  }

  /* ================= 加载本机照片 ================= */
  function loadLocal() {
    local.forEach(function (p) {
      if (p.thumbURL) URL.revokeObjectURL(p.thumbURL);
      if (p.fullURL) URL.revokeObjectURL(p.fullURL);
    });
    local = [];
    return dbAll().then(function (rows) {
      rows.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      local = rows.map(function (r) {
        return {
          id: r.id, title: r.title, desc: r.desc, tag: r.tag || UNTAGGED,
          date: r.date, w: r.w, h: r.h, local: true,
          thumbURL: URL.createObjectURL(r.thumb),
          fullURL: URL.createObjectURL(r.full)
        };
      });
    }).catch(function (e) {
      console.warn("IndexedDB 不可用：", e);
      local = [];
    });
  }

  /* ================= 事件绑定 ================= */
  function bind() {
    lb = $("lightbox");
    sheet = $("sheet");
    drop = $("drop");

    $("addBtn").addEventListener("click", openSheet);
    $("sheetClose").addEventListener("click", closeSheet);
    $("sheetCancel").addEventListener("click", closeSheet);
    $("sheetSave").addEventListener("click", saveQueue);
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) closeSheet();
    });

    $("file").addEventListener("change", function (e) {
      if (e.target.files && e.target.files.length) addFiles(e.target.files);
      e.target.value = "";
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    $("lbClose").addEventListener("click", closeLightbox);
    $("lbPrev").addEventListener("click", function () { step(-1); });
    $("lbNext").addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lb-stage")) closeLightbox();
    });
    $("lbDel").addEventListener("click", function () {
      var p = state.list[cur];
      if (!p || !p.local) return;
      if (!confirm("删除这张照片？只从这台设备移除。")) return;
      dbDelete(p.id).then(function () { return loadLocal(); }).then(function () {
        closeLightbox();
        toast("已删除");
        renderFilters(); renderStats(); render();
      });
    });

    $("search").addEventListener("input", function (e) {
      state.q = e.target.value.trim();
      render();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (sheet && !sheet.hidden) { closeSheet(); return; }
        if (lb && !lb.hidden) { closeLightbox(); return; }
        return;
      }
      if (lb && !lb.hidden) {
        if (e.key === "ArrowLeft") step(-1);
        else if (e.key === "ArrowRight") step(1);
      }
    });
  }

  /* ================= 启动 ================= */
  bind();
  renderFilters();
  renderStats();
  render();
  loadLocal().then(function () {
    renderFilters();
    renderStats();
    render();
  });
})();
