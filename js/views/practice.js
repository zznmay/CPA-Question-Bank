/* CPA 统一题库 · 练习模块 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  function mount(root, ctx) {
    const subject = ctx.subject;
    const state = {
      mode: "all",
      chId: null,
      kpId: null,
      order: "seq",
      list: [],
      index: 0,
      draft: {},
      randomOpen: false,
      randomDrawn: false,
      randomChapters: [],
      randomCounts: { single: 0, multiple: 0, subjective: 0 },
    };

    const initialAvail = CPA.exam.availability(subject);
    state.randomCounts = {
      single: Math.min(10, initialAvail.single),
      multiple: Math.min(5, initialAvail.multiple),
      subjective: Math.min(1, initialAvail.subjective),
    };

    root.innerHTML =
      '<div class="practice-page">' +
      '<button class="mobile-side-toggle" id="mobileSideToggle" type="button">☰ 章节与练习模式<span>打开导航</span></button>' +
      '<div class="practice-layout">' +
      '  <aside class="side-panel" id="sidePanel" aria-label="练习导航"></aside>' +
      '  <div class="side-backdrop" id="sideBackdrop"></div>' +
      '  <section class="work-panel" id="workPanel"></section>' +
      "</div>" +
      "</div>";

    const sidePanel = root.querySelector("#sidePanel");
    const workPanel = root.querySelector("#workPanel");
    const backdrop = root.querySelector("#sideBackdrop");
    const sideToggle = root.querySelector("#mobileSideToggle");

    function getAnswer(qid) {
      return CPA.store.getAnswer(subject.id, qid);
    }

    function buildChapterAgg() {
      const prog = CPA.store.getProgress(subject.id);
      const chapters = {};
      const kps = {};
      subject.index.forEach(function (item) {
        if (!chapters[item.chapterId]) chapters[item.chapterId] = { total: 0, answered: 0, wrong: 0 };
        if (!kps[item.kpId]) kps[item.kpId] = { total: 0, answered: 0, wrong: 0 };
        const ch = chapters[item.chapterId];
        const kp = kps[item.kpId];
        ch.total++;
        kp.total++;
        const a = prog[item.q.id];
        if (a && a.submitted) {
          ch.answered++;
          kp.answered++;
        }
        if (a && a.submitted && a.correct === false) {
          ch.wrong++;
          kp.wrong++;
        }
      });
      return { chapters: chapters, kps: kps };
    }

    function modeTitle() {
      if (state.mode === "all") return "全部题目";
      if (state.mode === "wrong") return "错题本";
      if (state.mode === "weak") return "薄弱题";
      if (state.mode === "random") return "随机练习";
      if (state.mode === "kp") {
        const ch = subject.chapters.find(function (c) {
          return c.id === state.chId;
        });
        const kp = ch
          ? ch.knowledgePoints.find(function (k) {
              return k.id === state.kpId;
            })
          : null;
        return ch && kp ? ch.name + " › " + kp.name : "知识点练习";
      }
      const ch = subject.chapters.find(function (c) {
        return c.id === state.chId;
      });
      return ch ? ch.name : "章节练习";
    }

    function modeDesc() {
      if (state.mode === "wrong") return "只显示已提交且答错的选择题";
      if (state.mode === "weak") return "只显示你标记为薄弱的题目";
      if (state.mode === "random") return "按未做 > 真题 > 错题的优先级抽取";
      if (state.mode === "kp") return "按知识点集中练习";
      if (state.mode === "chapter") return "按章节集中练习";
      return "覆盖本科全部题型，按顺序或随机练习";
    }

    function buildList(preserveIndex) {
      const keep =
        preserveIndex && state.list[state.index] ? state.list[state.index].q.id : null;
      if (state.mode === "random") {
        if (!state.randomDrawn) state.list = [];
      } else {
        let items = subject.index.slice();
        if (state.mode === "chapter") {
          items = items.filter(function (item) {
            return item.chapterId === state.chId;
          });
        } else if (state.mode === "kp") {
          items = items.filter(function (item) {
            return item.kpId === state.kpId;
          });
        } else if (state.mode === "wrong") {
          items = items.filter(function (item) {
            const a = getAnswer(item.q.id);
            return a && a.submitted && CPA.isObjective(item.q.type) && a.correct === false;
          });
        } else if (state.mode === "weak") {
          items = items.filter(function (item) {
            const a = getAnswer(item.q.id);
            return a && a.weak;
          });
        }
        if (state.order === "rand") items = U.shuffle(items);
        state.list = items;
      }

      if (keep) {
        const k = state.list.findIndex(function (item) {
          return item.q.id === keep;
        });
        state.index = k >= 0 ? k : 0;
      } else {
        state.index = 0;
      }
      state.draft = {};
    }

    function statusClass(status) {
      return status === "todo" ? "" : " " + status;
    }

    function chapterHTML(ch, agg) {
      const c = agg.chapters[ch.id] || { total: 0, answered: 0, wrong: 0 };
      const active = state.chId === ch.id && (state.mode === "chapter" || state.mode === "kp");
      const pct = c.total ? Math.round((c.answered / c.total) * 100) : 0;
      let html = "";
      html += '<div class="chapter-group">';
      html +=
        '<button class="chapter-row' +
        (active ? " active" : "") +
        '" type="button" data-ch="' +
        U.esc(ch.id) +
        '" title="' +
        U.esc(ch.name) +
        '">' +
        '<div class="chapter-row-top"><span class="chapter-name">' +
        U.esc(ch.name) +
        "</span><span class=\"chapter-count\">" +
        c.answered +
        "/" +
        c.total +
        "</span></div>" +
        '<div class="chapter-bar"><span style="width:' +
        pct +
        '%"></span></div>' +
        "</button>";
      if (active && ch.knowledgePoints.length) {
        html += '<div class="kp-list">';
        ch.knowledgePoints.forEach(function (kp) {
          const k = agg.kps[kp.id] || { total: 0, answered: 0, wrong: 0 };
          const kpActive = state.mode === "kp" && state.kpId === kp.id;
          html +=
            '<button class="kp-row' +
            (kpActive ? " active" : "") +
            '" type="button" data-ch="' +
            U.esc(ch.id) +
            '" data-kp="' +
            U.esc(kp.id) +
            '">' +
            '<span class="kp-name">' +
            U.esc(kp.name) +
            "</span>" +
            '<span class="kp-count">' +
            k.total +
            "</span>" +
            (k.wrong ? '<span class="kp-wrong">错' + k.wrong + "</span>" : "") +
            "</button>";
        });
        html += "</div>";
      }
      html += "</div>";
      return html;
    }

    function renderSidebar() {
      const progress = CPA.computeProgress(subject);
      const agg = buildChapterAgg();
      const rate = progress.rate === null ? "—" : progress.rate + "%";
      let html = "";

      html += '<div class="side-head">';
      html +=
        '<div class="side-head-top"><h2>' +
        U.esc(subject.name) +
        " · 练习</h2><span class=\"tag tag-plain\">" +
        subject.stats.chapters +
        ' 章</span><button class="side-close" type="button" id="sideClose" aria-label="关闭导航">×</button></div>';
      html +=
        '<div class="progress-label"><span>本科进度</span><b>' +
        progress.pct +
        "%</b></div>";
      html += '<div class="side-progress-track"><span style="width:' + progress.pct + '%"></span></div>';
      html +=
        '<div class="side-progress-meta"><span>已答 ' +
        progress.answered +
        " / " +
        progress.total +
        "</span><span>正确率 " +
        rate +
        "</span></div>";
      html += "</div>";

      html += '<div class="side-section">';
      html += '<div class="side-section-title">练习模式</div>';
      html += '<div class="side-modes">';
      html +=
        '<button class="mode-btn' +
        (state.mode === "all" ? " active" : "") +
        '" type="button" data-mode="all"><span class="mode-icon">◉</span>全部题目<span class="mode-count">' +
        subject.stats.total +
        "</span></button>";
      html +=
        '<button class="mode-btn' +
        (state.mode === "wrong" ? " active" : "") +
        '" type="button" data-mode="wrong"><span class="mode-icon">✕</span>错题本<span class="mode-count">' +
        progress.wrong +
        "</span></button>";
      html +=
        '<button class="mode-btn' +
        (state.mode === "weak" ? " active" : "") +
        '" type="button" data-mode="weak"><span class="mode-icon">★</span>薄弱题<span class="mode-count">' +
        progress.weak +
        "</span></button>";
      html += "</div>";
      html +=
        '<button class="random-entry' +
        (state.mode === "random" ? " active" : "") +
        '" type="button" id="randomEntry">⟳ 随机练习<span style="margin-left:auto;font-weight:400;font-size:10px;color:var(--muted)">自定义抽题</span></button>';
      html += "</div>";

      html += '<div class="side-section">';
      html +=
        '<div class="side-section-title"><span>章节导航</span><span>' +
        subject.stats.total +
        " 题</span></div>";
      html += '<div class="chapter-tree">';
      subject.chapters.forEach(function (ch) {
        html += chapterHTML(ch, agg);
      });
      html += "</div></div>";

      html += '<div class="side-section">';
      html +=
        '<a class="side-link" href="' +
        CPA.router.subjectPath(subject.id, "test") +
        '">测试中心</a>';
      html +=
        '<a class="side-link" href="' +
        CPA.router.subjectPath(subject.id, "entry") +
        '">录入题目</a>';
      html += "</div>";
      html += '<button class="side-reset" type="button" id="resetProgress">清空本科答题记录</button>';

      sidePanel.innerHTML = html;

      sidePanel.querySelectorAll("[data-mode]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          setMode(btn.getAttribute("data-mode"));
        });
      });
      sidePanel.querySelectorAll(".chapter-row").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const chId = btn.getAttribute("data-ch");
          state.mode = "chapter";
          state.chId = chId;
          state.kpId = null;
          state.randomOpen = false;
          state.randomDrawn = false;
          buildList(false);
          renderAll();
          closeSidebar();
        });
      });
      sidePanel.querySelectorAll(".kp-row").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          state.mode = "kp";
          state.chId = btn.getAttribute("data-ch");
          state.kpId = btn.getAttribute("data-kp");
          state.randomOpen = false;
          state.randomDrawn = false;
          buildList(false);
          renderAll();
          closeSidebar();
        });
      });
      const randomEntry = sidePanel.querySelector("#randomEntry");
      if (randomEntry) randomEntry.addEventListener("click", openRandom);
      const sideClose = sidePanel.querySelector("#sideClose");
      if (sideClose) sideClose.addEventListener("click", closeSidebar);
      const reset = sidePanel.querySelector("#resetProgress");
      if (reset) {
        reset.addEventListener("click", function () {
          if (!confirm("确定清空《" + subject.name + "》的全部答题记录吗？测试记录与自建题目会保留。")) return;
          CPA.store.resetSubjectProgress(subject.id);
          buildList(false);
          renderAll();
          CPA.app.refreshChrome();
          U.toast("已清空本科答题记录");
        });
      }
    }

    function setMode(mode) {
      state.mode = mode;
      state.chId = null;
      state.kpId = null;
      state.randomOpen = false;
      state.randomDrawn = false;
      buildList(false);
      renderAll();
      closeSidebar();
    }

    function openRandom() {
      state.mode = "random";
      state.randomOpen = true;
      state.randomDrawn = false;
      state.chId = null;
      state.kpId = null;
      state.list = [];
      state.index = 0;
      state.draft = {};
      renderAll();
      closeSidebar();
    }

    function currentStats() {
      const prog = CPA.store.getProgress(subject.id);
      let answered = 0;
      let graded = 0;
      let correct = 0;
      state.list.forEach(function (item) {
        const a = prog[item.q.id];
        if (a && a.submitted) {
          answered++;
          if (CPA.isObjective(item.q.type)) {
            graded++;
            if (a.correct) correct++;
          }
        }
      });
      return {
        total: state.list.length,
        answered: answered,
        rate: graded ? Math.round((correct / graded) * 100) : null,
      };
    }

    const QNAV_LIMIT = 240;
    const QNAV_WINDOW = 120;

    function qnavWindow() {
      const total = state.list.length;
      if (total <= QNAV_LIMIT) return { start: 0, end: total, limited: false };
      let start = Math.max(0, state.index - Math.floor(QNAV_WINDOW / 2));
      const end = Math.min(total, start + QNAV_WINDOW);
      start = Math.max(0, end - QNAV_WINDOW);
      return { start: start, end: end, limited: true };
    }

    function qnavHTML() {
      const win = qnavWindow();
      let html = "";
      for (let i = win.start; i < win.end; i++) {
        const item = state.list[i];
        if (!item) continue;
        const status = CPA.statusOf(subject, item.q);
        html +=
          '<button class="qnav-btn' +
          statusClass(status) +
          (i === state.index ? " current" : "") +
          '" type="button" data-k="' +
          i +
          '" title="第 ' +
          (i + 1) +
          ' 题 · ' +
          U.esc(CPA.typeLabel(subject, item.q.type)) +
          '">' +
          (i + 1) +
          "</button>";
      }
      return html;
    }

    function optionHTML(q, sel, submitted) {
      let html = '<div class="options" id="options">';
      q.options.forEach(function (opt) {
        const key = opt.key;
        const isCorrect = q.answer.indexOf(key) >= 0;
        const picked = sel.indexOf(key) >= 0;
        let cls = "option";
        let mark = "";
        let reason = "";
        if (submitted) {
          if (isCorrect) {
            cls += " correct";
            mark = "✓";
          } else if (picked) {
            cls += " wrong";
            mark = "✗";
          } else {
            cls += " dim";
          }
          const reasonText = q.optionAnalysis && q.optionAnalysis[key];
          if (reasonText) {
            reason =
              '<div class="option-reason ' +
              (isCorrect ? "ok" : "no") +
              '">' +
              U.esc(reasonText) +
              "</div>";
          }
        } else if (picked) {
          cls += " selected";
        }
        html +=
          '<button class="' +
          cls +
          '" type="button" data-letter="' +
          U.esc(key) +
          '"' +
          (submitted ? " disabled" : "") +
          ">" +
          '<span class="option-letter">' +
          U.esc(key) +
          "</span>" +
          '<span class="option-text">' +
          U.esc(opt.text) +
          reason +
          "</span>" +
          (mark ? '<span class="option-mark">' + mark + "</span>" : "") +
          "</button>";
      });
      html += "</div>";
      return html;
    }

    function analysisHTML(q, a) {
      let html = '<div class="analysis-stack">';
      if (q.knowledgePoint) {
        html +=
          '<div class="analysis-card kp"><div class="analysis-title">考察知识点</div><div class="analysis-body">' +
          U.esc(q.knowledgePoint) +
          "</div></div>";
      }
      if (q.tip) {
        html +=
          '<div class="analysis-card tip"><div class="analysis-title">快速记忆</div><div class="analysis-body">' +
          U.esc(q.tip) +
          "</div></div>";
      }
      if (q.analysis) {
        html +=
          '<div class="analysis-card"><div class="analysis-title">详细解析</div><div class="analysis-body">' +
          U.esc(q.analysis) +
          "</div></div>";
      }
      html +=
        '<div class="weak-row"><span class="small muted">标记后可进入「薄弱题」集中复习</span>' +
        '<button class="weak-btn' +
        (a && a.weak ? " on" : "") +
        '" type="button" id="weakBtn">' +
        (a && a.weak ? "★ 已标记薄弱" : "☆ 标记为薄弱") +
        "</button></div>";
      html += "</div>";
      return html;
    }

    function subjectiveHTML(q, a) {
      const revealed = (a && Array.isArray(a.revealed) ? a.revealed : []).slice();
      const texts = a && Array.isArray(a.subTexts) ? a.subTexts : [];
      let html = '<div class="subjective-list">';
      q.subs.forEach(function (sub, i) {
        html +=
          '<div class="sub-question">' +
          '<div class="sub-prompt">' +
          U.esc(sub.prompt) +
          "</div>" +
          '<textarea class="textarea sub-textarea" data-sub="' +
          i +
          '" placeholder="写下你的结论与理由，可稍后对照参考答案…">' +
          U.esc(texts[i] || "") +
          "</textarea>" +
          '<div class="sub-actions">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-reveal="' +
          i +
          '">' +
          (revealed[i] ? "收起参考答案" : "查看参考答案") +
          "</button>" +
          (sub.analysis
            ? '<span class="small muted">查看后请自行核对要点</span>'
            : "") +
          "</div>";
        if (revealed[i]) {
          html +=
            '<div class="reference"><div class="reference-head">参考答案</div><div class="reference-body">' +
            U.esc(sub.answer || "—") +
            (sub.analysis ? "\n\n" + U.esc(sub.analysis) : "") +
            "</div></div>";
        }
        html += "</div>";
      });
      html += "</div>";
      return html;
    }

    function questionHTML(item) {
      const q = item.q;
      const a = getAnswer(q.id);
      const submitted = !!(a && a.submitted);
      const sel = submitted
        ? a.sel || []
        : state.draft[q.id] || [];
      const objective = CPA.isObjective(q.type);
      let html = '<article class="question-card">';

      html += '<div class="q-meta">';
      html +=
        '<span class="q-badge q-badge-type">' +
        U.esc(CPA.typeLabel(subject, q.type)) +
        "</span>";
      if (q.year) {
        html +=
          '<span class="q-badge q-badge-year">' +
          U.esc(q.year) +
          (/^\d{4}$/.test(String(q.year)) && !q.isUser ? " 真题" : "") +
          "</span>";
      }
      if (q.placeholder) {
        html += '<span class="q-badge q-badge-placeholder">占位题</span>';
      } else if (q.source && !q.isUser) {
        html +=
          '<span class="q-badge q-badge-source" title="' +
          U.esc(q.source) +
          '">' +
          U.esc(q.source) +
          "</span>";
      }
      if (q.isUser) {
        html += '<span class="q-badge q-badge-user">自建</span>';
      }
      html +=
        '<span class="q-chapter">' +
        U.esc(item.chapterName) +
        " · " +
        U.esc(item.kpName) +
        "</span>";
      html += "</div>";

      html += '<div class="q-stem">' + U.esc(q.stem) + "</div>";

      if (objective) {
        if (submitted) {
          const ok = !!a.correct;
          const mine = (a.sel || []).join("、") || "未作答";
          html +=
            '<div class="answer-banner ' +
            (ok ? "ok" : "no") +
            '"><span class="answer-strong">' +
            (ok ? "回答正确 ✓" : "回答错误 ✗") +
            "</span><span>正确答案：<b>" +
            U.esc(q.answer.join("、")) +
            "</b></span><span class=\"answer-spacer\"></span><span>你的答案：" +
            U.esc(mine) +
            "</span></div>";
        }
        html += optionHTML(q, sel, submitted);
        if (!submitted) {
          html +=
            '<div class="answer-actions">' +
            '<button class="btn btn-primary" type="button" id="submitAnswer"' +
            (sel.length ? "" : " disabled") +
            ">提交答案</button>" +
            '<span class="hint">' +
            (q.type === "single" ? "单选题：选择一个选项" : "多选题：选出全部正确项") +
            "</span></div>";
        }
        if (submitted) html += analysisHTML(q, a);
      } else {
        html +=
          '<div class="answer-banner neutral"><span class="answer-strong">主观题 · 自评</span><span>' +
          (submitted
            ? "已完成本题，请对照参考答案核对要点"
            : "先写下作答要点，再展开参考答案逐项核对") +
          "</span></div>";
        html += subjectiveHTML(q, a);
        if (submitted) html += analysisHTML(q, a);
        if (!submitted) {
          html +=
            '<div class="answer-actions"><span class="hint">展开任意小问的参考答案后，本题会计入已完成。</span></div>';
        }
      }

      html += "</article>";
      return { html: html, submitted: submitted, objective: objective, answer: a };
    }

    function emptyHTML() {
      let title = "暂无题目";
      let desc = "当前筛选条件下没有题目。";
      if (state.mode === "wrong") {
        title = "错题本是空的";
        desc = "先去做题，答错的选择题会自动进入错题本。";
      } else if (state.mode === "weak") {
        title = "还没有薄弱题";
        desc = "做题后如果对某个知识点不放心，可以在解析区标记为薄弱。";
      } else if (state.mode === "chapter" || state.mode === "kp") {
        title = "该范围暂无题目";
        desc = "可以在「录入题目」中为当前章节补充题目，或切换到全部题目。";
      }
      return (
        '<div class="work-toolbar"><div><div class="work-title-row"><span class="eyebrow">PRACTICE</span><h1 class="work-title">' +
        U.esc(modeTitle()) +
        "</h1></div><p class=\"work-sub\">" +
        U.esc(modeDesc()) +
        "</p></div></div>" +
        '<div class="empty-state"><div class="empty-icon">◇</div><h2>' +
        U.esc(title) +
        "</h2><p>" +
        U.esc(desc) +
        '</p><div class="empty-actions"><button class="btn btn-primary" type="button" data-go="all">查看全部题目</button>' +
        '<a class="btn btn-ghost" href="' +
        CPA.router.subjectPath(subject.id, "entry") +
        '">去录入题目</a></div></div>'
      );
    }

    function randomConfigHTML() {
      const avail = CPA.exam.availability(subject, state.randomChapters);
      const counts = {
        single: Math.min(state.randomCounts.single, avail.single),
        multiple: Math.min(state.randomCounts.multiple, avail.multiple),
        subjective: Math.min(state.randomCounts.subjective, avail.subjective),
      };
      const total = counts.single + counts.multiple + counts.subjective;
      const subjectiveTodo = Object.keys(avail.todoByType).reduce(function (sum, type) {
        return sum + (CPA.isObjective(type) ? 0 : avail.todoByType[type] || 0);
      }, 0);
      const chips = subject.chapters
        .map(function (ch) {
          const active = state.randomChapters.indexOf(ch.id) >= 0;
          return (
            '<button class="chip-toggle' +
            (active ? " active" : "") +
            '" type="button" data-rch="' +
            U.esc(ch.id) +
            '">' +
            U.esc(ch.name) +
            "</button>"
          );
        })
        .join("");
      return (
        '<div class="random-panel">' +
        '<div class="random-head"><div class="random-symbol">⟳</div><h2>随机练习</h2>' +
        '<span class="tag tag-plain" style="margin-left:auto">按优先级抽题</span></div>' +
        '<p class="random-desc">优先抽取 <b>未做题目</b>、<b>真题</b> 与 <b>错题</b>；当优先范围不足时，自动从其余题目补足。可先限定章节范围。</p>' +
        '<div class="random-block"><div class="random-block-head"><span>练习范围</span>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="add-row-btn" type="button" id="randomAllChapters">全选章节</button>' +
        '<button class="add-row-btn" type="button" id="randomNoChapters">不限章节</button>' +
        "</div></div>" +
        '<div class="chapter-chips">' +
        chips +
        "</div>" +
        '<p class="small muted" style="margin:8px 0 0">' +
        (state.randomChapters.length
          ? "当前已选 " + state.randomChapters.length + " / " + subject.stats.chapters + " 章"
          : "当前范围：全部章节") +
        "</p></div>" +
        '<div class="random-block"><div class="random-block-head"><span>抽取数量</span><span class="small muted">请按可用量设置</span></div>' +
        '<div class="random-grid">' +
        '<label class="field"><span class="field-label">单项选择题</span><input class="input" id="randomSingle" type="number" min="0" max="' +
        avail.single +
        '" value="' +
        counts.single +
        '" /><span class="field-hint">可用 ' +
        avail.single +
        " 题 · 未做 " +
        (avail.todoByType.single || 0) +
        "</span></label>" +
        '<label class="field"><span class="field-label">多项选择题</span><input class="input" id="randomMultiple" type="number" min="0" max="' +
        avail.multiple +
        '" value="' +
        counts.multiple +
        '" /><span class="field-hint">可用 ' +
        avail.multiple +
        " 题 · 未做 " +
        (avail.todoByType.multiple || 0) +
        "</span></label>" +
        '<label class="field"><span class="field-label">主观题</span><input class="input" id="randomSubjective" type="number" min="0" max="' +
        avail.subjective +
        '" value="' +
        counts.subjective +
        '" /><span class="field-hint">可用 ' +
        avail.subjective +
        " 题 · 未做 " +
        subjectiveTodo +
        "</span></label>" +
        "</div></div>" +
        '<div class="random-avail">当前范围共 <b>' +
        avail.total +
        "</b> 题：单选 <b>" +
        avail.single +
        "</b> · 多选 <b>" +
        avail.multiple +
        "</b> · 主观 <b>" +
        avail.subjective +
        "</b>。本次将抽取 <b>" +
        total +
        "</b> 题。</div>" +
        '<div class="random-actions"><button class="btn btn-primary" type="button" id="randomStart"' +
        (total ? "" : " disabled") +
        ">开始抽题</button>" +
        '<button class="btn btn-ghost" type="button" id="randomCancel">取消</button></div>' +
        '<p class="random-msg" id="randomMsg"></p>' +
        "</div>"
      );
    }

    function readRandomInputs() {
      ["single", "multiple", "subjective"].forEach(function (type) {
        const el = root.querySelector("#random" + type.charAt(0).toUpperCase() + type.slice(1));
        if (el) {
          const n = parseInt(el.value, 10);
          state.randomCounts[type] = isFinite(n) && n > 0 ? n : 0;
        }
      });
    }

    function drawRandomPractice() {
      readRandomInputs();
      const avail = CPA.exam.availability(subject, state.randomChapters);
      let counts = {
        single: Math.min(state.randomCounts.single, avail.single),
        multiple: Math.min(state.randomCounts.multiple, avail.multiple),
        subjective: Math.min(state.randomCounts.subjective, avail.subjective),
      };
      if (counts.single + counts.multiple + counts.subjective === 0) {
        const msg = root.querySelector("#randomMsg");
        if (msg) msg.textContent = "请至少设置 1 道题，且所选范围需要有对应题型。";
        return;
      }
      const picked = []
        .concat(CPA.exam.pickItems(subject, "single", counts.single, state.randomChapters))
        .concat(CPA.exam.pickItems(subject, "multiple", counts.multiple, state.randomChapters))
        .concat(CPA.exam.pickItems(subject, "subjective", counts.subjective, state.randomChapters));
      if (!picked.length) {
        const msg = root.querySelector("#randomMsg");
        if (msg) msg.textContent = "当前范围没有可用题目。";
        return;
      }
      state.list = U.shuffle(picked);
      state.index = 0;
      state.draft = {};
      state.randomDrawn = true;
      state.randomOpen = false;
      state.mode = "random";
      state.randomChapters = state.randomChapters.slice();
      state.randomCounts = counts;
      renderAll();
      U.toast("已抽取 " + state.list.length + " 道题");
    }

    function bindRandom() {
      root.querySelectorAll("[data-rch]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          readRandomInputs();
          const id = btn.getAttribute("data-rch");
          const i = state.randomChapters.indexOf(id);
          if (i >= 0) state.randomChapters.splice(i, 1);
          else state.randomChapters.push(id);
          renderMain();
        });
      });
      const all = root.querySelector("#randomAllChapters");
      if (all)
        all.addEventListener("click", function () {
          readRandomInputs();
          state.randomChapters = subject.chapters.map(function (ch) {
            return ch.id;
          });
          renderMain();
        });
      const none = root.querySelector("#randomNoChapters");
      if (none)
        none.addEventListener("click", function () {
          readRandomInputs();
          state.randomChapters = [];
          renderMain();
        });
      const start = root.querySelector("#randomStart");
      if (start) start.addEventListener("click", drawRandomPractice);
      const cancel = root.querySelector("#randomCancel");
      if (cancel)
        cancel.addEventListener("click", function () {
          setMode("all");
        });
      ["single", "multiple", "subjective"].forEach(function (type) {
        const el = root.querySelector("#random" + type.charAt(0).toUpperCase() + type.slice(1));
        if (!el) return;
        el.addEventListener("input", function () {
          const n = parseInt(el.value, 10);
          state.randomCounts[type] = isFinite(n) && n > 0 ? n : 0;
          const avail = CPA.exam.availability(subject, state.randomChapters);
          const total =
            Math.min(state.randomCounts.single, avail.single) +
            Math.min(state.randomCounts.multiple, avail.multiple) +
            Math.min(state.randomCounts.subjective, avail.subjective);
          const startBtn = root.querySelector("#randomStart");
          if (startBtn) startBtn.disabled = total === 0;
        });
      });
    }

    function bindQuestion() {
      if (!state.list.length) return;
      const item = state.list[state.index];
      const q = item.q;
      const a = getAnswer(q.id);
      const submitted = !!(a && a.submitted);
      const objective = CPA.isObjective(q.type);

      if (objective && !submitted) {
        const options = root.querySelectorAll("#options .option");
        options.forEach(function (el) {
          el.addEventListener("click", function () {
            const letter = el.getAttribute("data-letter");
            let sel = (state.draft[q.id] || []).slice();
            if (q.type === "single") sel = [letter];
            else if (sel.indexOf(letter) >= 0) sel = sel.filter(function (x) { return x !== letter; });
            else sel.push(letter);
            state.draft[q.id] = sel;
            options.forEach(function (op) {
              op.classList.toggle("selected", sel.indexOf(op.getAttribute("data-letter")) >= 0);
            });
            const submit = root.querySelector("#submitAnswer");
            if (submit) submit.disabled = sel.length === 0;
          });
        });
        const submit = root.querySelector("#submitAnswer");
        if (submit) {
          submit.addEventListener("click", function () {
            submitChoice(q);
          });
        }
      }

      if (!objective) {
        let saveTimer = null;
        function collectTexts() {
          const texts = [];
          root.querySelectorAll(".sub-textarea").forEach(function (ta) {
            texts.push(ta.value);
          });
          return texts;
        }
        function scheduleSave() {
          const texts = collectTexts();
          clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            const current = getAnswer(q.id) || {};
            CPA.store.setAnswer(subject.id, q.id, {
              submitted: !!current.submitted,
              revealed: current.revealed || [],
              subTexts: texts,
              weak: !!current.weak,
            });
          }, 500);
        }
        root.querySelectorAll(".sub-textarea").forEach(function (ta) {
          ta.addEventListener("input", scheduleSave);
          ta.addEventListener("blur", scheduleSave);
        });
        root.querySelectorAll("[data-reveal]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            clearTimeout(saveTimer);
            const k = parseInt(btn.getAttribute("data-reveal"), 10);
            const current = getAnswer(q.id) || {};
            const revealed = (current.revealed || q.subs.map(function () { return false; })).slice();
            revealed[k] = !revealed[k];
            CPA.store.setAnswer(subject.id, q.id, {
              submitted: current.submitted || revealed.some(Boolean),
              revealed: revealed,
              subTexts: collectTexts(),
              weak: !!current.weak,
            });
            renderMain();
            renderSidebar();
            CPA.app.refreshChrome();
          });
        });
      }

      const weakBtn = root.querySelector("#weakBtn");
      if (weakBtn) {
        weakBtn.addEventListener("click", function () {
          const current = getAnswer(q.id) || {};
          const weak = !current.weak;
          CPA.store.setAnswer(subject.id, q.id, {
            weak: weak,
            submitted: current.submitted || false,
          });
          if (state.mode === "weak" && !weak) {
            buildList(false);
            renderAll();
          } else {
            renderMain();
            renderSidebar();
          }
          CPA.app.refreshChrome();
          U.toast(weak ? "已标记为薄弱题" : "已取消薄弱标记");
        });
      }
    }

    function submitChoice(q) {
      const sel = (state.draft[q.id] || []).slice().sort();
      if (!sel.length) return;
      const correct = U.arrEq(sel, q.answer);
      const current = getAnswer(q.id) || {};
      CPA.store.setAnswer(subject.id, q.id, {
        submitted: true,
        sel: sel,
        correct: correct,
        weak: !!current.weak,
      });
      state.draft = {};
      renderMain();
      renderSidebar();
      CPA.app.refreshChrome();
    }

    function renderMain() {
      if (state.randomOpen && !state.randomDrawn) {
        workPanel.innerHTML = randomConfigHTML();
        bindRandom();
        return;
      }

      if (!state.list.length) {
        workPanel.innerHTML = emptyHTML();
        workPanel.querySelectorAll("[data-go]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setMode(btn.getAttribute("data-go"));
          });
        });
        return;
      }

      if (state.index >= state.list.length) state.index = state.list.length - 1;
      if (state.index < 0) state.index = 0;

      const stats = currentStats();
      const rate = stats.rate === null ? "—" : stats.rate + "%";
      const item = state.list[state.index];
      const qhtml = questionHTML(item);
      let randomTools = "";
      if (state.mode === "random") {
        randomTools =
          '<button class="btn btn-ghost btn-sm" type="button" id="redrawRandom">重新抽题</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" id="exitRandom">退出随机</button>';
      }

      let html = "";
      html +=
        '<div class="work-toolbar"><div><div class="work-title-row"><span class="eyebrow">PRACTICE</span><h1 class="work-title">' +
        U.esc(modeTitle()) +
        "</h1>" +
        (state.mode === "random"
          ? '<span class="tag tag-accent">' + state.list.length + " 题</span>"
          : "") +
        "</div><p class=\"work-sub\">" +
        U.esc(modeDesc()) +
        "</p>" +
        '<div class="current-stats"><span>共 <b>' +
        stats.total +
        "</b> 题</span><span>已答 <b>" +
        stats.answered +
        "</b></span><span>正确率 <b>" +
        rate +
        "</b></span></div></div>" +
        '<div class="work-tools">' +
        (state.mode !== "random"
          ? '<select class="tool-select" id="orderSelect" aria-label="练习顺序"><option value="seq"' +
            (state.order === "seq" ? " selected" : "") +
            ">顺序练习</option><option value=\"rand\"" +
            (state.order === "rand" ? " selected" : "") +
            ">随机顺序</option></select>"
          : "") +
        randomTools +
        "</div></div>";

      const win = qnavWindow();
      html +=
        '<div class="qnav-wrap"><div class="qnav-head"><span>题目导航</span><b>' +
        (state.index + 1) +
        " / " +
        state.list.length +
        "</b>" +
        (win.limited
          ? '<span class="qnav-range">显示 ' +
            (win.start + 1) +
            "–" +
            win.end +
            "</span>" +
            '<span class="qnav-jump"><input id="qnavJump" type="number" min="1" max="' +
            state.list.length +
            '" placeholder="跳至题号" /><button type="button" id="qnavJumpBtn">跳转</button></span>'
          : "") +
        '<div class="qnav-progress"><span style="width:' +
        Math.round(((state.index + 1) / state.list.length) * 100) +
        '%"></span></div></div>' +
        '<div class="qnav">' +
        qnavHTML() +
        "</div></div>";

      html += qhtml.html;

      html +=
        '<div class="pager">' +
        '<button class="pager-btn" type="button" id="prevQuestion"' +
        (state.index <= 0 ? " disabled" : "") +
        ">← 上一题</button>" +
        '<span class="pager-index"><b>' +
        (state.index + 1) +
        "</b> / " +
        state.list.length +
        "</span>" +
        '<button class="pager-btn primary" type="button" id="nextQuestion"' +
        (state.index >= state.list.length - 1 ? " disabled" : "") +
        ">下一题 →</button></div>";

      workPanel.innerHTML = html;

      const orderSelect = root.querySelector("#orderSelect");
      if (orderSelect) {
        orderSelect.addEventListener("change", function () {
          state.order = orderSelect.value;
          buildList(true);
          renderMain();
        });
      }
      root.querySelectorAll(".qnav-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.index = parseInt(btn.getAttribute("data-k"), 10);
          state.draft = {};
          renderMain();
        });
      });
      const jumpBtn = root.querySelector("#qnavJumpBtn");
      const jumpInput = root.querySelector("#qnavJump");
      function jumpToQuestion() {
        if (!jumpInput) return;
        const n = parseInt(jumpInput.value, 10);
        if (!isFinite(n)) return;
        state.index = U.clamp(n - 1, 0, state.list.length - 1);
        state.draft = {};
        renderMain();
      }
      if (jumpBtn) jumpBtn.addEventListener("click", jumpToQuestion);
      if (jumpInput)
        jumpInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            jumpToQuestion();
          }
        });
      const prev = root.querySelector("#prevQuestion");
      if (prev)
        prev.addEventListener("click", function () {
          if (state.index > 0) {
            state.index--;
            state.draft = {};
            renderMain();
          }
        });
      const next = root.querySelector("#nextQuestion");
      if (next)
        next.addEventListener("click", function () {
          if (state.index < state.list.length - 1) {
            state.index++;
            state.draft = {};
            renderMain();
          }
        });
      const redraw = root.querySelector("#redrawRandom");
      if (redraw)
        redraw.addEventListener("click", function () {
          state.randomOpen = true;
          state.randomDrawn = false;
          renderMain();
        });
      const exitRandom = root.querySelector("#exitRandom");
      if (exitRandom)
        exitRandom.addEventListener("click", function () {
          setMode("all");
        });

      bindQuestion();

      const qnav = root.querySelector(".qnav");
      const currentNav = qnav ? qnav.querySelector(".qnav-btn.current") : null;
      if (
        qnav &&
        currentNav &&
        window.matchMedia &&
        window.matchMedia("(max-width: 600px)").matches
      ) {
        qnav.scrollLeft = Math.max(
          0,
          currentNav.offsetLeft - qnav.clientWidth / 2 + currentNav.offsetWidth / 2
        );
      }
    }

    function renderAll() {
      renderSidebar();
      renderMain();
    }

    function closeSidebar() {
      if (window.matchMedia && window.matchMedia("(max-width: 820px)").matches) {
        sidePanel.classList.remove("open");
        backdrop.classList.remove("show");
        document.body.style.overflow = "";
      }
    }

    function openSidebar() {
      sidePanel.classList.add("open");
      backdrop.classList.add("show");
      document.body.style.overflow = "hidden";
    }

    sideToggle.addEventListener("click", openSidebar);
    backdrop.addEventListener("click", closeSidebar);

    function onKeydown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.body.classList.contains("modal-open")) return;
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (e.target && e.target.isContentEditable)) {
        return;
      }
      if (state.randomOpen || !state.list.length) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (state.index > 0) {
          state.index--;
          state.draft = {};
          renderMain();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (state.index < state.list.length - 1) {
          state.index++;
          state.draft = {};
          renderMain();
        }
      } else if (e.key === "Enter") {
        const submit = root.querySelector("#submitAnswer");
        if (submit && !submit.disabled) {
          e.preventDefault();
          submit.click();
        }
      } else if (/^[a-fA-F]$/.test(e.key)) {
        const item = state.list[state.index];
        if (!item || !CPA.isObjective(item.q.type)) return;
        const a = getAnswer(item.q.id);
        if (a && a.submitted) return;
        const opt = root.querySelector('#options .option[data-letter="' + e.key.toUpperCase() + '"]');
        if (opt) {
          e.preventDefault();
          opt.click();
        }
      } else if (e.key === "Escape") {
        closeSidebar();
      }
    }

    document.addEventListener("keydown", onKeydown);

    function onResize() {
      if (!window.matchMedia || !window.matchMedia("(max-width: 820px)").matches) {
        sidePanel.classList.remove("open");
        backdrop.classList.remove("show");
        document.body.style.overflow = "";
      }
    }
    window.addEventListener("resize", onResize);

    buildList(false);
    renderAll();

    return {
      destroy: function () {
        document.removeEventListener("keydown", onKeydown);
        window.removeEventListener("resize", onResize);
        document.body.style.overflow = "";
      },
    };
  }

  CPA.views = CPA.views || {};
  CPA.views.practice = { mount: mount };
})();
