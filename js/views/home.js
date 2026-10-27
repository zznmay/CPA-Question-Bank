/* CPA 统一题库 · 首页 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  function globalOverview() {
    const out = {
      total: 0,
      answered: 0,
      graded: 0,
      correct: 0,
      wrong: 0,
      weak: 0,
      placeholder: 0,
      user: 0,
      chapters: 0,
      tests: 0,
      pct: 0,
      rate: null,
    };
    CPA.subjects.forEach(function (subject) {
      const p = CPA.computeProgress(subject);
      out.total += subject.stats.total;
      out.answered += p.answered;
      out.graded += p.graded;
      out.correct += p.correct;
      out.wrong += p.wrong;
      out.weak += p.weak;
      out.placeholder += subject.stats.placeholder;
      out.user += subject.stats.user;
      out.chapters += subject.stats.chapters;
      out.tests += CPA.store
        .getTests(subject.id)
        .filter(function (t) {
          return t && t.status === "done";
        }).length;
    });
    out.pct = out.total ? Math.round((out.answered / out.total) * 100) : 0;
    out.rate = out.graded ? Math.round((out.correct / out.graded) * 100) : null;
    return out;
  }

  function subjectCard(subject) {
    const p = CPA.computeProgress(subject);
    const stats = subject.stats;
    const statusTag =
      stats.placeholder === 0
        ? '<span class="tag tag-ok">正式题库</span>'
        : stats.real === 0
          ? '<span class="tag tag-warn">框架占位</span>'
          : '<span class="tag tag-warn">含占位题</span>';
    const rate = p.rate === null ? "—" : p.rate + "%";
    return (
      '<a class="subject-card" href="' +
      CPA.router.subjectPath(subject.id, "practice") +
      '" style="--accent:' +
      U.esc(subject.accent) +
      '">' +
      '  <div class="subject-card-head">' +
      '    <span class="subject-char subject-char-lg" aria-hidden="true">' +
      U.esc(subject.icon) +
      "</span>" +
      "    <div>" +
      '      <h3>' +
      U.esc(subject.name) +
      "</h3>" +
      '      <p>' +
      U.esc(subject.tagline) +
      "</p>" +
      "    </div>" +
      "  </div>" +
      '  <div class="subject-card-tags">' +
      statusTag +
      '    <span class="tag tag-plain">' +
      stats.chapters +
      " 章</span>" +
      '    <span class="tag tag-plain">' +
      stats.total +
      " 题</span>" +
      (stats.user ? '    <span class="tag tag-user">自建 ' + stats.user + "</span>" : "") +
      "  </div>" +
      '  <div class="subject-card-progress">' +
      '    <div class="progress-label"><span>本科进度</span><b>' +
      p.pct +
      "%</b></div>" +
      '    <div class="progress"><span style="width:' +
      p.pct +
      '%"></span></div>' +
      "  </div>" +
      '  <div class="subject-card-foot">' +
      "    <span>已答 <b>" +
      p.answered +
      "</b> / " +
      stats.total +
      "</span>" +
      "    <span>正确率 <b>" +
      rate +
      "</b></span>" +
      '    <span class="card-go">进入 <i>→</i></span>' +
      "  </div>" +
      "</a>"
    );
  }

  function noticeCard() {
    const econ = CPA.getSubject("econ-law") || CPA.subjects[0];
    return (
      '<section class="framework-panel" id="framework">' +
      '  <div class="framework-lead">' +
      '    <span class="eyebrow">FRAMEWORK V0.1</span>' +
      "    <h2>先搭骨架，再填内容</h2>" +
      "    <p>本版本完成六科统一框架：科目注册、章/知识点分类、题目录入、练习与测试均已打通。当前题目为清晰标注的占位内容，后续可逐步替换为正式题库。</p>" +
      '    <div class="framework-actions">' +
      '      <a class="btn btn-primary" href="' +
      CPA.router.subjectPath(econ.id, "entry") +
      '">打开录入界面</a>' +
      '      <a class="btn btn-ghost" href="' +
      CPA.router.subjectPath(econ.id, "test") +
      '">体验模拟测试</a>' +
      "    </div>" +
      "  </div>" +
      '  <div class="framework-steps">' +
      '    <div class="framework-step"><span class="step-num">01</span><div><b>科目可扩展</b><p>新增科目只需添加一个数据文件并在 manifest 注册，无需改动练习与测试逻辑。</p></div></div>' +
      '    <div class="framework-step"><span class="step-num">02</span><div><b>题目可分批录入</b><p>支持表单逐题录入、JSON 批量导入，也可直接把题库写入科目数据文件。</p></div></div>' +
      '    <div class="framework-step"><span class="step-num">03</span><div><b>进度自动归集</b><p>六科分别记录答题、错题、薄弱标记与测试成绩，可在数据管理中整体备份迁移。</p></div></div>' +
      "  </div>" +
      "</section>"
    );
  }

  function mount(root) {
    const overview = globalOverview();
    const activeId = CPA.store.getState().activeSubjectId;
    const storedActive = activeId ? CPA.getSubject(activeId) : null;
    const active = storedActive || CPA.subjects[0];
    const firstName = active ? active.name : "任意科目";
    const continueLabel = storedActive ? "继续学习" : "开始学习";
    const doneTests = overview.tests;
    const rateText = overview.rate === null ? "—" : overview.rate + "%";
    const placeholderText =
      overview.placeholder > 0
        ? "当前含 " + overview.placeholder + " 道框架占位题，用于演示完整流程"
        : "正式题库已就绪";

    root.innerHTML =
      '<div class="home-page">' +
      '  <div class="container">' +
      '    <section class="home-hero">' +
      '      <div class="hero-copy">' +
      '        <div class="hero-eyebrow">CERTIFIED PUBLIC ACCOUNTANT · 专业阶段</div>' +
      "        <h1>六科一体，<br><em>逐章攻克</em></h1>" +
      "        <p>注册会计师专业阶段统一题库。按科目、章节与知识点组织练习，支持随机抽题、错题本、限时模拟与主观题自评。</p>" +
      '        <div class="hero-actions">' +
      '          <a class="btn btn-light btn-lg" href="' +
      (active ? CPA.router.subjectPath(active.id, "practice") : "#subjects") +
      '">' +
      continueLabel +
      " · " +
      U.esc(firstName) +
      "</a>" +
      '          <button class="btn btn-ghost-light btn-lg" type="button" data-scroll="#subjects">浏览六科</button>' +
      "        </div>" +
      '        <div class="hero-metrics">' +
      '          <div><b>' +
      CPA.subjects.length +
      "</b><span>科目</span></div>" +
      '          <div><b>' +
      overview.total +
      "</b><span>题目</span></div>" +
      '          <div><b>' +
      overview.answered +
      "</b><span>已答</span></div>" +
      '          <div><b>' +
      rateText +
      "</b><span>正确率</span></div>" +
      "        </div>" +
      "      </div>" +
      '      <aside class="hero-panel">' +
      '        <div class="hero-panel-top"><span class="status-dot"></span>学习概览</div>' +
      '        <div class="hero-ring" style="--pct:' +
      overview.pct +
      '">' +
      '          <div class="hero-ring-inner"><b>' +
      overview.pct +
      "%</b><span>总进度</span></div>" +
      "        </div>" +
      '        <div class="hero-panel-grid">' +
      '          <div><b>' +
      overview.chapters +
      "</b><span>章节</span></div>" +
      '          <div><b>' +
      doneTests +
      "</b><span>测试次数</span></div>" +
      '          <div><b>' +
      overview.weak +
      "</b><span>薄弱题</span></div>" +
      '          <div><b>' +
      overview.user +
      "</b><span>自建题</span></div>" +
      "        </div>" +
      '        <p class="hero-panel-note">' +
      U.esc(placeholderText) +
      "</p>" +
      "      </aside>" +
      "    </section>" +
      '    <section class="home-section" id="subjects">' +
      '      <div class="section-head">' +
      "        <div><span class=\"eyebrow\">SUBJECTS</span><h2>六个科目，一个入口</h2></div>" +
      '        <p>每科独立维护章节、题库、测试蓝图与学习进度；新增科目不改动核心代码。</p>' +
      "      </div>" +
      '      <div class="subject-grid">' +
      CPA.subjects.map(subjectCard).join("") +
      "      </div>" +
      "    </section>" +
      noticeCard() +
      "  </div>" +
      "</div>";

    root.querySelectorAll("[data-scroll]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const target = document.querySelector(btn.getAttribute("data-scroll"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    return null;
  }

  CPA.views = CPA.views || {};
  CPA.views.home = { mount: mount };
})();
