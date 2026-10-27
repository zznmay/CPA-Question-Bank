/* CPA 统一题库 · 测试中心 / 限时考试 / 成绩 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  function mount(root, ctx) {
    const subject = ctx.subject;
    const state = {
      session: null,
      idx: 0,
      review: false,
      timer: null,
      finished: false,
      saveTimer: null,
      sheetCollapsed: window.matchMedia && window.matchMedia("(max-width: 980px)").matches,
      quick: {
        chapters: [],
        counts: { single: 0, multiple: 0, subjective: 0 },
        duration: 30,
      },
    };

    const initial = CPA.exam.availability(subject);
    state.quick.counts = {
      single: Math.min(10, initial.single),
      multiple: Math.min(5, initial.multiple),
      subjective: Math.min(1, initial.subjective),
    };

    function stopTimer() {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
        state.saveTimer = null;
      }
    }

    function examMode(on) {
      CPA.app.setExamMode(!!on);
    }

    function saveSession(session) {
      CPA.store.saveTest(session);
    }

    function finalize(session, auto) {
      if (!session || session.status !== "active") return;
      session.status = "done";
      session.submittedAt = Date.now();
      saveSession(session);
      stopTimer();
      state.finished = true;
      examMode(false);
      U.toast(auto ? "考试时间已到，已自动交卷" : "已交卷，客观题已自动判分", auto ? "info" : "success", 3200);
      renderResult(session);
    }

    function startTimer(session) {
      if (state.timer || state.finished) return;
      state.timer = setInterval(function () {
        if (!state.session || state.session.id !== session.id) return;
        if (state.finished) return;
        const remaining = session.deadline - Date.now();
        const clock = root.querySelector("#examClock");
        if (clock) {
          clock.textContent = CPA.exam.formatClock(remaining);
          clock.classList.toggle("urgent", remaining <= 5 * 60000);
        }
        if (remaining <= 0) {
          finalize(session, true);
        }
      }, 500);
      const clock = root.querySelector("#examClock");
      if (clock) clock.textContent = CPA.exam.formatClock(session.deadline - Date.now());
    }

    /* ---------------- Center ---------------- */

    function prepareCenter() {
      examMode(false);
      let active = CPA.store.getActiveTest(subject.id);
      if (active && CPA.exam.isExpired(active)) {
        active.status = "done";
        active.submittedAt = active.deadline;
        saveSession(active);
        U.toast("有一场测试已超过截止时间，系统已自动交卷", "info", 3600);
        active = null;
      }
      return active;
    }

    function quickAvailability() {
      return CPA.exam.availability(subject, state.quick.chapters);
    }

    function readQuickForm() {
      const ids = { single: "#qsSingle", multiple: "#qsMultiple", subjective: "#qsSubjective" };
      Object.keys(ids).forEach(function (key) {
        const el = root.querySelector(ids[key]);
        if (!el) return;
        const n = parseInt(el.value, 10);
        state.quick.counts[key] = isFinite(n) && n > 0 ? n : 0;
      });
      const duration = root.querySelector("#qsDuration");
      if (duration) {
        const d = parseInt(duration.value, 10);
        state.quick.duration = isFinite(d) && d >= 5 ? d : 30;
      }
    }

    function chapterChipsHTML(chapters, cls, selected) {
      return chapters
        .map(function (ch) {
          const active = selected.indexOf(ch.id) >= 0;
          return (
            '<button class="chip-toggle' +
            (active ? " active" : "") +
            '" type="button" ' +
            cls +
            '="' +
            U.esc(ch.id) +
            '">' +
            U.esc(ch.name) +
            "</button>"
          );
        })
        .join("");
    }

    function centerHTML(active) {
      const avail = quickAvailability();
      const counts = {
        single: Math.min(state.quick.counts.single, avail.single),
        multiple: Math.min(state.quick.counts.multiple, avail.multiple),
        subjective: Math.min(state.quick.counts.subjective, avail.subjective),
      };
      const quickTotal = counts.single + counts.multiple + counts.subjective;
      const plan = CPA.exam.mockPlan(subject);
      const hasShortage = plan.some(function (sec) {
        return sec.actual < sec.requested;
      });
      const planQuestions = plan.reduce(function (sum, sec) {
        return sum + sec.actual;
      }, 0);
      const doneTests = CPA.store
        .getTests(subject.id)
        .filter(function (t) {
          return t && t.status === "done";
        })
        .sort(function (a, b) {
          return (b.submittedAt || b.createdAt || 0) - (a.submittedAt || a.createdAt || 0);
        });

      const historyHTML = doneTests.length
        ? doneTests
            .slice(0, 12)
            .map(function (t) {
              const r = CPA.exam.scoreSession(t);
              const partial = r.fullySelfGraded ? "" : "*";
              const date = U.formatDate(t.submittedAt || t.createdAt, true);
              return (
                '<div class="record-row">' +
                '<div class="record-main"><b>' +
                U.esc(t.title) +
                '</b><div class="record-meta">' +
                U.esc(CPA.exam.kindLabel(t.kind)) +
                " · " +
                date +
                " · 用时 " +
                U.formatMinutes(r.durationMs) +
                "</div></div>" +
                '<div class="record-score"><b>' +
                r.percent +
                "%" +
                partial +
                "</b><span>" +
                r.totalScore +
                " / " +
                r.maxScore +
                " 分</span></div>" +
                '<div class="record-actions">' +
                '<button class="btn btn-ghost" type="button" data-view="' +
                U.esc(t.id) +
                '">查看</button>' +
                '<button class="btn btn-danger" type="button" data-del="' +
                U.esc(t.id) +
                '">删除</button>' +
                "</div></div>"
              );
            })
            .join("")
        : '<div class="empty-state" style="padding:28px 20px;border:0;background:#fcfcfd"><div class="empty-icon">▤</div><h3>还没有测试记录</h3><p>完成一次快速自测或全真模拟后，成绩会出现在这里。</p></div>';

      const activeBanner = active
        ? '<div class="active-test-banner"><span class="pulse-dot"></span>' +
          '<div class="active-copy"><b>有一场未完成的测试</b><span>' +
          U.esc(active.title) +
          " · 剩余 " +
          CPA.exam.formatClock(active.deadline - Date.now()) +
          " · 已答 " +
          CPA.exam.answeredCount(active) +
          "/" +
          CPA.exam.getSessionItems(active).length +
          "</span></div>" +
          '<div class="active-actions">' +
          '<button class="btn btn-primary btn-sm" type="button" data-resume="' +
          U.esc(active.id) +
          '">继续作答</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-abandon="' +
          U.esc(active.id) +
          '">放弃</button>' +
          "</div></div>"
        : "";

      return (
        '<div class="test-page">' +
        '<section class="test-hero">' +
        '<div class="test-hero-copy"><span class="eyebrow">ASSESSMENT</span><h1>测试中心</h1>' +
        "<p>按当前题库组卷，限时作答。客观题自动判分，主观题交卷后对照参考答案自评；成绩与记录保存在本机。" +
        (subject.stats.placeholder > 0 ? " 当前科目仍含框架占位题，正式内容补齐后会自动替换。" : "") +
        "</p></div>" +
        '<div class="test-hero-side">' +
        "<div><b>" +
        avail.single +
        "</b><span>可用单选</span></div>" +
        "<div><b>" +
        avail.multiple +
        "</b><span>可用多选</span></div>" +
        "<div><b>" +
        avail.subjective +
        "</b><span>可用主观</span></div>" +
        "<div><b>" +
        doneTests.length +
        "</b><span>已完成</span></div>" +
        "</div></section>" +
        activeBanner +
        '<div class="test-center-grid">' +
        "<div>" +
        '<section class="test-card">' +
        '<div class="test-card-head"><div><h2><span class="test-card-icon">◔</span>快速自测</h2><p>自选章节与题量，适合碎片时间检测掌握情况。</p></div></div>' +
        '<div class="test-card-body quick-form">' +
        '<div class="random-block-head"><span>抽题范围</span><div style="display:flex;gap:8px">' +
        '<button class="add-row-btn" type="button" id="qsAllCh">全选章节</button>' +
        '<button class="add-row-btn" type="button" id="qsNoCh">不限章节</button>' +
        "</div></div>" +
        '<div class="chapter-chips" style="margin-bottom:16px">' +
        chapterChipsHTML(subject.chapters, "data-qch", state.quick.chapters) +
        "</div>" +
        '<div class="form-row">' +
        '<label class="field"><span class="field-label">单选题数量</span><input class="input" id="qsSingle" type="number" min="0" max="' +
        avail.single +
        '" value="' +
        counts.single +
        '" /><span class="field-hint">最多 ' +
        avail.single +
        " 题</span></label>" +
        '<label class="field"><span class="field-label">多选题数量</span><input class="input" id="qsMultiple" type="number" min="0" max="' +
        avail.multiple +
        '" value="' +
        counts.multiple +
        '" /><span class="field-hint">最多 ' +
        avail.multiple +
        " 题</span></label>" +
        '<label class="field"><span class="field-label">主观题数量</span><input class="input" id="qsSubjective" type="number" min="0" max="' +
        avail.subjective +
        '" value="' +
        counts.subjective +
        '" /><span class="field-hint">最多 ' +
        avail.subjective +
        " 题</span></label>" +
        "</div>" +
        '<div class="quick-meta">' +
        '<label class="field"><span class="field-label">限时（分钟）</span><input class="input" id="qsDuration" type="number" min="5" max="240" value="' +
        state.quick.duration +
        '" /></label>' +
        '<div class="quick-availability" style="margin:0;align-self:end">当前范围共 <b>' +
        avail.total +
        "</b> 题 · 本次抽 <b>" +
        quickTotal +
        "</b> 题</div>" +
        "</div>" +
        '<div class="quick-actions"><button class="btn btn-primary" type="button" id="qsStart">开始快速自测</button><span class="hint">单选 2 分 / 多选 3 分 / 主观 12 分（示例权重）</span></div>' +
        "</div></section>" +
        '<section class="test-card">' +
        '<div class="test-card-head"><div><h2><span class="test-card-icon">◎</span>全真模拟</h2><p>' +
        U.esc(subject.name) +
        " 科目蓝图组卷 · 建议 " +
        subject.exam.duration +
        " 分钟。</p></div>" +
        '<span class="tag tag-plain">' +
        planQuestions +
        " 题</span></div>" +
        '<div class="test-card-body">' +
        '<table class="blueprint-table"><thead><tr><th>题型</th><th>计划</th><th>可用</th><th>分值/题</th></tr></thead><tbody>' +
        plan
          .map(function (sec) {
            return (
              "<tr><td>" +
              U.esc(sec.name.replace(/^[一二三四五六七八九十]+、/, "")) +
              "</td><td>" +
              sec.requested +
              '</td><td class="' +
              (sec.actual < sec.requested ? "short" : "ok") +
              '">' +
              sec.available +
              "</td><td>" +
              sec.scorePer +
              " 分</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>" +
        (hasShortage
          ? '<div class="mock-note">题库当前题量不足以填满整卷，将按可用题量组卷；补充题目后自动恢复完整结构。</div>'
          : '<div class="mock-note" style="background:#f0fdf4;border:1px solid #d1fadf;color:#05603a">题库量满足当前蓝图，可生成完整模拟卷。</div>') +
        '<div class="mock-actions"><button class="btn btn-primary" type="button" id="mockStart">开始全真模拟</button><span class="hint">' +
        U.esc(subject.exam.note || "") +
        "</span></div>" +
        "</div></section>" +
        "</div>" +
        "<div>" +
        '<section class="test-card">' +
        '<div class="test-card-head"><div><h2><span class="test-card-icon">▤</span>测试记录</h2><p>最近 12 条测试记录，本机最多保留 40 条；带 * 表示含未自评主观题。</p></div></div>' +
        '<div class="test-card-body"><div class="record-list">' +
        historyHTML +
        "</div></div></section>" +
        '<section class="test-card">' +
        '<div class="test-card-head"><div><h2><span class="test-card-icon">ⓘ</span>测试说明</h2><p>关于判分与主观题。</p></div></div>' +
        '<div class="test-card-body"><div class="small muted" style="line-height:1.9">' +
        "· 客观题按标准答案自动判分，多选须完全一致才得分。<br>" +
        "· 主观题不自动判分，交卷后在成绩页按参考答案自评。<br>" +
        "· 中途退出会保留作答进度，可在测试中心继续。<br>" +
        "· 截止时间到达后系统自动交卷。" +
        "</div></div></section>" +
        "</div></div></div>"
      );
    }

    function renderCenter() {
      examMode(false);
      state.session = null;
      state.review = false;
      stopTimer();
      const active = prepareCenter();
      root.innerHTML = centerHTML(active);
      bindCenter(active);
    }

    function bindCenter(active) {
      root.querySelectorAll("[data-qch]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          readQuickForm();
          const id = btn.getAttribute("data-qch");
          const i = state.quick.chapters.indexOf(id);
          if (i >= 0) state.quick.chapters.splice(i, 1);
          else state.quick.chapters.push(id);
          renderCenter();
        });
      });
      const allCh = root.querySelector("#qsAllCh");
      if (allCh)
        allCh.addEventListener("click", function () {
          readQuickForm();
          state.quick.chapters = subject.chapters.map(function (ch) {
            return ch.id;
          });
          renderCenter();
        });
      const noCh = root.querySelector("#qsNoCh");
      if (noCh)
        noCh.addEventListener("click", function () {
          readQuickForm();
          state.quick.chapters = [];
          renderCenter();
        });

      const qsStart = root.querySelector("#qsStart");
      if (qsStart) {
        qsStart.addEventListener("click", function () {
          readQuickForm();
          const avail = quickAvailability();
          const counts = {
            single: Math.min(state.quick.counts.single, avail.single),
            multiple: Math.min(state.quick.counts.multiple, avail.multiple),
            subjective: Math.min(state.quick.counts.subjective, avail.subjective),
          };
          if (counts.single + counts.multiple + counts.subjective === 0) {
            U.toast("请至少设置 1 道题，且当前范围需要有对应题型", "error");
            return;
          }
          const plan = CPA.exam.buildQuick(subject, {
            counts: counts,
            chapterIds: state.quick.chapters,
            duration: state.quick.duration,
          });
          if (!plan.sections.length) {
            U.toast("当前范围没有可用题目", "error");
            return;
          }
          const actual = plan.sections.reduce(function (sum, sec) {
            return sum + sec.questionIds.length;
          }, 0);
          plan.title = "快速自测 · " + actual + " 题";
          beginSession("quick", plan, active);
        });
      }

      const mockStart = root.querySelector("#mockStart");
      if (mockStart) {
        mockStart.addEventListener("click", function () {
          const plan = CPA.exam.buildMock(subject);
          if (!plan.sections.length) {
            U.toast("当前题库没有可用题目，无法组卷", "error");
            return;
          }
          beginSession("mock", plan, active);
        });
      }

      if (active) {
        const resume = root.querySelector("[data-resume]");
        if (resume)
          resume.addEventListener("click", function () {
            CPA.router.go("#/s/" + encodeURIComponent(subject.id) + "/test/" + encodeURIComponent(active.id));
          });
        const abandon = root.querySelector("[data-abandon]");
        if (abandon)
          abandon.addEventListener("click", function () {
            if (!confirm("确定放弃这场未完成的测试吗？作答记录将删除。")) return;
            CPA.store.deleteTest(subject.id, active.id);
            renderCenter();
            U.toast("已放弃未完成的测试");
          });
      }

      root.querySelectorAll("[data-view]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          CPA.router.go(
            "#/s/" + encodeURIComponent(subject.id) + "/test/" + encodeURIComponent(btn.getAttribute("data-view"))
          );
        });
      });
      root.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("确定删除这条测试记录吗？")) return;
          CPA.store.deleteTest(subject.id, btn.getAttribute("data-del"));
          renderCenter();
          U.toast("测试记录已删除");
        });
      });
    }

    function beginSession(kind, plan, active) {
      if (active) {
        if (!confirm("有一场未完成的测试，开始新测试将放弃该场测试。确定继续吗？")) return;
        CPA.store.deleteTest(subject.id, active.id);
      }
      const session = CPA.exam.createSession(subject, kind, plan);
      CPA.store.saveTest(session);
      CPA.router.go("#/s/" + encodeURIComponent(subject.id) + "/test/" + encodeURIComponent(session.id));
    }

    /* ---------------- Exam ---------------- */

    function currentItems(session) {
      return CPA.exam.getSessionItems(session);
    }

    function answeredCount(session) {
      return CPA.exam.answeredCount(session);
    }

    function sheetHTML(session, items, review) {
      let html = "";
      let num = 0;
      const bySection = {};
      items.forEach(function (item, i) {
        if (!bySection[item.sectionIndex]) bySection[item.sectionIndex] = [];
        bySection[item.sectionIndex].push({ item: item, index: i });
      });
      (session.sections || []).forEach(function (sec, si) {
        const list = bySection[si] || [];
        if (!list.length) return;
        html += '<div class="sheet-section"><div class="sheet-title">' + U.esc(sec.name) + "</div><div class=\"sheet-grid\">";
        list.forEach(function (entry) {
          num = entry.index + 1;
          let cls = "sheet-num";
          const a = session.answers[entry.item.q.id];
          if (review) {
            if (CPA.isObjective(entry.item.q.type)) {
              const ev = CPA.exam.evaluate(entry.item.q, a);
              cls += ev.correct === true ? " correct" : ev.answered ? " wrong" : " blank";
            } else {
              cls += CPA.exam.isAnswered(entry.item.q, a) ? " answered" : " blank";
            }
          } else if (CPA.exam.isAnswered(entry.item.q, a)) {
            cls += " answered";
          }
          if (entry.index === state.idx) cls += " current";
          html +=
            '<button class="' +
            cls +
            '" type="button" data-k="' +
            entry.index +
            '" data-qid="' +
            U.esc(entry.item.q.id) +
            '">' +
            num +
            "</button>";
        });
        html += "</div></div>";
      });
      return html;
    }

    function examQuestionHTML(session, items, review) {
      const item = items[state.idx];
      if (!item) return "";
      const q = item.q;
      const a = session.answers[q.id];
      const sel = a && Array.isArray(a.sel) ? a.sel : [];
      const objective = CPA.isObjective(q.type);
      let html = '<article class="exam-question">';
      html += '<div class="q-meta">';
      html += '<span class="q-badge q-badge-type">' + U.esc(CPA.typeLabel(subject, q.type)) + "</span>";
      html += '<span class="q-badge q-badge-year">' + U.esc(item.section.name) + "</span>";
      html +=
        '<span class="q-chapter">第 ' +
        (state.idx + 1) +
        " / " +
        items.length +
        " 题 · " +
        item.scorePer +
        " 分</span>";
      html += "</div>";
      html += '<div class="q-stem">' + U.esc(q.stem) + "</div>";

      if (objective) {
        html += '<div class="options">';
        q.options.forEach(function (opt) {
          const picked = sel.indexOf(opt.key) >= 0;
          let cls = "option" + (picked ? " selected" : "");
          let mark = "";
          if (review) {
            const isCorrect = q.answer.indexOf(opt.key) >= 0;
            if (isCorrect) {
              cls += " correct";
              mark = "✓";
            } else if (picked) {
              cls += " wrong";
              mark = "✗";
            } else {
              cls += " dim";
            }
          }
          html +=
            '<button class="' +
            cls +
            '" type="button" data-letter="' +
            U.esc(opt.key) +
            '"' +
            (review ? " disabled" : "") +
            ">" +
            '<span class="option-letter">' +
            U.esc(opt.key) +
            "</span>" +
            '<span class="option-text">' +
            U.esc(opt.text) +
            "</span>" +
            (mark ? '<span class="option-mark">' + mark + "</span>" : "") +
            "</button>";
        });
        html += "</div>";
        if (review) {
          const ev = CPA.exam.evaluate(q, a);
          const ok = ev.correct === true;
          html +=
            '<div class="answer-banner ' +
            (ok ? "ok" : "no") +
            '" style="margin-top:16px"><span class="answer-strong">' +
            (ok ? "回答正确 ✓" : ev.answered ? "回答错误 ✗" : "未作答") +
            "</span><span>正确答案：<b>" +
            U.esc(q.answer.join("、")) +
            "</b></span><span class=\"answer-spacer\"></span><span>你的答案：" +
            U.esc(sel.join("、") || "未作答") +
            "</span></div>";
          if (q.analysis) {
            html +=
              '<div class="analysis-stack"><div class="analysis-card"><div class="analysis-title">详细解析</div><div class="analysis-body">' +
              U.esc(q.analysis) +
              "</div></div></div>";
          }
        } else {
          html +=
            '<p class="q-hint">' +
            (q.type === "single" ? "单选题：选择一个选项" : "多选题：选择全部正确项（全对才得分）") +
            " · 作答自动保存</p>";
        }
      } else {
        const texts = a && Array.isArray(a.texts) ? a.texts : [];
        if (review) {
          const selfRaw = session.selfScores ? session.selfScores[q.id] : undefined;
          const selfText =
            selfRaw !== undefined && selfRaw !== null && selfRaw !== ""
              ? "自评 " + selfRaw + " / " + item.scorePer + " 分"
              : "未自评";
          html +=
            '<div class="answer-banner neutral" style="margin-top:4px"><span class="answer-strong">主观题</span><span>请对照参考答案核对要点</span><span class="answer-spacer"></span><span>' +
            selfText +
            "</span></div>";
        }
        html += '<div class="subjective-list">';
        q.subs.forEach(function (sub, i) {
          html += '<div class="sub-question">';
          html += '<div class="sub-prompt">' + U.esc(sub.prompt) + "</div>";
          if (review) {
            html += '<div class="my-answer">' + U.esc(texts[i] || "（未作答）") + "</div>";
            html +=
              '<div class="reference"><div class="reference-head">参考答案</div><div class="reference-body">' +
              U.esc(sub.answer || "—") +
              (sub.analysis ? "\n\n" + U.esc(sub.analysis) : "") +
              "</div></div>";
          } else {
            html +=
              '<textarea class="textarea sub-textarea" data-sub="' +
              i +
              '" placeholder="写下你的结论与理由，内容自动保存…">' +
              U.esc(texts[i] || "") +
              "</textarea>";
          }
          html += "</div>";
        });
        html += "</div>";
        if (!review) {
          html += '<p class="q-hint">主观题不计入自动判分，交卷后可对照参考答案自评。</p>';
        } else if (item.scorePer) {
          html += '<p class="q-hint">本题分值：' + item.scorePer + " 分</p>";
        }
      }

      html += "</article>";
      return html;
    }

    function examHTML(session, items) {
      const answered = answeredCount(session);
      return (
        '<div class="test-page">' +
        '<div class="exam-topbar">' +
        '<div class="exam-title"><b>' +
        U.esc(session.title) +
        "</b><span>" +
        U.esc(subject.name) +
        " · " +
        U.esc(CPA.exam.kindLabel(session.kind)) +
        " · 共 " +
        items.length +
        " 题</span></div>" +
        '<div class="exam-topbar-mid">' +
        '<span class="exam-pill">剩余 <b class="exam-clock" id="examClock">' +
        CPA.exam.formatClock(session.deadline - Date.now()) +
        "</b></span>" +
        '<span class="exam-pill">已答 <b id="examAnswered">' +
        answered +
        "</b>/" +
        items.length +
        "</span>" +
        "</div>" +
        '<div class="exam-actions">' +
        '<button class="exam-btn submit" type="button" id="examSubmit">交卷</button>' +
        '<button class="exam-btn" type="button" id="examExit">退出</button>' +
        "</div></div>" +
        '<div class="exam-layout"><div class="exam-main">' +
        examQuestionHTML(session, items, false) +
        '<div class="exam-nav">' +
        '<button class="btn btn-ghost" type="button" id="examPrev"' +
        (state.idx <= 0 ? " disabled" : "") +
        ">← 上一题</button>" +
        '<button class="btn btn-primary" type="button" id="examNext"' +
        (state.idx >= items.length - 1 ? " disabled" : "") +
        ">下一题 →</button>" +
        "</div></div>" +
        '<aside class="exam-side"><div class="answer-sheet' +
        (state.sheetCollapsed ? " collapsed" : "") +
        '" id="answerSheet"><div class="sheet-head"><b>答题卡</b><span>已答 ' +
        answered +
        "/" +
        items.length +
        '</span><button class="sheet-toggle" type="button" id="sheetToggle">展开/收起</button></div>' +
        '<div class="sheet-body">' +
        sheetHTML(session, items, false) +
        "</div>" +
        '<div class="sheet-legend"><span><i style="background:#dbeafe"></i>已答</span><span><i style="background:#fff;border:1px solid #d0d5dd"></i>未答</span><span><i style="background:#1d4ed8"></i>当前</span></div>' +
        "</div></aside></div></div>"
      );
    }

    function renderExam(session) {
      examMode(true);
      state.session = session;
      state.review = false;
      const items = currentItems(session);
      if (!items.length) {
        stopTimer();
        root.innerHTML =
          '<div class="test-page"><div class="empty-state card" style="margin-top:24px"><div class="empty-icon">!</div><h2>试卷题目缺失</h2><p>可能相关题目已被删除，请返回测试中心重新组卷。</p><a class="btn btn-primary" href="' +
          CPA.router.subjectPath(subject.id, "test") +
          '">返回测试中心</a></div></div>';
        return;
      }
      if (state.idx >= items.length) state.idx = items.length - 1;
      if (state.idx < 0) state.idx = 0;
      root.innerHTML = examHTML(session, items);
      bindExam(session, items);
      startTimer(session);
    }

    function updateExamAnsweredUI(session, items) {
      const el = root.querySelector("#examAnswered");
      if (el) el.textContent = answeredCount(session);
      const sheetHead = root.querySelector(".sheet-head span");
      if (sheetHead) sheetHead.textContent = "已答 " + answeredCount(session) + "/" + items.length;
      items.forEach(function (item) {
        const btn = root.querySelector('.sheet-num[data-qid="' + CSS.escape(item.q.id) + '"]');
        if (!btn) return;
        btn.classList.toggle("answered", CPA.exam.isAnswered(item.q, session.answers[item.q.id]));
      });
    }

    function bindExam(session, items) {
      const item = items[state.idx];
      const q = item.q;

      root.querySelectorAll(".option[data-letter]").forEach(function (el) {
        el.addEventListener("click", function () {
          const letter = el.getAttribute("data-letter");
          const prev = session.answers[q.id] || {};
          let sel = Array.isArray(prev.sel) ? prev.sel.slice() : [];
          if (q.type === "single") sel = [letter];
          else if (sel.indexOf(letter) >= 0) sel = sel.filter(function (x) { return x !== letter; });
          else sel.push(letter);
          session.answers[q.id] = Object.assign({}, prev, { sel: sel });
          saveSession(session);
          root.querySelectorAll(".option[data-letter]").forEach(function (op) {
            op.classList.toggle("selected", sel.indexOf(op.getAttribute("data-letter")) >= 0);
          });
          updateExamAnsweredUI(session, items);
        });
      });

      if (!CPA.isObjective(q.type)) {
        const saveTexts = function () {
          const texts = [];
          root.querySelectorAll(".sub-textarea").forEach(function (ta) {
            texts.push(ta.value);
          });
          const prev = session.answers[q.id] || {};
          session.answers[q.id] = Object.assign({}, prev, { texts: texts });
          clearTimeout(state.saveTimer);
          state.saveTimer = setTimeout(function () {
            saveSession(session);
          }, 500);
          updateExamAnsweredUI(session, items);
        };
        root.querySelectorAll(".sub-textarea").forEach(function (ta) {
          ta.addEventListener("input", saveTexts);
          ta.addEventListener("blur", function () {
            saveTexts();
            saveSession(session);
          });
        });
      }

      const prev = root.querySelector("#examPrev");
      if (prev)
        prev.addEventListener("click", function () {
          if (state.idx > 0) {
            saveSession(session);
            state.idx--;
            renderExam(session);
          }
        });
      const next = root.querySelector("#examNext");
      if (next)
        next.addEventListener("click", function () {
          if (state.idx < items.length - 1) {
            saveSession(session);
            state.idx++;
            renderExam(session);
          }
        });

      root.querySelectorAll(".sheet-num").forEach(function (btn) {
        btn.addEventListener("click", function () {
          saveSession(session);
          state.idx = parseInt(btn.getAttribute("data-k"), 10);
          renderExam(session);
        });
      });

      const toggle = root.querySelector("#sheetToggle");
      if (toggle)
        toggle.addEventListener("click", function () {
          state.sheetCollapsed = !state.sheetCollapsed;
          const sheet = root.querySelector("#answerSheet");
          if (sheet) sheet.classList.toggle("collapsed", state.sheetCollapsed);
        });

      const submit = root.querySelector("#examSubmit");
      if (submit)
        submit.addEventListener("click", function () {
          const total = items.length;
          const done = answeredCount(session);
          const blank = total - done;
          const msg =
            "确定交卷吗？" +
            (blank ? "还有 " + blank + " 题未作答，未答题按 0 分计。" : "所有题目均已作答。") +
            "\n\n交卷后将自动判定客观题，主观题需手动自评。";
          if (!confirm(msg)) return;
          saveSession(session);
          finalize(session, false);
        });

      const exit = root.querySelector("#examExit");
      if (exit)
        exit.addEventListener("click", function () {
          const done = answeredCount(session);
          if (done > 0 && !confirm("退出后作答进度会保留，可从测试中心继续。确定退出吗？")) return;
          saveSession(session);
          stopTimer();
          CPA.router.go(CPA.router.subjectPath(subject.id, "test"));
        });
    }

    /* ---------------- Result ---------------- */

    function resultHTML(session, result) {
      const passScore = Number(subject.exam.passScore || 60);
      let passBadge = '<span class="result-badge">主观题待自评</span>';
      if (result.fullySelfGraded) {
        passBadge = result.passed
          ? '<span class="result-badge ok">达到及格线</span>'
          : '<span class="result-badge no">未达及格线</span>';
      }
      const ringColor = result.fullySelfGraded
        ? result.passed
          ? "#6ce9a6"
          : "#fda29b"
        : "#a5b4fc";
      const gradedObjective = result.right + result.wrong;
      const rateText = gradedObjective
        ? Math.round((result.right / gradedObjective) * 100) + "%"
        : "—";
      const selfText = result.subjectiveCount
        ? result.selfScore + " / " + result.selfMax
        : "—";
      const subjectiveCard = result.subjectiveItems.length
        ? '<section class="result-card"><h2>主观题自评</h2><p>对照参考答案为自己打分，保存后计入总分。满分 ' +
          result.selfMax +
          " 分。</p>" +
          '<div class="self-score-list">' +
          result.subjectiveItems
            .map(function (entry, i) {
              const q = entry.item.q;
              const score = entry.selfScore === null ? "" : entry.selfScore;
              return (
                '<div class="self-score-item">' +
                '<div class="self-score-head"><b>第 ' +
                (i + 1) +
                " 题 · " +
                U.esc(CPA.typeLabel(subject, q.type)) +
                "</b>" +
                '<span>满分 ' +
                entry.maxScore +
                ' 分</span></div>' +
                '<div class="self-score-prompt">' +
                U.esc(U.truncate(q.stem, 160)) +
                "</div>" +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="small muted">我的得分</span>' +
                '<input class="self-score-input" type="number" min="0" max="' +
                entry.maxScore +
                '" step="0.5" data-self="' +
                U.esc(q.id) +
                '" value="' +
                score +
                '" /></div>' +
                q.subs
                  .map(function (sub, si) {
                    const myTexts =
                      entry.answer && Array.isArray(entry.answer.texts) ? entry.answer.texts : [];
                    return (
                      '<div class="self-score-prompt">' +
                      U.esc(sub.prompt) +
                      '</div><div class="my-answer">' +
                      U.esc(myTexts[si] || "（未作答）") +
                      '</div><div class="self-score-ref">' +
                      U.esc(sub.answer || "—") +
                      "</div>"
                    );
                  })
                  .join("") +
                "</div>"
              );
            })
            .join("") +
          '</div><div class="self-score-actions"><button class="btn btn-primary btn-sm" type="button" id="saveSelfScores">保存自评</button></div></section>'
        : '<section class="result-card"><h2>主观题自评</h2><p>本卷没有主观题，全部题目均已自动判分。</p><div class="empty-state" style="padding:24px 16px;border:0;background:#fcfcfd"><div class="empty-icon">✓</div><p style="margin:0">客观题得分已计入总成绩</p></div></section>';

      return (
        '<div class="test-page">' +
        '<section class="result-hero"><div class="score-ring" style="--pct:' +
        result.percent +
        ";--ring-color:" +
        ringColor +
        '"><div class="score-ring-inner"><b>' +
        result.percent +
        "%</b><span>总得分率</span></div></div>" +
        '<div class="result-copy"><span class="eyebrow">TEST RESULT</span><h1>' +
        U.esc(session.title) +
        "</h1><p>" +
        U.formatDate(session.submittedAt || Date.now(), true) +
        " · 用时 " +
        U.formatMinutes(result.durationMs) +
        " · " +
        U.esc(CPA.exam.kindLabel(session.kind)) +
        "</p>" +
        '<div class="result-badges"><span class="result-badge">总分 ' +
        result.totalScore +
        " / " +
        result.maxScore +
        "</span>" +
        passBadge +
        '<span class="result-badge">及格线 ' +
        passScore +
        "%</span>" +
        (result.fullySelfGraded ? "" : '<span class="result-badge">含未自评主观题</span>') +
        "</div>" +
        '<div class="result-stats">' +
        "<div><b>" +
        result.autoScore +
        "</b><span>客观题得分 / " +
        result.autoMax +
        "</span></div>" +
        "<div><b>" +
        rateText +
        "</b><span>客观题正确率</span></div>" +
        "<div><b>" +
        selfText +
        "</b><span>主观题自评</span></div>" +
        "<div><b>" +
        result.right +
        "</b><span>答对题数</span></div>" +
        "</div>" +
        '<div class="result-actions">' +
        '<button class="btn btn-light btn-sm" type="button" id="reviewBtn">逐题回顾</button>' +
        '<a class="btn btn-ghost-light btn-sm" href="' +
        CPA.router.subjectPath(subject.id, "test") +
        '">返回测试中心</a>' +
        "</div></div></section>" +
        '<div class="result-grid"><div><section class="result-card"><h2>分项成绩</h2><p>客观题自动判分；主观题按自评分数计入。</p><table class="section-result-table"><thead><tr><th>题型</th><th class="num">题量</th><th class="num">正确/自评</th><th class="num">错误</th><th class="num">未答</th><th class="num">得分</th></tr></thead><tbody>' +
        result.bySection
          .map(function (sec) {
            return (
              "<tr><td>" +
              U.esc(sec.name) +
              '</td><td class="num">' +
              sec.count +
              '</td><td class="num">' +
              (sec.subjective
                ? "自评 " + sec.selfGraded + "/" + sec.subjective
                : sec.right) +
              '</td><td class="num">' +
              (sec.subjective ? "—" : sec.wrong) +
              '</td><td class="num">' +
              (sec.subjective ? "—" : sec.blank) +
              '</td><td class="num">' +
              Math.round(sec.score * 10) / 10 +
              " / " +
              sec.max +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></section>" +
        '<section class="result-card" style="margin-top:18px"><h2>复习建议</h2><p>成绩只代表本次抽题结果，建议结合错题与薄弱题继续巩固。</p><div class="empty-actions" style="justify-content:flex-start"><a class="btn btn-soft btn-sm" href="' +
        CPA.router.subjectPath(subject.id, "practice") +
        '">回到章节练习</a><a class="btn btn-ghost btn-sm" href="' +
        CPA.router.subjectPath(subject.id, "test") +
        '">再测一次</a></div></section></div>' +
        "<div>" +
        subjectiveCard +
        "</div></div></div>"
      );
    }

    function renderResult(session) {
      examMode(false);
      state.session = session;
      state.review = false;
      state.finished = true;
      session.answers = session.answers || {};
      session.selfScores = session.selfScores || {};
      stopTimer();
      const result = CPA.exam.scoreSession(session);
      root.innerHTML = resultHTML(session, result);
      const reviewBtn = root.querySelector("#reviewBtn");
      if (reviewBtn)
        reviewBtn.addEventListener("click", function () {
          state.idx = 0;
          state.review = true;
          renderReview(session);
        });
      const saveScores = root.querySelector("#saveSelfScores");
      if (saveScores)
        saveScores.addEventListener("click", function () {
          const inputs = root.querySelectorAll("[data-self]");
          inputs.forEach(function (input) {
            const qid = input.getAttribute("data-self");
            const raw = input.value;
            if (raw === "") {
              delete session.selfScores[qid];
              return;
            }
            let val = Number(raw);
            if (!isFinite(val)) val = 0;
            const max = Number(input.getAttribute("max")) || 0;
            val = U.clamp(val, 0, max);
            session.selfScores[qid] = Math.round(val * 10) / 10;
          });
          saveSession(session);
          U.toast("自评分数已保存");
          renderResult(session);
        });
    }

    /* ---------------- Review ---------------- */

    function reviewHTML(session, items, result) {
      return (
        '<div class="test-page">' +
        '<div class="review-topbar"><span class="review-title">成绩回顾 · ' +
        U.esc(session.title) +
        '</span><span class="review-score">得分率 ' +
        result.percent +
        "% · " +
        result.totalScore +
        " / " +
        result.maxScore +
        ' 分</span><button class="exam-btn" type="button" id="backResult">返回成绩单</button>' +
        '<a class="exam-btn" href="' +
        CPA.router.subjectPath(subject.id, "test") +
        '">测试中心</a></div>' +
        '<div class="exam-layout"><div class="exam-main">' +
        examQuestionHTML(session, items, true) +
        '<div class="exam-nav">' +
        '<button class="btn btn-ghost" type="button" id="reviewPrev"' +
        (state.idx <= 0 ? " disabled" : "") +
        ">← 上一题</button>" +
        '<button class="btn btn-primary" type="button" id="reviewNext"' +
        (state.idx >= items.length - 1 ? " disabled" : "") +
        ">下一题 →</button>" +
        "</div></div>" +
        '<aside class="exam-side"><div class="answer-sheet' +
        (state.sheetCollapsed ? " collapsed" : "") +
        '" id="answerSheet"><div class="sheet-head"><b>答题卡</b><span>' +
        items.length +
        ' 题</span><button class="sheet-toggle" type="button" id="sheetToggle">展开/收起</button></div><div class="sheet-body">' +
        sheetHTML(session, items, true) +
        "</div>" +
        '<div class="sheet-legend"><span><i style="background:#dcfce7"></i>正确</span><span><i style="background:#fee2e2"></i>错误</span><span><i style="background:#fef3c7"></i>未答</span><span><i style="background:#dbeafe"></i>主观已答</span></div>' +
        "</div></aside></div></div>"
      );
    }

    function renderReview(session) {
      examMode(true);
      state.session = session;
      state.review = true;
      stopTimer();
      const items = currentItems(session);
      const result = CPA.exam.scoreSession(session);
      if (!items.length) {
        renderResult(session);
        return;
      }
      if (state.idx >= items.length) state.idx = items.length - 1;
      root.innerHTML = reviewHTML(session, items, result);
      const back = root.querySelector("#backResult");
      if (back)
        back.addEventListener("click", function () {
          renderResult(session);
        });
      const prev = root.querySelector("#reviewPrev");
      if (prev)
        prev.addEventListener("click", function () {
          if (state.idx > 0) {
            state.idx--;
            renderReview(session);
          }
        });
      const next = root.querySelector("#reviewNext");
      if (next)
        next.addEventListener("click", function () {
          if (state.idx < items.length - 1) {
            state.idx++;
            renderReview(session);
          }
        });
      root.querySelectorAll(".sheet-num").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.idx = parseInt(btn.getAttribute("data-k"), 10);
          renderReview(session);
        });
      });
      const toggle = root.querySelector("#sheetToggle");
      if (toggle)
        toggle.addEventListener("click", function () {
          state.sheetCollapsed = !state.sheetCollapsed;
          const sheet = root.querySelector("#answerSheet");
          if (sheet) sheet.classList.toggle("collapsed", state.sheetCollapsed);
        });
    }

    /* ---------------- Entry ---------------- */

    const routeTestId = ctx.route.testId;
    if (routeTestId) {
      const session = CPA.store.getTest(subject.id, routeTestId);
      if (!session) {
        examMode(false);
        root.innerHTML =
          '<div class="test-page"><div class="empty-state card" style="margin-top:24px"><div class="empty-icon">?</div><h2>未找到这场测试</h2><p>记录可能已被删除，或链接已失效。</p><a class="btn btn-primary" href="' +
          CPA.router.subjectPath(subject.id, "test") +
          '">返回测试中心</a></div></div>';
      } else if (session.status === "active") {
        if (CPA.exam.isExpired(session)) {
          finalize(session, true);
        } else {
          state.idx = 0;
          state.finished = false;
          renderExam(session);
        }
      } else {
        state.idx = 0;
        state.finished = true;
        renderResult(session);
      }
    } else {
      renderCenter();
    }

    return {
      destroy: function () {
        if (state.session && state.session.status === "active") {
          saveSession(state.session);
        }
        stopTimer();
        examMode(false);
      },
    };
  }

  CPA.views = CPA.views || {};
  CPA.views.test = { mount: mount };
})();
