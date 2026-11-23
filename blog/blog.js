/* 博客前端逻辑：主题、导航、首页/列表/详情/相册渲染 */
(function () {
  "use strict";

  var D = window.BLOG;
  var page = document.body.dataset.page;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /* ---------------- 主题 ---------------- */
  var THEME_KEY = "lsx-blog-theme";
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    var btn = $("#themeBtn");
    if (btn) btn.setAttribute("aria-label", t === "dark" ? "切换到浅色" : "切换到深色");
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved === "dark" ? "dark" : "light");
  })();

  function bindChrome() {
    var tb = $("#themeBtn");
    if (tb) tb.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });

    var mb = $("#menuBtn"), nav = $("#nav");
    if (mb && nav) mb.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      mb.setAttribute("aria-expanded", String(open));
    });

    var top = $("#toTop");
    if (top) {
      window.addEventListener("scroll", function () {
        top.classList.toggle("show", window.scrollY > 500);
      }, { passive: true });
      top.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var recent = D.posts.slice(0, 4);
    var row = $("#homePosts");
    if (row) {
      row.innerHTML = recent.map(postRow).join("");
    }

    var strip = $("#homeStrip");
    if (strip) {
      strip.innerHTML = D.photos.slice(0, 3).map(function (p) {
        return '<a class="strip-card" href="gallery.html">' +
          '<img src="' + p.src + '" alt="' + esc(p.title) + '" loading="lazy" />' +
          '<span class="cap"><b>' + esc(p.title) + '</b><span>' + esc(p.place) + '</span></span>' +
          "</a>";
      }).join("");
    }

    var tl = $("#homeTimeline");
    if (tl) {
      tl.innerHTML = D.timeline.map(function (t) {
        return '<div class="tl-item">' +
          '<div class="tl-year">' + esc(t.year) + "年<span>" + esc(t.note) + "</span></div>" +
          '<div class="tl-body"><h3>' + esc(t.title) + "</h3><p>" + esc(t.desc) + "</p>" +
          '<span class="tl-link">读这段故事</span></div></div>';
      }).join("");
    }

    var rd = $("#homeReading");
    if (rd) {
      rd.innerHTML = D.reading.map(function (r, i) {
        return '<a class="read-card" href="posts.html">' +
          '<div class="idx">0' + (i + 1) + "</div>" +
          "<h3>" + esc(r.title) + "</h3><p>" + esc(r.desc) + "</p></a>";
      }).join("");
    }
  }

  function postRow(p, i) {
    return '<a class="post-row" href="post.html?id=' + encodeURIComponent(p.id) + '">' +
      '<div class="post-date">' + esc(p.date) + "</div>" +
      "<div>" +
      '<div class="post-meta"><span>' + esc(p.category) + '</span><span class="dot">·</span>' +
      "<span>约 " + p.minutes + " 分钟</span></div>" +
      '<h3 class="post-title">' + esc(p.title) + "</h3>" +
      '<p class="post-excerpt">' + esc(p.excerpt) + "</p>" +
      '<div class="post-tags">' + p.tags.map(function (t) { return "<span>#" + esc(t) + "</span>"; }).join("") + "</div>" +
      "</div>" +
      '<div class="post-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M9 7h8v8"/></svg></div>' +
      "</a>";
  }

  /* ---------------- 文章列表 ---------------- */
  function renderPosts() {
    var state = { cat: "全部", q: "" };
    var params = new URLSearchParams(location.search);
    if (params.get("cat")) state.cat = params.get("cat");
    if (params.get("q")) state.q = params.get("q");

    var tabsEl = $("#catTabs");
    var listEl = $("#postList");
    var countEl = $("#countNote");
    var searchEl = $("#search");
    if (searchEl) searchEl.value = state.q;

    function counts() {
      var m = {};
      D.posts.forEach(function (p) { m[p.category] = (m[p.category] || 0) + 1; });
      return m;
    }

    function renderTabs() {
      var m = counts();
      var names = ["全部"].concat(D.categories);
      tabsEl.innerHTML = names.map(function (n) {
        var c = n === "全部" ? D.posts.length : (m[n] || 0);
        return '<button class="cat-tab" type="button" data-cat="' + esc(n) + '" aria-pressed="' +
          (state.cat === n) + '">' + esc(n) + '<span class="n">' + c + "</span></button>";
      }).join("");
      $$(".cat-tab", tabsEl).forEach(function (b) {
        b.addEventListener("click", function () {
          state.cat = b.dataset.cat;
          sync();
          renderTabs();
          renderList();
        });
      });
    }

    function filtered() {
      var q = state.q.trim().toLowerCase();
      return D.posts.filter(function (p) {
        if (state.cat !== "全部" && p.category !== state.cat) return false;
        if (!q) return true;
        return (p.title + " " + p.excerpt + " " + p.tags.join(" ") + " " + p.category).toLowerCase().indexOf(q) > -1;
      });
    }

    function renderList() {
      var items = filtered();
      listEl.innerHTML = items.map(postRow).join("");
      countEl.textContent = items.length + " 篇文章";
      $("#emptyState").hidden = items.length > 0;
    }

    function sync() {
      var u = new URL(location.href);
      if (state.cat === "全部") u.searchParams.delete("cat"); else u.searchParams.set("cat", state.cat);
      if (state.q) u.searchParams.set("q", state.q); else u.searchParams.delete("q");
      history.replaceState(null, "", u);
    }

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        state.q = searchEl.value;
        sync();
        renderList();
      });
    }

    renderTabs();
    renderList();
  }

  /* ---------------- 文章详情 ---------------- */
  function renderPost() {
    var id = new URLSearchParams(location.search).get("id");
    var p = D.posts.filter(function (x) { return x.id === id; })[0] || D.posts[0];
    document.title = p.title + " | " + D.site.name;

    $("#aCat").textContent = p.category;
    $("#aDate").textContent = p.date;
    $("#aMin").textContent = "约 " + p.minutes + " 分钟";
    $("#aTitle").textContent = p.title;
    $("#aLead").textContent = p.lead;

    var body = p.body.map(function (b) {
      if (b.t === "h2") return "<h2>" + inline(b.v) + "</h2>";
      if (b.t === "h3") return "<h3>" + inline(b.v) + "</h3>";
      if (b.t === "quote") return "<blockquote>" + inline(b.v) + "</blockquote>";
      if (b.t === "code") return "<pre><code>" + esc(b.v) + "</code></pre>";
      return "<p>" + inline(b.v) + "</p>";
    }).join("");
    $("#aBody").innerHTML = body;

    var i = D.posts.indexOf(p);
    var prev = D.posts[i - 1], next = D.posts[i + 1];
    $("#aPrev").innerHTML = prev ? '← <a href="post.html?id=' + prev.id + '">' + esc(prev.title) + "</a>" : "← 已经是第一篇";
    $("#aNext").innerHTML = next ? '<a href="post.html?id=' + next.id + '">' + esc(next.title) + "</a> →" : "已经是最新一篇 →";

    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var w = max > 0 ? (h.scrollTop / max) * 100 : 0;
      $("#progress").style.width = w + "%";
    }, { passive: true });
  }

  /* ---------------- 相册 ---------------- */
  function renderGallery() {
    var state = { cat: "全部" };
    var tabsEl = $("#gTabs");
    var gridEl = $("#gGrid");
    var ORDER = ["在路上", "人物", "合影", "回忆"];
    var present = Array.from(new Set(D.photos.map(function (p) { return p.cat; })));
    var cats = ["全部"]
      .concat(ORDER.filter(function (c) { return present.indexOf(c) > -1; }))
      .concat(present.filter(function (c) { return ORDER.indexOf(c) === -1; }));

    function renderTabs() {
      tabsEl.innerHTML = cats.map(function (c) {
        var n = c === "全部" ? D.photos.length : D.photos.filter(function (p) { return p.cat === c; }).length;
        return '<button class="cat-tab" type="button" data-cat="' + esc(c) + '" aria-pressed="' +
          (state.cat === c) + '">' + esc(c) + '<span class="n">' + n + "</span></button>";
      }).join("");
      $$(".cat-tab", tabsEl).forEach(function (b) {
        b.addEventListener("click", function () {
          state.cat = b.dataset.cat;
          renderTabs();
          renderGrid();
        });
      });
    }

    var current = [];

    function renderGrid() {
      current = D.photos.filter(function (p) { return state.cat === "全部" || p.cat === state.cat; });
      gridEl.innerHTML = current.map(function (p, i) {
        return '<button class="g-card" type="button" data-i="' + i + '">' +
          '<img src="' + p.src + '" alt="' + esc(p.title) + '" loading="lazy" />' +
          '<span class="g-meta"><span>' + esc(p.title) + '</span><span>' + esc(p.date) + "</span></span>" +
          "</button>";
      }).join("");
      $$(".g-card", gridEl).forEach(function (b) {
        b.addEventListener("click", function () { openLb(Number(b.dataset.i)); });
      });
      var note = $("#gCount");
      if (note) note.textContent = current.length + " 张照片";
    }

    var lb = $("#lightbox"), idx = 0;
    function paint() {
      var p = current[idx];
      $("#lbImg").src = p.src;
      $("#lbImg").alt = p.title;
      $("#lbCap").textContent = p.title + " · " + p.place + " · " + p.date;
    }
    function openLb(i) {
      idx = i;
      paint();
      lb.hidden = false;
      void lb.offsetWidth;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      $("#lbClose").focus();
    }
    function closeLb() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { lb.hidden = true; }, 180);
    }
    function step(d) {
      idx = (idx + d + current.length) % current.length;
      paint();
    }

    $("#lbClose").addEventListener("click", closeLb);
    $("#lbPrev").addEventListener("click", function () { step(-1); });
    $("#lbNext").addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    renderTabs();
    renderGrid();
  }

  /* ---------------- 启动 ---------------- */
  bindChrome();
  if (page === "home") renderHome();
  if (page === "posts") renderPosts();
  if (page === "post") renderPost();
  if (page === "gallery") renderGallery();
})();
