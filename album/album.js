/* 相册页：数据驱动渲染 + 分类筛选 + 搜索 + 灯箱 */
(function () {
  "use strict";

  var PHOTOS = [
    {
      id: "guhaishouzhang-desktop",
      title: "股海手账 · 登录门",
      desc: "站点首页。暗色玻璃拟态卡片 + 行情跑马灯，密码门后是手账主页。（1280×800）",
      tag: "应用",
      date: "2026-11-23",
      w: 1280, h: 800,
      file: "guhaishouzhang-desktop"
    },
    {
      id: "enso-board",
      title: "共生气象 · 厄尔尼诺看板",
      desc: "子页面 /enso/ 的实时信息流：多源采集 + 研判打分，条目按相关度排序。（1280×800）",
      tag: "数据",
      date: "2026-11-23",
      w: 1280, h: 800,
      file: "enso-board"
    },
    {
      id: "guhaishouzhang-mobile",
      title: "移动端 · 390×844",
      desc: "iPhone 视口下的首屏，安全区与圆角都保留完好，说明响应式是通的。（390×844）",
      tag: "应用",
      date: "2026-11-23",
      w: 390, h: 844,
      file: "guhaishouzhang-mobile"
    },
    {
      id: "shared-demo",
      title: "跨浏览器云共享 Demo",
      desc: "demo-shared.html：共享留言板，同一 jsonbin 容器在任意设备读写，用来验证云端同步链路。（1280×800）",
      tag: "开发",
      date: "2026-11-23",
      w: 1280, h: 800,
      file: "shared-demo"
    },
    {
      id: "github-repo",
      title: "GitHub · memo-card",
      desc: "仓库根目录，dist/ 即线上产物；默认分支 master，414 次提交。（1280×800）",
      tag: "开发",
      date: "2026-11-23",
      w: 1280, h: 800,
      file: "github-repo"
    },
    {
      id: "commit-marker",
      title: "标注点那次提交",
      desc: "「test: 添加 YC 连接标注点」——提交后 20 秒内线上生效，用来验证 Git → Cloudflare 自动部署。（1280×800）",
      tag: "开发",
      date: "2026-11-23",
      w: 1280, h: 800,
      file: "commit-marker"
    },
    {
      id: "album-desktop",
      title: "相册页 · 桌面端",
      desc: "就是你现在看的这一页——瀑布流、分类筛选、悬停浮层，灯箱支持 ← → 翻页。（1280×820）",
      tag: "应用",
      date: "2026-11-23",
      w: 1280, h: 820,
      file: "album-desktop"
    },
    {
      id: "album-mobile",
      title: "相册页 · 移动端",
      desc: "单列瀑布流，灯箱翻页按钮改为左右悬浮，390px 视口下无横向溢出。（390×844）",
      tag: "应用",
      date: "2026-11-23",
      w: 390, h: 844,
      file: "album-mobile"
    }
  ];

  var grid = document.getElementById("grid");
  var filtersEl = document.getElementById("filters");
  var searchEl = document.getElementById("search");
  var emptyEl = document.getElementById("empty");
  var statsEl = document.getElementById("stats");

  var state = { tag: "全部", q: "", list: [] };

  function tags() {
    var seen = {};
    PHOTOS.forEach(function (p) { seen[p.tag] = (seen[p.tag] || 0) + 1; });
    return Object.keys(seen);
  }

  function renderFilters() {
    var all = PHOTOS.length;
    var names = ["全部"].concat(tags());
    filtersEl.innerHTML = "";
    names.forEach(function (name) {
      var n = name === "全部" ? all : PHOTOS.filter(function (p) { return p.tag === name; }).length;
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.tag === name));
      b.innerHTML = name + '<span class="n">' + n + "</span>";
      b.addEventListener("click", function () {
        state.tag = name;
        renderFilters();
        render();
      });
      filtersEl.appendChild(b);
    });
  }

  function renderStats() {
    var updated = PHOTOS.map(function (p) { return p.date; }).sort().pop();
    statsEl.innerHTML =
      stat(PHOTOS.length, "张照片") +
      stat(tags().length, "个分类") +
      stat(updated, "最近更新");
  }

  function stat(v, label) {
    return '<div class="stat"><b>' + v + "</b><span>" + label + "</span></div>";
  }

  function matches(p) {
    if (state.tag !== "全部" && p.tag !== state.tag) return false;
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    return (p.title + " " + p.desc + " " + p.tag).toLowerCase().indexOf(q) > -1;
  }

  function render() {
    state.list = PHOTOS.filter(matches);
    grid.innerHTML = "";
    state.list.forEach(function (p, i) {
      var btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      btn.setAttribute("aria-label", "查看 " + p.title);
      btn.dataset.idx = String(i);
      btn.innerHTML =
        '<span class="tag">' + p.tag + "</span>" +
        '<img src="./photos/thumb/' + p.file + '.jpg" alt="' + esc(p.title) + '" ' +
        'width="' + p.w + '" height="' + p.h + '" loading="lazy" decoding="async" />' +
        '<span class="overlay"><h3>' + esc(p.title) + "</h3><p>" + esc(p.desc) + "</p></span>";
      btn.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(btn);
    });
    emptyEl.hidden = state.list.length > 0;
    reveal();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var io = null;
  function reveal() {
    var cards = grid.querySelectorAll(".card:not(.in)");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(cards, function (c) { c.classList.add("in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "80px 0px" });
    }
    Array.prototype.forEach.call(cards, function (c, i) {
      c.style.transitionDelay = Math.min(i * 40, 240) + "ms";
      io.observe(c);
    });
  }

  /* ---------- lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbTitle = document.getElementById("lbTitle");
  var lbDesc = document.getElementById("lbDesc");
  var lbCounter = document.getElementById("lbCounter");
  var lbDownload = document.getElementById("lbDownload");
  var cur = 0;

  function openLightbox(idx) {
    cur = idx;
    paint();
    lb.hidden = false;
    void lb.offsetWidth;            /* 强制重排，确保 opacity 过渡能触发 */
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("lbClose").focus();
  }

  function paint() {
    var p = state.list[cur];
    if (!p) return;
    lbImg.src = "./photos/full/" + p.file + ".jpg";
    lbImg.alt = p.title;
    lbTitle.textContent = p.title;
    lbDesc.textContent = p.desc;
    lbCounter.textContent = (cur + 1) + " / " + state.list.length;
    lbDownload.href = "./photos/full/" + p.file + ".jpg";
    lbDownload.setAttribute("download", p.file + ".jpg");
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

  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", function () { step(-1); });
  document.getElementById("lbNext").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.classList.contains("lb-stage")) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  searchEl.addEventListener("input", function () {
    state.q = searchEl.value.trim();
    render();
  });

  renderFilters();
  renderStats();
  render();
})();
