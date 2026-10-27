/* CPA 统一题库 · 题目录入与管理 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  function mount(root, ctx) {
    const subject = ctx.subject;
    const state = {
      tab: "new",
      editingId: null,
      form: null,
      errors: [],
      savedMsg: "",
      filter: { type: "all", chapterId: "all", keyword: "" },
      importText: "",
      importResult: null,
    };

    function firstChapter() {
      return subject.chapters[0] || { id: "general", knowledgePoints: [{ id: "general-k1", name: "待整理" }] };
    }

    function blankForm(type, chapterId, kpId) {
      const ch =
        subject.chapters.find(function (c) {
          return c.id === chapterId;
        }) || firstChapter();
      const kp =
        (ch.knowledgePoints || []).find(function (k) {
          return k.id === kpId;
        }) || (ch.knowledgePoints || [])[0] || { id: ch.id + "-k1", name: "核心考点" };
      return {
        type: type && subject.questionTypes.indexOf(type) >= 0 ? type : subject.questionTypes[0] || "single",
        chapterId: ch.id,
        kpId: kp.id,
        stem: "",
        year: "",
        source: "",
        analysis: "",
        knowledgePoint: "",
        tip: "",
        options: [
          { key: "A", text: "", analysis: "" },
          { key: "B", text: "", analysis: "" },
          { key: "C", text: "", analysis: "" },
          { key: "D", text: "", analysis: "" },
        ],
        answer: [],
        subs: [{ prompt: "", answer: "", analysis: "" }],
        score: 10,
      };
    }

    function formFromQuestion(q) {
      const ch =
        subject.chapters.find(function (c) {
          return c.id === q.chapterId;
        }) || firstChapter();
      const kp =
        (ch.knowledgePoints || []).find(function (k) {
          return k.id === q.kpId;
        }) || (ch.knowledgePoints || [])[0] || { id: ch.id + "-k1", name: "核心考点" };
      const nq = CPA.normalizeQuestion(q, {
        subjectId: subject.id,
        chapterId: ch.id,
        kpId: kp.id,
      });
      const options = nq.options.length
        ? nq.options.map(function (opt) {
            return {
              key: opt.key,
              text: opt.text,
              analysis: (nq.optionAnalysis && nq.optionAnalysis[opt.key]) || "",
            };
          })
        : [
            { key: "A", text: "", analysis: "" },
            { key: "B", text: "", analysis: "" },
            { key: "C", text: "", analysis: "" },
            { key: "D", text: "", analysis: "" },
          ];
      return {
        type: nq.type,
        chapterId: ch.id,
        kpId: kp.id,
        stem: nq.stem,
        year: nq.year || "",
        source: nq.source || "",
        analysis: nq.analysis || "",
        knowledgePoint: nq.knowledgePoint || "",
        tip: nq.tip || "",
        options: options,
        answer: nq.answer.slice(),
        subs: nq.subs.length ? nq.subs.map(function (s) { return { prompt: s.prompt, answer: s.answer, analysis: s.analysis }; }) : [{ prompt: "", answer: "", analysis: "" }],
        score: nq.score || 10,
      };
    }

    state.form = blankForm();

    root.innerHTML =
      '<div class="entry-page">' +
      '<header class="entry-head"><div><span class="eyebrow">QUESTION ENTRY</span><h1>题目录入</h1>' +
      "<p>为《" +
      U.esc(subject.name) +
      "》补充题目。自建题保存在本机，保存后立即进入练习与组卷；正式题库也可直接写入 data/subjects 数据文件。</p></div>" +
      '<div class="entry-head-stats">' +
      '<div><b id="entryStatTotal">' +
      subject.stats.total +
      "</b><span>题库总数</span></div>" +
      '<div><b id="entryStatPlaceholder">' +
      subject.stats.placeholder +
      "</b><span>占位题</span></div>" +
      '<div><b id="entryStatUser">' +
      subject.stats.user +
      "</b><span>自建题</span></div>" +
      "</div></header>" +
      '<div class="entry-tabs" role="tablist">' +
      '<button class="entry-tab active" type="button" data-tab="new">录入题目</button>' +
      '<button class="entry-tab" type="button" data-tab="manage">题库管理</button>' +
      '<button class="entry-tab" type="button" data-tab="import">批量导入</button>' +
      '<button class="entry-tab" type="button" data-tab="api">接入说明</button>' +
      "</div>" +
      '<div id="entryContent"></div>' +
      "</div>";

    const content = root.querySelector("#entryContent");

    function updateHeadStats() {
      const total = root.querySelector("#entryStatTotal");
      const placeholder = root.querySelector("#entryStatPlaceholder");
      const user = root.querySelector("#entryStatUser");
      if (total) total.textContent = subject.stats.total;
      if (placeholder) placeholder.textContent = subject.stats.placeholder;
      if (user) user.textContent = subject.stats.user;
    }

    function switchTab(tab) {
      state.tab = tab;
      state.errors = [];
      if (tab !== "new") state.savedMsg = "";
      renderTab();
    }

    function chapterOptions(selected) {
      return subject.chapters
        .map(function (ch) {
          return (
            '<option value="' +
            U.esc(ch.id) +
            '"' +
            (ch.id === selected ? " selected" : "") +
            ">" +
            U.esc(ch.name) +
            "</option>"
          );
        })
        .join("");
    }

    function kpOptions(chapter, selected) {
      return (chapter.knowledgePoints || [])
        .map(function (kp) {
          return (
            '<option value="' +
            U.esc(kp.id) +
            '"' +
            (kp.id === selected ? " selected" : "") +
            ">" +
            U.esc(kp.name) +
            "</option>"
          );
        })
        .join("");
    }

    function typeSegHTML() {
      return subject.questionTypes
        .map(function (type) {
          return (
            '<button class="type-btn' +
            (state.form.type === type ? " active" : "") +
            '" type="button" data-type="' +
            U.esc(type) +
            '">' +
            U.esc(CPA.typeLabel(subject, type)) +
            "</button>"
          );
        })
        .join("");
    }

    function optionEditorHTML() {
      let html = '<div class="option-editor">';
      state.form.options.forEach(function (opt, i) {
        html +=
          '<div class="option-editor-row"><span class="option-key">' +
          U.esc(opt.key) +
          "</span>" +
          '<input class="input" data-opt-index="' +
          i +
          '" data-opt-field="text" value="' +
          U.esc(opt.text) +
          '" placeholder="选项 ' +
          U.esc(opt.key) +
          ' 内容" />' +
          '<button class="option-del" type="button" data-del-opt="' +
          i +
          '" title="删除此选项"' +
          (state.form.options.length <= 2 ? " disabled" : "") +
          ">×</button></div>";
      });
      html += "</div>";
      html +=
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px">' +
        '<button class="add-row-btn" type="button" id="addOption"' +
        (state.form.options.length >= 8 ? " disabled" : "") +
        ">＋ 添加选项</button>" +
        '<span class="small muted">单选 1 个答案 · 多选 2 个及以上答案</span></div>';
      return html;
    }

    function answerPickerHTML() {
      const single = state.form.type === "single";
      let html = '<div class="answer-picker" style="margin-top:14px">';
      state.form.options.forEach(function (opt) {
        const checked = state.form.answer.indexOf(opt.key) >= 0;
        html +=
          '<label class="answer-choice' +
          (checked ? " checked" : "") +
          '"><input type="' +
          (single ? "radio" : "checkbox") +
          '" name="answerPick" data-answer="' +
          U.esc(opt.key) +
          '"' +
          (checked ? " checked" : "") +
          " /> " +
          U.esc(opt.key) +
          "</label>";
      });
      html += "</div>";
      return html;
    }

    function optionAnalysisHTML() {
      let html =
        '<div style="margin-top:16px"><div class="field-label" style="margin-bottom:7px">逐选项解析 <span class="muted" style="font-weight:400">（选填）</span></div><div class="opt-analysis-grid">';
      state.form.options.forEach(function (opt, i) {
        html +=
          '<input class="input" data-opt-index="' +
          i +
          '" data-opt-field="analysis" value="' +
          U.esc(opt.analysis) +
          '" placeholder="选项 ' +
          U.esc(opt.key) +
          ' 正确/错误理由" />';
      });
      html += "</div></div>";
      return html;
    }

    function subsEditorHTML() {
      let html = '<div class="sub-editor">';
      state.form.subs.forEach(function (sub, i) {
        html +=
          '<div class="sub-editor-item"><div class="sub-editor-head"><b>设问 ' +
          (i + 1) +
          '</b><button class="option-del" type="button" data-del-sub="' +
          i +
          '" title="删除此设问"' +
          (state.form.subs.length <= 1 ? " disabled" : "") +
          ">×</button></div>" +
          '<textarea class="textarea" rows="2" data-sub-index="' +
          i +
          '" data-sub-field="prompt" placeholder="设问：如「该事项是否合法？并说明理由。」">' +
          U.esc(sub.prompt) +
          "</textarea>" +
          '<textarea class="textarea" rows="3" data-sub-index="' +
          i +
          '" data-sub-field="answer" placeholder="参考答案（必填）">' +
          U.esc(sub.answer) +
          "</textarea>" +
          '<input class="input" data-sub-index="' +
          i +
          '" data-sub-field="analysis" value="' +
          U.esc(sub.analysis) +
          '" placeholder="评分要点 / 补充说明（选填）" /></div>';
      });
      html += "</div>";
      html +=
        '<button class="add-row-btn" type="button" id="addSub" style="margin-top:9px">＋ 添加设问</button>';
      return html;
    }

    function formHTML() {
      const ch =
        subject.chapters.find(function (c) {
          return c.id === state.form.chapterId;
        }) || firstChapter();
      const objective = CPA.isObjective(state.form.type);
      const editing = !!state.editingId;
      let html = "";
      if (state.errors.length) {
        html +=
          '<div class="form-errors"><b>请先修正以下问题：</b><ul>' +
          state.errors.map(function (err) { return "<li>" + U.esc(err) + "</li>"; }).join("") +
          "</ul></div>";
      }
      if (state.savedMsg) {
        html +=
          '<div class="import-result ok" id="savedMsg">' +
          U.esc(state.savedMsg) +
          ' <a href="#" data-tomanage style="font-weight:700;text-decoration:underline">查看题库管理</a></div>';
      }

      html += '<div class="entry-layout"><div>';
      html +=
        '<section class="form-card"><div class="form-section-head"><h2>' +
        (editing ? "编辑题目" : "新建题目") +
        '</h2><span>当前科目：' +
        U.esc(subject.name) +
        "</span></div>" +
        '<div class="type-seg">' +
        typeSegHTML() +
        "</div>" +
        '<div class="form-grid">' +
        '<label class="field"><span class="field-label">所属章节</span><select class="select" data-field="chapterId">' +
        chapterOptions(state.form.chapterId) +
        "</select></label>" +
        '<label class="field"><span class="field-label">知识点</span><select class="select" data-field="kpId">' +
        kpOptions(ch, state.form.kpId) +
        "</select></label>" +
        '<label class="field"><span class="field-label">年份（选填）</span><input class="input" data-field="year" type="text" value="' +
        U.esc(state.form.year) +
        '" placeholder="如 2024；自编题可留空" /></label>' +
        '<label class="field"><span class="field-label">来源（选填）</span><input class="input" data-field="source" type="text" value="' +
        U.esc(state.form.source) +
        '" placeholder="如 2024 真题 / 自编 / 轻一" /></label>' +
        "</div></section>";

      html +=
        '<section class="form-card"><div class="form-section-head"><h2>题干与' +
        (objective ? "选项" : "设问") +
        '</h2><span>' +
        U.esc(CPA.typeLabel(subject, state.form.type)) +
        "</span></div>" +
        '<div class="field"><label class="field-label">题干 / 材料</label><textarea class="textarea" rows="5" data-field="stem" placeholder="' +
        (objective ? "请输入完整题干，保留必要的前提条件与限定语。" : "请输入案例背景或材料，再在下方添加设问。") +
        '">' +
        U.esc(state.form.stem) +
        "</textarea></div>";

      if (objective) {
        html +=
          '<div style="margin-top:18px"><div class="form-section-head" style="margin-bottom:9px"><h2 style="font-size:13px">选项</h2><span>至少 2 项，最多 8 项</span></div>' +
          optionEditorHTML() +
          answerPickerHTML() +
          optionAnalysisHTML() +
          "</div>";
      } else {
        html +=
          '<div class="form-grid" style="margin-top:16px"><label class="field"><span class="field-label">本题分值（选填）</span><input class="input" data-field="score" type="number" min="0" step="1" value="' +
          U.esc(state.form.score) +
          '" placeholder="如 10" /></label></div>' +
          '<div style="margin-top:16px"><div class="form-section-head" style="margin-bottom:9px"><h2 style="font-size:13px">设问</h2><span>每问需填写设问与参考答案</span></div>' +
          subsEditorHTML() +
          "</div>";
      }
      html += "</section>";

      html +=
        '<section class="form-card"><div class="form-section-head"><h2>解析与提示</h2><span>帮助学生理解考点</span></div>' +
        '<div class="form-grid">' +
        '<label class="field span-2"><span class="field-label">考察知识点</span><input class="input" data-field="knowledgePoint" value="' +
        U.esc(state.form.knowledgePoint) +
        '" placeholder="如：法律渊源的位阶与制定主体" /></label>' +
        '<label class="field span-2"><span class="field-label">快速记忆 / 技巧（选填）</span><input class="input" data-field="tip" value="' +
        U.esc(state.form.tip) +
        '" placeholder="如：口诀、对比表、易错提醒" /></label>' +
        '<label class="field span-2"><span class="field-label">详细解析</span><textarea class="textarea" rows="4" data-field="analysis" placeholder="说明正确答案的依据，以及错误选项的常见误区。">' +
        U.esc(state.form.analysis) +
        "</textarea></label>" +
        "</div>" +
        '<div class="form-actions">' +
        '<button class="btn btn-primary" type="button" id="saveQuestion">' +
        (editing ? "保存修改" : "保存题目") +
        "</button>" +
        (editing
          ? '<button class="btn btn-ghost" type="button" id="cancelEdit">取消编辑</button>'
          : "") +
        '<span class="form-msg">自建题保存后立即出现在练习与测试中。</span>' +
        "</div></section>";
      html += "</div>";

      html +=
        '<aside class="entry-side">' +
        '<section class="side-card"><h2>录入规范</h2><p>保持题干与答案完整，系统会自动校验。</p><div class="side-stat-list">' +
        '<div class="side-stat-row"><span>题干 / 材料</span><b>必填</b></div>' +
        '<div class="side-stat-row"><span>选择题选项</span><b>2 – 8 项</b></div>' +
        '<div class="side-stat-row"><span>单选答案</span><b>仅 1 项</b></div>' +
        '<div class="side-stat-row"><span>多选答案</span><b>≥ 1 项</b></div>' +
        '<div class="side-stat-row"><span>主观题设问</span><b>设问 + 答案</b></div>' +
        "</div></section>" +
        '<section class="side-card" style="margin-top:16px"><h2>当前科目</h2><p>' +
        U.esc(subject.fullName) +
        "</p><div class=\"side-stat-list\">" +
        '<div class="side-stat-row"><span>章节 / 知识点</span><b>' +
        subject.stats.chapters +
        " / " +
        subject.stats.kps +
        "</b></div>" +
        '<div class="side-stat-row"><span>题库总题量</span><b>' +
        subject.stats.total +
        "</b></div>" +
        '<div class="side-stat-row"><span>正式题目</span><b>' +
        subject.stats.real +
        "</b></div>" +
        '<div class="side-stat-row"><span>自建题目</span><b>' +
        subject.stats.user +
        "</b></div>" +
        "</div></section>" +
        '<section class="side-card" style="margin-top:16px"><h2>批量维护</h2><p>大量题目建议直接写入科目数据文件，随页面加载自动注册；也可在「批量导入」中粘贴 JSON。</p>' +
        '<button class="btn btn-ghost btn-sm btn-block" type="button" data-goto-tab="import">前往批量导入</button></section>' +
        "</aside></div>";
      return html;
    }

    function syncForm() {
      const form = state.form;
      const field = function (name) {
        const el = content.querySelector('[data-field="' + name + '"]');
        return el ? el.value : undefined;
      };
      if (field("chapterId") !== undefined) form.chapterId = field("chapterId");
      if (field("kpId") !== undefined) form.kpId = field("kpId");
      if (field("stem") !== undefined) form.stem = field("stem");
      if (field("year") !== undefined) form.year = field("year");
      if (field("source") !== undefined) form.source = field("source");
      if (field("analysis") !== undefined) form.analysis = field("analysis");
      if (field("knowledgePoint") !== undefined) form.knowledgePoint = field("knowledgePoint");
      if (field("tip") !== undefined) form.tip = field("tip");
      if (field("score") !== undefined) form.score = field("score");
      content.querySelectorAll("[data-opt-index]").forEach(function (el) {
        const i = parseInt(el.getAttribute("data-opt-index"), 10);
        const key = el.getAttribute("data-opt-field");
        if (form.options[i] && key) form.options[i][key] = el.value;
      });
      content.querySelectorAll("[data-sub-index]").forEach(function (el) {
        const i = parseInt(el.getAttribute("data-sub-index"), 10);
        const key = el.getAttribute("data-sub-field");
        if (form.subs[i] && key) form.subs[i][key] = el.value;
      });
      const checked = content.querySelectorAll("[data-answer]:checked");
      form.answer = Array.prototype.map.call(checked, function (el) {
        return el.getAttribute("data-answer");
      });
    }

    function bindForm() {
      content.querySelectorAll("[data-type]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          syncForm();
          const nextType = btn.getAttribute("data-type");
          if (nextType !== state.form.type) {
            state.form.type = nextType;
            state.form.answer = [];
          }
          state.errors = [];
          state.savedMsg = "";
          renderTab();
        });
      });

      const chapterSelect = content.querySelector('[data-field="chapterId"]');
      if (chapterSelect) {
        chapterSelect.addEventListener("change", function () {
          syncForm();
          const ch =
            subject.chapters.find(function (c) {
              return c.id === chapterSelect.value;
            }) || firstChapter();
          state.form.chapterId = ch.id;
          state.form.kpId = (ch.knowledgePoints[0] || { id: ch.id + "-k1" }).id;
          state.errors = [];
          renderTab();
        });
      }

      content.querySelectorAll("[data-answer]").forEach(function (input) {
        input.addEventListener("change", function () {
          const checked = content.querySelectorAll("[data-answer]:checked");
          state.form.answer = Array.prototype.map.call(checked, function (el) {
            return el.getAttribute("data-answer");
          });
          content.querySelectorAll(".answer-choice").forEach(function (label) {
            const cb = label.querySelector("input");
            label.classList.toggle("checked", !!(cb && cb.checked));
          });
        });
      });

      const addOption = content.querySelector("#addOption");
      if (addOption)
        addOption.addEventListener("click", function () {
          syncForm();
          if (state.form.options.length >= 8) return;
          state.form.options.push({
            key: String.fromCharCode(65 + state.form.options.length),
            text: "",
            analysis: "",
          });
          renderTab();
        });

      content.querySelectorAll("[data-del-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          syncForm();
          if (state.form.options.length <= 2) return;
          const idx = parseInt(btn.getAttribute("data-del-opt"), 10);
          const oldKeys = state.form.options.map(function (o) { return o.key; });
          const removed = oldKeys[idx];
          state.form.options.splice(idx, 1);
          state.form.options.forEach(function (o, i) {
            o.key = String.fromCharCode(65 + i);
          });
          state.form.answer = state.form.answer
            .map(function (answerKey) {
              if (answerKey === removed) return null;
              const oldIndex = oldKeys.indexOf(answerKey);
              if (oldIndex < 0) return null;
              const nextIndex = oldIndex > idx ? oldIndex - 1 : oldIndex;
              return state.form.options[nextIndex] ? state.form.options[nextIndex].key : null;
            })
            .filter(Boolean);
          renderTab();
        });
      });

      const addSub = content.querySelector("#addSub");
      if (addSub)
        addSub.addEventListener("click", function () {
          syncForm();
          state.form.subs.push({ prompt: "", answer: "", analysis: "" });
          renderTab();
        });

      content.querySelectorAll("[data-del-sub]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          syncForm();
          if (state.form.subs.length <= 1) return;
          state.form.subs.splice(parseInt(btn.getAttribute("data-del-sub"), 10), 1);
          renderTab();
        });
      });

      content.querySelectorAll("[data-goto-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          switchTab(btn.getAttribute("data-goto-tab"));
        });
      });

      const savedLink = content.querySelector("[data-tomanage]");
      if (savedLink)
        savedLink.addEventListener("click", function (e) {
          e.preventDefault();
          switchTab("manage");
        });

      const save = content.querySelector("#saveQuestion");
      if (save) save.addEventListener("click", saveQuestion);
      const cancel = content.querySelector("#cancelEdit");
      if (cancel)
        cancel.addEventListener("click", function () {
          state.editingId = null;
          state.form = blankForm();
          state.errors = [];
          state.savedMsg = "";
          state.tab = "manage";
          renderTab();
        });
    }

    function saveQuestion() {
      syncForm();
      const form = state.form;
      const chapter =
        subject.chapters.find(function (ch) {
          return ch.id === form.chapterId;
        }) || firstChapter();
      const kp =
        chapter.knowledgePoints.find(function (k) {
          return k.id === form.kpId;
        }) || chapter.knowledgePoints[0];
      const errors = [];
      if (!chapter || !kp) errors.push("请选择章节与知识点");
      if (!form.stem.trim()) errors.push("题干 / 材料不能为空");

      const objective = CPA.isObjective(form.type);
      let subs = [];
      if (!objective) {
        subs = form.subs.filter(function (s) {
          return s.prompt.trim() || s.answer.trim() || s.analysis.trim();
        });
        if (!subs.length) subs = [{ prompt: "", answer: "", analysis: "" }];
      }
      const payload = {
        type: form.type,
        chapterId: chapter.id,
        kpId: kp.id,
        stem: form.stem.trim(),
        year: form.year.trim() || null,
        source: form.source.trim() || "自建",
        analysis: form.analysis.trim(),
        knowledgePoint: form.knowledgePoint.trim(),
        tip: form.tip.trim(),
        score: Number(form.score) || 0,
        options: objective
          ? form.options.map(function (opt) {
              return { key: opt.key, text: opt.text.trim() };
            })
          : [],
        answer: objective ? form.answer.slice() : [],
        optionAnalysis: null,
        subs: objective ? [] : subs.map(function (s) {
          return { prompt: s.prompt.trim(), answer: s.answer.trim(), analysis: s.analysis.trim() };
        }),
      };
      if (objective) {
        const map = {};
        form.options.forEach(function (opt) {
          if (opt.analysis.trim()) map[opt.key] = opt.analysis.trim();
        });
        if (Object.keys(map).length) payload.optionAnalysis = map;
      }

      const validation = CPA.validateQuestion(payload);
      if (validation.errors.length) {
        state.errors = errors.concat(validation.errors);
        renderTab();
        setTimeout(function () {
          const box = content.querySelector(".form-errors");
          if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 40);
        return;
      }
      if (errors.length) {
        state.errors = errors;
        renderTab();
        return;
      }

      const wasEditing = !!state.editingId;
      if (state.editingId) {
        const updated = CPA.store.updateUserQuestion(subject.id, state.editingId, payload);
        if (!updated) {
          state.errors = ["题目不存在或已被删除，请刷新后重试。"];
          renderTab();
          return;
        }
      } else {
        CPA.store.addUserQuestion(subject.id, payload);
      }
      CPA.rebuildSubject(subject);
      CPA.app.refreshChrome();
      updateHeadStats();

      state.errors = [];
      state.savedMsg = "已保存题目：" + U.truncate(payload.stem, 42);
      if (state.editingId) {
        state.editingId = null;
        state.form = blankForm(payload.type, payload.chapterId, payload.kpId);
        state.tab = "manage";
      } else {
        state.form = blankForm(payload.type, payload.chapterId, payload.kpId);
      }
      renderTab();
      U.toast(wasEditing ? "题目已更新" : "题目已保存，已加入题库", "success");
    }

    function renderNew() {
      content.innerHTML = formHTML();
      bindForm();
    }

    function statusLabel(q) {
      return CPA.typeLabel(subject, q.type);
    }

    function locate(q) {
      const chapter =
        subject.chapters.find(function (c) {
          return c.id === q.chapterId;
        }) || null;
      const kp = chapter
        ? chapter.knowledgePoints.find(function (k) {
            return k.id === q.kpId;
          })
        : null;
      return { chapter: chapter, kp: kp };
    }

    function manageShellHTML() {
      const typeOpts =
        '<option value="all">全部题型</option>' +
        subject.questionTypes
          .map(function (t) {
            return '<option value="' + U.esc(t) + '">' + U.esc(CPA.typeLabel(subject, t)) + "</option>";
          })
          .join("");
      const chapterOpts =
        '<option value="all">全部章节</option>' +
        subject.chapters
          .map(function (ch) {
            return '<option value="' + U.esc(ch.id) + '">' + U.esc(ch.name) + "</option>";
          })
          .join("");
      return (
        '<section class="form-card">' +
        '<div class="form-section-head"><h2>自建题目</h2><span>仅显示通过本机录入的题目</span></div>' +
        '<div class="manage-toolbar">' +
        '<select class="select" id="filterType">' +
        typeOpts +
        "</select>" +
        '<select class="select" id="filterChapter">' +
        chapterOpts +
        "</select>" +
        '<input class="input" id="filterKeyword" placeholder="搜索题干 / 来源…" value="' +
        U.esc(state.filter.keyword) +
        '" />' +
        '<button class="btn btn-primary btn-sm" type="button" id="newFromManage">＋ 新建题目</button>' +
        "</div>" +
        '<div id="manageList"></div>' +
        '<p class="small muted" style="margin:14px 0 0">题库中另有 ' +
        (subject.stats.total - subject.stats.user) +
        " 道数据文件 / 占位题，不在此列表；如需批量维护，请编辑 data/subjects 下的数据文件或使用批量导入。</p>" +
        "</section>"
      );
    }

    function filteredUserQuestions() {
      return CPA.store
        .getUserQuestions(subject.id)
        .filter(function (q) {
          if (!q) return false;
          if (state.filter.type !== "all" && q.type !== state.filter.type) return false;
          if (state.filter.chapterId !== "all" && q.chapterId !== state.filter.chapterId) return false;
          const kw = state.filter.keyword.trim().toLowerCase();
          if (!kw) return true;
          return (
            String(q.stem || "").toLowerCase().indexOf(kw) >= 0 ||
            String(q.source || "").toLowerCase().indexOf(kw) >= 0 ||
            String(q.knowledgePoint || "").toLowerCase().indexOf(kw) >= 0
          );
        })
        .sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
    }

    function renderManageList() {
      const listEl = content.querySelector("#manageList");
      if (!listEl) return;
      const list = filteredUserQuestions();
      if (!list.length) {
        const hasAny = CPA.store.getUserQuestions(subject.id).length > 0;
        listEl.innerHTML =
          '<div class="empty-state" style="padding:34px 20px"><div class="empty-icon">' +
          (hasAny ? "⌕" : "＋") +
          "</div><h3>" +
          (hasAny ? "没有匹配的题目" : "还没有自建题目") +
          "</h3><p>" +
          (hasAny ? "调整筛选条件，或新建一道题目。" : "通过左侧「录入题目」表单添加，或在「批量导入」中粘贴 JSON。") +
          '</p><div class="empty-actions"><button class="btn btn-primary btn-sm" type="button" data-new-q>新建题目</button></div></div>';
        bindManageList();
        return;
      }
      listEl.innerHTML =
        '<div class="user-q-list">' +
        list
          .map(function (q) {
            const loc = locate(q);
            return (
              '<div class="user-q-item"><div class="user-q-main"><b><span class="tag tag-accent">' +
              U.esc(statusLabel(q)) +
              "</span>" +
              (q.placeholder ? '<span class="tag tag-warn">占位</span>' : "") +
              "</b><div class=\"user-q-stem\">" +
              U.esc(q.stem || "（无题干）") +
              '</div><div class="user-q-meta">' +
              U.esc(loc.chapter ? loc.chapter.name : "未分类") +
              (loc.kp ? " · " + U.esc(loc.kp.name) : "") +
              " · " +
              U.esc(q.source || "自建") +
              " · 更新于 " +
              U.formatDate(q.updatedAt, true) +
              "</div></div>" +
              '<div class="user-q-actions"><button class="btn btn-ghost" type="button" data-edit="' +
              U.esc(q.id) +
              '">编辑</button><button class="btn btn-danger" type="button" data-delete="' +
              U.esc(q.id) +
              '">删除</button></div></div>'
            );
          })
          .join("") +
        "</div>";
      bindManageList();
    }

    function bindManageList() {
      content.querySelectorAll("[data-new-q]").forEach(function (btn) {
        btn.addEventListener("click", newQuestion);
      });
      content.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const id = btn.getAttribute("data-edit");
          const q = CPA.store.getUserQuestions(subject.id).find(function (item) {
            return item && item.id === id;
          });
          if (!q) {
            U.toast("题目不存在", "error");
            return;
          }
          state.form = formFromQuestion(q);
          state.editingId = q.id;
          state.errors = [];
          state.savedMsg = "";
          state.tab = "new";
          renderTab();
          window.scrollTo(0, 0);
        });
      });
      content.querySelectorAll("[data-delete]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const id = btn.getAttribute("data-delete");
          const q = CPA.store.getUserQuestions(subject.id).find(function (item) {
            return item && item.id === id;
          });
          if (!confirm("确定删除这道自建题目吗？\n\n" + U.truncate((q && q.stem) || "", 60))) return;
          CPA.store.deleteUserQuestion(subject.id, id);
          CPA.rebuildSubject(subject);
          CPA.app.refreshChrome();
          updateHeadStats();
          renderTab();
          U.toast("题目已删除");
        });
      });
    }

    function newQuestion() {
      state.form = blankForm();
      state.editingId = null;
      state.errors = [];
      state.savedMsg = "";
      state.tab = "new";
      renderTab();
      window.scrollTo(0, 0);
    }

    function renderManage() {
      content.innerHTML = manageShellHTML();
      const typeSel = content.querySelector("#filterType");
      const chSel = content.querySelector("#filterChapter");
      const kw = content.querySelector("#filterKeyword");
      typeSel.value = state.filter.type;
      chSel.value = state.filter.chapterId;
      typeSel.addEventListener("change", function () {
        state.filter.type = typeSel.value;
        renderManageList();
      });
      chSel.addEventListener("change", function () {
        state.filter.chapterId = chSel.value;
        renderManageList();
      });
      kw.addEventListener("input", function () {
        state.filter.keyword = kw.value;
        renderManageList();
      });
      const newBtn = content.querySelector("#newFromManage");
      if (newBtn) newBtn.addEventListener("click", newQuestion);
      renderManageList();
    }

    function examplePayload() {
      const ch = firstChapter();
      const kp = ch.knowledgePoints[0];
      const subjective = subject.primarySubjectiveType || "case";
      return {
        subjectId: subject.id,
        questions: [
          {
            type: "single",
            chapterId: ch.id,
            kpId: kp.id,
            stem: "示例：下列各项中，符合题意的是（ ）。",
            options: [
              { key: "A", text: "选项 A（请替换为正式内容）" },
              { key: "B", text: "选项 B（请替换为正式内容）" },
              { key: "C", text: "选项 C（请替换为正式内容）" },
              { key: "D", text: "选项 D（请替换为正式内容）" },
            ],
            answer: "A",
            analysis: "示例解析：请替换为正式解析。",
            knowledgePoint: kp.name,
            source: "批量导入示例",
            year: "2026",
          },
          {
            type: subjective,
            chapterId: ch.id,
            kpId: kp.id,
            stem: "示例材料：请在此放置案例背景或计算背景，并在下方添加设问。",
            subs: [
              { prompt: "第（1）问：请说明判断结论并给出理由。", answer: "参考答案：请替换为正式答案。" },
              { prompt: "第（2）问：请计算并说明结果。", answer: "参考答案：请替换为正式答案。" },
            ],
            score: 10,
            analysis: "评分要点：结论与依据分别给分。",
            knowledgePoint: kp.name,
            source: "批量导入示例",
          },
        ],
      };
    }

    function importResultHTML() {
      if (!state.importResult) return "";
      const r = state.importResult;
      const cls = r.errors.length ? "err" : "ok";
      let html =
        '<div class="import-result ' +
        cls +
        '"><b>' +
        (r.count ? "成功导入 " + r.count + " 道题" : "未导入题目") +
        "</b>" +
        (r.total ? "，共解析 " + r.total + " 条。" : "。") +
        (r.errors.length ? "<br>跳过 " + r.errors.length + " 条：" : "");
      if (r.errors.length) {
        html +=
          "<ul>" +
          r.errors
            .slice(0, 10)
            .map(function (e) { return "<li>" + U.esc(e) + "</li>"; })
            .join("") +
          "</ul>" +
          (r.errors.length > 10 ? '<p class="small">仅显示前 10 条，请修正后重试。</p>' : "");
      }
      html += "</div>";
      return html;
    }

    function renderImport() {
      content.innerHTML =
        '<div class="import-card">' +
        '<h2>批量导入 JSON</h2><p>支持数组或以 <code>{ subjectId, questions: [...] }</code> 包装的格式；题型、选项、答案字段与题库 schema 一致。' +
        "导入的题目归属于当前科目《" +
        U.esc(subject.name) +
        "》，并保存在本机。</p>" +
        '<textarea class="textarea import-textarea" id="importJson" spellcheck="false" placeholder="在此粘贴 JSON，或点击下方按钮选择文件…">' +
        U.esc(state.importText) +
        "</textarea>" +
        '<div class="import-actions">' +
        '<button class="btn btn-primary" type="button" id="doImport">开始导入</button>' +
        '<button class="btn btn-ghost" type="button" id="pickImportFile">选择 JSON 文件</button>' +
        '<button class="btn btn-ghost" type="button" id="fillExample">填入示例</button>' +
        '<button class="btn btn-ghost" type="button" id="exportUserQ">导出自建题</button>' +
        '<input type="file" id="importFile" accept=".json,application/json" hidden />' +
        "</div>" +
        '<div id="importResultBox">' +
        importResultHTML() +
        "</div>" +
        '<div class="data-note" style="margin-top:16px"><strong>字段提示：</strong>选择题使用 <code>options</code> + <code>answer</code>；主观题使用 <code>subs</code>（或 <code>subQuestions</code>）+ 每问 <code>prompt</code>/<code>answer</code>。' +
        "未填写 <code>chapterId</code>/<code>kpId</code> 时默认归入第一章第一个知识点。</div>" +
        "</div>" +
        '<div class="api-doc" style="margin-top:16px"><h2>导入规则</h2><ul class="schema-list">' +
        "<li>所有题目会以「自建题」入库，不会覆盖数据文件题目。</li>" +
        "<li>单选 <code>answer</code> 可写 <code>\"A\"</code>；多选可写 <code>[\"A\",\"C\"]</code>。</li>" +
        "<li>选项可写字符串 <code>\"A. 内容\"</code>，系统会自动识别字母。</li>" +
        "<li>导入前会逐题校验，缺失题干、答案或设问的题目将被跳过。</li>" +
        "<li>大量正式题目建议写入科目数据文件，便于版本管理。</li>" +
        "</ul></div>";

      const ta = content.querySelector("#importJson");
      ta.addEventListener("input", function () {
        state.importText = ta.value;
      });
      const fileInput = content.querySelector("#importFile");
      content.querySelector("#pickImportFile").addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        U.readTextFile(
          file,
          function (text) {
            state.importText = text;
            renderImport();
            U.toast("文件已载入，请点击「开始导入」", "info");
          },
          function (err) {
            U.toast("文件读取失败：" + err.message, "error");
          }
        );
      });
      content.querySelector("#fillExample").addEventListener("click", function () {
        state.importText = JSON.stringify(examplePayload(), null, 2);
        state.importResult = null;
        renderImport();
      });
      content.querySelector("#doImport").addEventListener("click", doImport);
      content.querySelector("#exportUserQ").addEventListener("click", exportUserQuestions);
    }

    function doImport() {
      const ta = content.querySelector("#importJson");
      const text = ta ? ta.value : state.importText;
      state.importText = text;
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        state.importResult = { count: 0, total: 0, errors: ["JSON 语法错误：" + e.message] };
        renderImport();
        return;
      }
      if (parsed && parsed.subjectId && parsed.subjectId !== subject.id) {
        state.importResult = {
          count: 0,
          total: 0,
          errors: ["文件属于科目 " + parsed.subjectId + "，请切换到对应科目后再导入。"],
        };
        renderImport();
        return;
      }
      const items = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.questions) ? parsed.questions : null;
      if (!items) {
        state.importResult = {
          count: 0,
          total: 0,
          errors: ["未找到题目数组。请使用 [...] 或 { questions: [...] } 格式。"],
        };
        renderImport();
        return;
      }

      const valid = [];
      const errors = [];
      items.forEach(function (item, i) {
        if (!item || typeof item !== "object") {
          errors.push("第 " + (i + 1) + " 条：不是有效对象");
          return;
        }
        const category = item.type || ((item.subs || item.subQuestions || []).length ? subject.primarySubjectiveType : "single");
        if (subject.questionTypes.indexOf(category) < 0) {
          errors.push("第 " + (i + 1) + " 条：题型 " + category + " 不属于当前科目");
          return;
        }
        const chapterKey = item.chapterId || item.chapter;
        const chapter = chapterKey
          ? subject.chapters.find(function (ch) {
              return ch.id === chapterKey;
            })
          : firstChapter();
        if (!chapter) {
          errors.push("第 " + (i + 1) + " 条：章节 " + chapterKey + " 不存在");
          return;
        }
        const kpKey = item.kpId || item.knowledgePointId;
        const kp = kpKey
          ? chapter.knowledgePoints.find(function (k) {
              return k.id === kpKey;
            })
          : chapter.knowledgePoints[0];
        if (!kp) {
          errors.push("第 " + (i + 1) + " 条：知识点 " + kpKey + " 不存在");
          return;
        }
        const next = Object.assign({}, item, {
          type: category,
          chapterId: chapter.id,
          kpId: kp.id,
          source: String(item.source || "批量导入"),
        });
        const result = CPA.validateQuestion(next);
        if (!result.ok) {
          errors.push("第 " + (i + 1) + " 条：" + result.errors.join("；"));
          return;
        }
        valid.push(
          Object.assign({}, result.question, {
            subjectId: subject.id,
            chapterId: chapter.id,
            kpId: kp.id,
            source: next.source,
            isUser: true,
            placeholder: false,
          })
        );
      });

      let imported = 0;
      if (valid.length) {
        CPA.store.addUserQuestionsBulk(subject.id, valid);
        imported = valid.length;
        CPA.rebuildSubject(subject);
        CPA.app.refreshChrome();
        updateHeadStats();
      }
      state.importResult = { count: imported, total: items.length, errors: errors };
      renderImport();
      U.toast(imported ? "成功导入 " + imported + " 道题" : "没有可导入的题目", imported ? "success" : "error", 3200);
    }

    function exportUserQuestions() {
      const list = CPA.store.getUserQuestions(subject.id);
      if (!list.length) {
        U.toast("当前科目还没有自建题目", "error");
        return;
      }
      U.downloadJson(
        "CPA-" + subject.name + "-自建题目-" + U.formatDate(Date.now(), false) + ".json",
        {
          app: "cpa-unified-bank",
          format: "questions",
          subjectId: subject.id,
          subjectName: subject.name,
          exportedAt: new Date().toISOString(),
          questions: list,
        }
      );
      U.toast("已导出自建题目 " + list.length + " 道");
    }

    function renderApi() {
      const subjectSnippet =
        '// 1) data/manifest.js 中登记\n' +
        'window.CPA_SUBJECT_FILES = [\n' +
        '  "data/subjects/accounting.js",\n' +
        '  "data/subjects/your-subject.js"\n' +
        '];\n\n' +
        '// 2) data/subjects/your-subject.js\n' +
        'CPA.registerSubject({\n' +
        '  id: "your-subject",\n' +
        '  name: "科目名",\n' +
        '  accent: "#0f766e",\n' +
        '  typeLabels: { case: "案例分析题" },\n' +
        '  questionTypes: ["single", "multiple", "case"],\n' +
        '  exam: {\n' +
        '    duration: 120,\n' +
        '    sections: [\n' +
        '      { type: "single", count: 20, scorePer: 1 },\n' +
        '      { type: "multiple", count: 10, scorePer: 2 },\n' +
        '      { type: "case", count: 4, scorePer: 15 }\n' +
        '    ]\n' +
        '  },\n' +
        '  chapters: CPA.defineChapters([\n' +
        '    ["ch1", "第一章 总论", ["核心考点", "综合应用"]],\n' +
        '    ["ch2", "第二章 进阶", ["考点一", "考点二"]]\n' +
        '  ])\n' +
        '});';

      const questionSnippet =
        'CPA.registerQuestions("your-subject", [\n' +
        '  {\n' +
        '    type: "single",\n' +
        '    chapterId: "ch1",\n' +
        '    kpId: "ch1-k1",\n' +
        '    stem: "下列各项中，说法正确的是（ ）。",\n' +
        '    options: [\n' +
        '      { key: "A", text: "选项 A" },\n' +
        '      { key: "B", text: "选项 B" },\n' +
        '      { key: "C", text: "选项 C" },\n' +
        '      { key: "D", text: "选项 D" }\n' +
        '    ],\n' +
        '    answer: "A",\n' +
        '    analysis: "解析……",\n' +
        '    knowledgePoint: "考点说明",\n' +
        '    source: "自编",\n' +
        '    year: 2026\n' +
        '  }\n' +
        ']);';

      content.innerHTML =
        '<div class="api-doc">' +
        '<h2>扩展与接入</h2><p>整套系统没有构建步骤。新增科目、批量题库或调整试卷结构，都通过数据文件与全局 API 完成，练习与测试模块无需改动。</p>' +
        '<h3>1. 新增一个科目</h3>' +
        '<div class="snippet-head"><span>data/manifest.js + data/subjects/your-subject.js</span><button class="btn btn-ghost btn-sm" type="button" data-copy="#snippetSubject">复制</button></div>' +
        '<pre class="api-snippet" id="snippetSubject">' +
        U.esc(subjectSnippet) +
        "</pre>" +
        '<h3>2. 批量追加题目（数据文件 / 控制台）</h3>' +
        '<div class="snippet-head"><span>CPA.registerQuestions(subjectId, questions)</span><button class="btn btn-ghost btn-sm" type="button" data-copy="#snippetQuestions">复制</button></div>' +
        '<pre class="api-snippet" id="snippetQuestions">' +
        U.esc(questionSnippet) +
        "</pre>" +
        '<h3>3. 题目数据结构</h3><ul class="schema-list">' +
        '<li><code>type</code> 单选 / 多选 / 案例 / 计算 / 简答 / 综合</li>' +
        '<li><code>stem</code> 题干或案例材料</li>' +
        '<li><code>options</code> 选择题选项对象数组</li>' +
        '<li><code>answer</code> 正确答案字母或数组</li>' +
        '<li><code>optionAnalysis</code> 逐选项解析（选填）</li>' +
        '<li><code>subs</code> 主观题设问、参考答案、解析</li>' +
        '<li><code>analysis / knowledgePoint / tip</code> 解析、考点、技巧</li>' +
        '<li><code>chapterId / kpId</code> 章节与知识点归属</li>' +
        '<li><code>placeholder</code> 占位题标记（自动生成）</li>' +
        '<li><code>isUser</code> 自建题标记（录入界面写入）</li>' +
        "</ul>" +
        '<h3>4. 数据与备份</h3><p>练习进度、测试记录、自建题保存在浏览器 localStorage（键名 <code>cpa-unified-bank-v1</code>）。可在右上角「数据管理」整包导出/导入。正式题库建议写入代码库数据文件，避免仅存在单台设备。</p>' +
        '<h3>5. 进一步阅读</h3><p><a href="README.md" target="_blank" rel="noopener">README.md</a> 包含完整的目录结构、数据 schema、试卷蓝图与新增科目步骤。</p>' +
        '<div class="framework-actions" style="margin-top:16px"><button class="btn btn-ghost btn-sm" type="button" data-goto-tab="import">去批量导入</button><button class="btn btn-ghost btn-sm" type="button" data-goto-tab="manage">查看自建题</button></div>' +
        "</div>";

      content.querySelectorAll("[data-copy]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const target = content.querySelector(btn.getAttribute("data-copy"));
          if (!target) return;
          U.copyText(target.textContent).then(function (ok) {
            U.toast(ok ? "已复制到剪贴板" : "复制失败，请手动选择", ok ? "success" : "error");
          });
        });
      });
      content.querySelectorAll("[data-goto-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          switchTab(btn.getAttribute("data-goto-tab"));
        });
      });
    }

    function renderTab() {
      root.querySelectorAll(".entry-tab").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === state.tab);
      });
      updateHeadStats();
      if (state.tab === "new") renderNew();
      else if (state.tab === "manage") renderManage();
      else if (state.tab === "import") renderImport();
      else renderApi();
    }

    root.querySelectorAll(".entry-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    renderTab();

    return {
      destroy: function () {},
    };
  }

  CPA.views = CPA.views || {};
  CPA.views.entry = { mount: mount };
})();
