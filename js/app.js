/* CPA 统一题库 · 应用外壳与路由调度 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  let currentController = null;
  let currentRoute = null;
  let modalEl = null;
  let modalFileInput = null;

  function loadSubjectFiles(files, done) {
    const errors = [];
    let index = 0;
    function next() {
      if (index >= files.length) return done(errors);
      const src = files[index++];
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = next;
      script.onerror = function () {
        errors.push(src);
        console.error("[CPA] 科目数据加载失败：", src);
        next();
      };
      document.body.appendChild(script);
    }
    next();
  }

  function boot() {
    if (!Array.isArray(window.CPA_SUBJECT_FILES) || !window.CPA_SUBJECT_FILES.length) {
      showBootError("未找到科目清单 data/manifest.js");
      return;
    }
    loadSubjectFiles(window.CPA_SUBJECT_FILES, function (errors) {
      if (!CPA.subjects.length) {
        showBootError("科目数据加载失败，请确认 data/subjects/ 下的文件存在。");
        return;
      }
      CPA.rebuildAll();
      CPA.booted = true;
      mountShell();
      CPA.router.onChange(renderRoute);
      if (!location.hash) CPA.router.replace("/");
      renderRoute();
      if (errors.length) {
        U.toast("有 " + errors.length + " 个科目数据文件加载失败，详见控制台。", "error", 4000);
      }
    });
  }

  function showBootError(message) {
    const boot = document.getElementById("bootScreen");
    if (!boot) return;
    boot.innerHTML =
      '<div class="boot-mark">!</div>' +
      '<div class="boot-title">加载失败</div>' +
      '<p class="boot-hint">' +
      U.esc(message) +
      "</p>";
  }

  function mountShell() {
    const app = document.getElementById("app");
    app.innerHTML =
      '<div class="app-frame">' +
      '  <header class="app-header">' +
      '    <div class="app-header-inner">' +
      '      <a class="brand" href="#/" aria-label="返回首页">' +
      '        <span class="brand-mark">CPA</span>' +
      '        <span class="brand-copy"><b>统一题库</b><small>专业阶段 · 六科</small></span>' +
      "      </a>" +
      '      <div class="header-mid" id="headerMid"></div>' +
      '      <div class="header-actions">' +
      '        <span class="local-dot" title="进度保存在本机浏览器"><i></i>本机数据</span>' +
      '        <button class="btn btn-ghost btn-sm" id="dataBtn" type="button">数据管理</button>' +
      "      </div>" +
      "    </div>" +
      "  </header>" +
      '  <div id="subjectBar" class="subject-bar hidden"></div>' +
      '  <main id="view" class="view-root" tabindex="-1"></main>' +
      '  <footer class="app-footer">' +
      '    <div class="app-footer-inner">' +
      "      <span>CPA 统一题库框架 · 专业阶段</span>" +
      "      <span>当前题目为占位内容，可通过「录入题目」或科目数据文件补充</span>" +
      "      <span>学习数据仅保存在本机浏览器</span>" +
      "    </div>" +
      "  </footer>" +
      "</div>";

    document.getElementById("dataBtn").addEventListener("click", openDataModal);
  }

  function viewLabel(view) {
    return { practice: "练习", test: "测试", entry: "录入题目", home: "六科总览" }[view] || "";
  }

  function renderHeader(route, subject) {
    const mid = document.getElementById("headerMid");
    if (!mid) return;
    if (!subject) {
      mid.innerHTML = '<span class="header-crumb"><span class="muted">六科总览</span></span>';
      return;
    }
    mid.innerHTML =
      '<nav class="header-crumb" aria-label="面包屑">' +
      '<a href="#/">题库</a><span class="sep">/</span>' +
      '<a href="' +
      CPA.router.subjectPath(subject.id, "practice") +
      '">' +
      U.esc(subject.name) +
      "</a><span class=\"sep\">/</span>" +
      "<b>" +
      U.esc(viewLabel(route.view)) +
      "</b></nav>";
  }

  function subjectBarHTML(subject, route) {
    const progress = CPA.computeProgress(subject);
    const stats = subject.stats;
    const tabs = [
      { key: "practice", label: "练习", href: CPA.router.subjectPath(subject.id, "practice") },
      { key: "test", label: "测试", href: CPA.router.subjectPath(subject.id, "test") },
      { key: "entry", label: "录入题目", href: CPA.router.subjectPath(subject.id, "entry") },
    ];
    const tabsHTML = tabs
      .map(function (tab) {
        const active = route.view === tab.key;
        return (
          '<a class="subject-tab' +
          (active ? " active" : "") +
          '" href="' +
          tab.href +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          tab.label +
          "</a>"
        );
      })
      .join("");

    const options = CPA.subjects
      .map(function (s) {
        return (
          '<option value="' +
          U.esc(s.id) +
          '"' +
          (s.id === subject.id ? " selected" : "") +
          ">" +
          U.esc(s.name) +
          "</option>"
        );
      })
      .join("");

    const rate = progress.rate === null ? "—" : progress.rate + "%";
    return (
      '<div class="subject-bar-inner">' +
      '  <div class="subject-identity">' +
      '    <span class="subject-char" aria-hidden="true">' +
      U.esc(subject.icon) +
      "</span>" +
      '    <div class="subject-identity-copy">' +
      '      <div class="subject-name">' +
      U.esc(subject.name) +
      '<span class="stage-pill">' +
      U.esc(subject.stage) +
      "</span>" +
      (stats.placeholder
        ? '<span class="tag tag-warn" title="当前科目含框架占位题">含占位题</span>'
        : "") +
      "      </div>" +
      '      <div class="subject-tagline">' +
      U.esc(subject.tagline) +
      "</div>" +
      "    </div>" +
      "  </div>" +
      '  <nav class="subject-tabs" aria-label="科目功能">' +
      tabsHTML +
      "  </nav>" +
      '  <div class="subject-bar-side">' +
      '    <label class="subject-switch"><span>切换科目</span>' +
      '<select id="subjectSwitch" aria-label="切换科目">' +
      options +
      "</select></label>" +
      '    <div class="subject-mini-stats">' +
      "      <span><b>" +
      progress.answered +
      "</b>/" +
      stats.total +
      " 已答</span>" +
      "      <span>正确率 <b>" +
      rate +
      "</b></span>" +
      "    </div>" +
      "  </div>" +
      "</div>"
    );
  }

  function renderSubjectBar(route, subject) {
    const bar = document.getElementById("subjectBar");
    if (!bar) return;
    if (!subject) {
      bar.classList.add("hidden");
      bar.innerHTML = "";
      return;
    }
    bar.classList.remove("hidden");
    bar.innerHTML = subjectBarHTML(subject, route);
    const select = document.getElementById("subjectSwitch");
    if (select) {
      select.addEventListener("change", function () {
        const nextId = select.value;
        const nextView = route.view === "test" && route.testId ? "test" : route.view;
        CPA.router.go(CPA.router.subjectPath(nextId, nextView));
      });
    }
  }

  function errorView(message) {
    return (
      '<div class="container view-pad">' +
      '<div class="empty-state card">' +
      '<div class="empty-icon">!</div>' +
      "<h2>页面加载失败</h2>" +
      "<p>" +
      U.esc(message) +
      "</p>" +
      '<a class="btn btn-primary" href="#/">返回首页</a>' +
      "</div></div>"
    );
  }

  function renderRoute() {
    const route = CPA.router.parse();
    currentRoute = route;
    if (modalEl) closeModal();

    if (currentController && typeof currentController.destroy === "function") {
      try {
        currentController.destroy();
      } catch (e) {
        console.warn("[CPA] 视图清理失败：", e);
      }
    }
    currentController = null;
    document.body.classList.remove("exam-mode");

    const subject = route.subjectId ? CPA.getSubject(route.subjectId) : null;
    const view = document.getElementById("view");
    if (!view) return;

    if (route.subjectId && !subject) {
      renderHeader(route, null);
      renderSubjectBar(route, null);
      view.innerHTML = errorView("未找到科目「" + route.subjectId + "」");
      return;
    }

    if (subject) {
      document.documentElement.style.setProperty("--accent", subject.accent);
      CPA.store.setActiveSubject(subject.id);
    } else {
      document.documentElement.style.removeProperty("--accent");
    }

    renderHeader(route, subject);
    renderSubjectBar(route, subject);
    view.innerHTML = "";

    const ctx = { route: route, subject: subject };
    let controller = null;
    try {
      if (!subject) {
        controller = CPA.views.home.mount(view, ctx);
      } else if (route.view === "practice") {
        controller = CPA.views.practice.mount(view, ctx);
      } else if (route.view === "test") {
        controller = CPA.views.test.mount(view, ctx);
      } else if (route.view === "entry") {
        controller = CPA.views.entry.mount(view, ctx);
      } else {
        view.innerHTML = errorView("未知页面");
      }
    } catch (e) {
      console.error("[CPA] 视图渲染失败：", e);
      view.innerHTML = errorView(e.message || "未知错误");
    }
    currentController = controller || null;

    document.title = subject
      ? subject.fullName + " · " + viewLabel(route.view) + " · CPA 统一题库"
      : "CPA 统一题库 · 专业阶段六科";
    window.scrollTo(0, 0);
  }

  function refreshChrome() {
    if (!currentRoute) return;
    const subject = currentRoute.subjectId ? CPA.getSubject(currentRoute.subjectId) : null;
    renderSubjectBar(currentRoute, subject);
    renderHeader(currentRoute, subject);
  }

  function closeModal() {
    if (!modalEl) return;
    document.removeEventListener("keydown", escClose);
    if (modalFileInput) {
      modalFileInput.remove();
      modalFileInput = null;
    }
    modalEl.remove();
    modalEl = null;
    document.body.classList.remove("modal-open");
  }

  function openDataModal() {
    if (modalEl) return;
    const bytes = CPA.store.storageBytes();
    const sizeText = bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB";
    const subject = currentRoute && currentRoute.subjectId ? CPA.getSubject(currentRoute.subjectId) : null;

    modalEl = document.createElement("div");
    modalEl.className = "modal-backdrop";
    modalEl.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="dataModalTitle">' +
      '  <div class="modal-head">' +
      '    <div><h2 id="dataModalTitle">数据管理</h2><p>进度、测试记录与自建题目均保存在本机浏览器。</p></div>' +
      '    <button class="icon-btn" type="button" data-close aria-label="关闭">×</button>' +
      "  </div>" +
      '  <div class="modal-body">' +
      '    <div class="data-note">' +
      "      <strong>建议定期备份。</strong> 清除浏览器缓存、切换浏览器或使用隐私模式会导致进度丢失。" +
      "      当前占用 <b>" +
      sizeText +
      "</b>。" +
      "    </div>" +
      '    <div class="data-actions">' +
      '      <div class="data-action-row">' +
      "        <div><b>导出全部数据</b><span>包含六科进度、测试记录和自建题目</span></div>" +
      '        <button class="btn btn-primary btn-sm" type="button" id="exportAllBtn">导出 JSON</button>' +
      "      </div>" +
      '      <div class="data-action-row">' +
      "        <div><b>导入数据</b><span>与本机数据合并，较新的记录优先</span></div>" +
      '        <button class="btn btn-ghost btn-sm" type="button" id="importAllBtn">选择文件</button>' +
      "      </div>" +
      (subject
        ? '      <div class="data-action-row">' +
          "        <div><b>清空《" +
          U.esc(subject.name) +
          "》答题记录</b><span>保留测试记录与自建题目</span></div>" +
          '        <button class="btn btn-danger btn-sm" type="button" id="resetSubjectBtn">清空</button>' +
          "      </div>"
        : "") +
      '      <div class="data-action-row danger-row">' +
      "        <div><b>重置全部学习进度</b><span>清空所有答题记录与测试记录，自建题目保留</span></div>" +
      '        <button class="btn btn-danger btn-sm" type="button" id="resetAllBtn">重置</button>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <div class="modal-foot"><span class="muted small">导出文件可在其他设备导入，实现跨浏览器迁移。</span>' +
      '  <button class="btn btn-ghost btn-sm" type="button" data-close>关闭</button></div>' +
      "</div>";
    document.body.appendChild(modalEl);
    document.body.classList.add("modal-open");

    modalEl.addEventListener("click", function (e) {
      if (e.target === modalEl) closeModal();
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", escClose);

    document.getElementById("exportAllBtn").addEventListener("click", function () {
      U.downloadJson(
        "CPA统一题库-数据备份-" + U.formatDate(Date.now(), false) + ".json",
        CPA.store.exportAll()
      );
      U.toast("已导出数据备份");
    });

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    modalFileInput = fileInput;
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      U.readTextFile(
        file,
        function (text) {
          try {
            const payload = JSON.parse(text);
            const counts = CPA.store.importAll(payload);
            CPA.rebuildAll();
            closeModal();
            if (CPA.app && CPA.app.rerender) CPA.app.rerender();
            U.toast(
              "导入完成：新增 " +
                counts.answers.added +
                " 条答题、更新 " +
                counts.answers.updated +
                " 条；测试 " +
                counts.tests +
                " 条；题目 " +
                counts.questions +
                " 道",
              "success",
              3600
            );
          } catch (err) {
            U.toast("导入失败：" + err.message, "error", 3600);
          }
        },
        function (err) {
          U.toast("文件读取失败：" + err.message, "error");
        }
      );
    });
    document.getElementById("importAllBtn").addEventListener("click", function () {
      fileInput.click();
    });

    if (subject) {
      document.getElementById("resetSubjectBtn").addEventListener("click", function () {
        if (!confirm("确定清空《" + subject.name + "》的全部答题记录吗？此操作不可撤销。")) return;
        CPA.store.resetSubjectProgress(subject.id);
        closeModal();
        if (CPA.app && CPA.app.rerender) CPA.app.rerender();
        U.toast("已清空《" + subject.name + "》答题记录");
      });
    }

    document.getElementById("resetAllBtn").addEventListener("click", function () {
      if (!confirm("确定重置全部学习进度吗？答题记录与测试记录将全部清空，自建题目保留。")) return;
      if (!confirm("再次确认：该操作不可撤销。")) return;
      CPA.store.resetAllProgress();
      closeModal();
      if (CPA.app && CPA.app.rerender) CPA.app.rerender();
      U.toast("已重置全部学习进度");
    });
  }

  function escClose(e) {
    if (e.key === "Escape") closeModal();
  }

  CPA.app = {
    renderRoute: renderRoute,
    rerender: renderRoute,
    refreshChrome: refreshChrome,
    openDataModal: openDataModal,
    setExamMode: function (on) {
      document.body.classList.toggle("exam-mode", !!on);
    },
    getRoute: function () {
      return currentRoute;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
