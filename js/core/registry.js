/* CPA 统一题库 · 科目注册表与题目规范化 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  const TYPE_ORDER = ["single", "multiple", "case", "calculation", "short", "comprehensive"];
  const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

  CPA.QUESTION_TYPES = {
    single: { label: "单项选择题", short: "单选", objective: true },
    multiple: { label: "多项选择题", short: "多选", objective: true },
    case: { label: "案例分析题", short: "案例", objective: false },
    calculation: { label: "计算分析题", short: "计算", objective: false },
    short: { label: "简答题", short: "简答", objective: false },
    comprehensive: { label: "综合题", short: "综合", objective: false },
  };

  CPA.subjects = [];
  CPA.subjectMap = Object.create(null);
  CPA.booted = false;

  function isObjective(type) {
    return !!(CPA.QUESTION_TYPES[type] && CPA.QUESTION_TYPES[type].objective);
  }

  function typeLabel(subject, type) {
    if (subject && subject.typeLabels && subject.typeLabels[type]) {
      return subject.typeLabels[type];
    }
    return CPA.QUESTION_TYPES[type] ? CPA.QUESTION_TYPES[type].label : type;
  }

  function typeShort(subject, type) {
    return CPA.QUESTION_TYPES[type] ? CPA.QUESTION_TYPES[type].short : type;
  }

  function normalizeOption(opt, index) {
    if (typeof opt === "string") {
      const match = opt.match(/^\s*([A-Fa-f])\s*[.．、:：)）]\s*([\s\S]*)$/);
      if (match) return { key: match[1].toUpperCase(), text: match[2].trim() };
      return { key: String.fromCharCode(65 + index), text: opt.trim() };
    }
    const rawKey = opt && (opt.key || opt.letter || opt.value);
    return {
      key: String(rawKey || String.fromCharCode(65 + index)).toUpperCase(),
      text: String((opt && (opt.text !== undefined ? opt.text : opt.label)) || "").trim(),
    };
  }

  function normalizeAnswer(raw) {
    if (raw === null || raw === undefined || raw === "") return [];
    let list;
    if (Array.isArray(raw)) {
      list = raw.map((x) => String(x).toUpperCase().trim()).filter(Boolean);
    } else {
      const s = String(raw).toUpperCase().trim();
      list = /^[A-F]{2,}$/.test(s) ? s.split("") : s.split(/[,，、\s/]+/).filter(Boolean);
    }
    return Array.from(new Set(list));
  }

  function normalizeSub(sub, index, qid, usedIds) {
    let id = sub && sub.id ? String(sub.id) : qid + "-s" + (index + 1);
    while (usedIds.has(id)) id = id + "-x";
    usedIds.add(id);
    return {
      id: id,
      prompt: String((sub && (sub.prompt !== undefined ? sub.prompt : sub.question)) || ""),
      answer: String((sub && (sub.answer !== undefined ? sub.answer : sub.reference)) || ""),
      analysis: String((sub && sub.analysis) || ""),
    };
  }

  function normalizeQuestion(raw, ctx) {
    const source = raw || {};
    const subSource = source.subs || source.subQuestions || [];
    let type = source.type;
    if (!CPA.QUESTION_TYPES[type]) {
      type = subSource.length ? "case" : "single";
    }
    const qid = source.id
      ? String(source.id)
      : (ctx.kpId || ctx.chapterId) + "-q" + (source._index || ctx._index || "x");

    const q = {
      id: qid,
      type: type,
      stem: String(source.stem !== undefined ? source.stem : source.question || ""),
      options: [],
      answer: [],
      analysis: String(source.analysis || ""),
      knowledgePoint: String(source.knowledgePoint || source.kpNote || ""),
      tip: String(source.tip || ""),
      optionAnalysis: null,
      year: source.year === "—" || source.year === "" ? null : source.year || null,
      source: String(source.source || ""),
      score: Number(source.score) || 0,
      difficulty: String(source.difficulty || ""),
      placeholder: !!source.placeholder,
      isUser: !!source.isUser,
      subjectId: ctx.subjectId,
      chapterId: ctx.chapterId,
      kpId: ctx.kpId,
      subs: [],
    };

    if (isObjective(type)) {
      q.options = (Array.isArray(source.options) ? source.options : []).map(normalizeOption);
      q.answer = normalizeAnswer(source.answer !== undefined ? source.answer : source.correct);
    } else {
      const usedSubIds = new Set();
      q.subs = (Array.isArray(subSource) ? subSource : []).map(function (sub, i) {
        return normalizeSub(sub, i, qid, usedSubIds);
      });
    }

    if (source.optionAnalysis && typeof source.optionAnalysis === "object") {
      const map = {};
      Object.keys(source.optionAnalysis).forEach(function (key) {
        map[String(key).toUpperCase()] = String(source.optionAnalysis[key] || "");
      });
      q.optionAnalysis = map;
    }
    return q;
  }

  function normalizeChapter(raw, subjectId, index) {
    const source = raw || {};
    const id = String(source.id || "ch" + (index + 1));
    const kpSource = source.knowledgePoints || source.kps || [];
    const knowledgePoints = [];

    (Array.isArray(kpSource) ? kpSource : []).forEach(function (kp, ki) {
      const kpId = String(kp.id || id + "-k" + (ki + 1));
      const questions = [];
      (Array.isArray(kp.questions) ? kp.questions : []).forEach(function (q, qi) {
        questions.push(
          normalizeQuestion(q, {
            subjectId: subjectId,
            chapterId: id,
            kpId: kpId,
            _index: qi + 1,
          })
        );
      });
      knowledgePoints.push({
        id: kpId,
        name: String(kp.name || "知识点 " + (ki + 1)),
        questions: questions,
      });
    });

    if (Array.isArray(source.questions) && source.questions.length) {
      const kpId = id + "-k-general";
      let kp = knowledgePoints.find(function (k) {
        return k.id === kpId;
      });
      if (!kp) {
        kp = { id: kpId, name: "本章综合", questions: [] };
        knowledgePoints.push(kp);
      }
      source.questions.forEach(function (q, qi) {
        kp.questions.push(
          normalizeQuestion(q, {
            subjectId: subjectId,
            chapterId: id,
            kpId: kpId,
            _index: qi + 1,
          })
        );
      });
    }

    if (!knowledgePoints.length) {
      knowledgePoints.push({ id: id + "-k1", name: "核心考点", questions: [] });
    }

    return {
      id: id,
      name: String(source.name || "第" + (index + 1) + "章"),
      knowledgePoints: knowledgePoints,
    };
  }

  function normalizeExam(def, subjectDraft) {
    const raw = def || {};
    let sections = Array.isArray(raw.sections) ? raw.sections.slice() : [];
    if (!sections.length) {
      const primarySubjective = subjectDraft.subjectiveTypes[0];
      sections = [
        { type: "single", count: 10, scorePer: 2 },
        { type: "multiple", count: 5, scorePer: 3 },
      ];
      if (primarySubjective) {
        sections.push({ type: primarySubjective, count: 1, scorePer: 15 });
      }
    }
    const normalized = [];
    sections.forEach(function (sec, i) {
      if (!CPA.QUESTION_TYPES[sec.type]) return;
      normalized.push({
        name:
          sec.name ||
          CN_NUM[i] + "、" + (subjectDraft.typeLabels[sec.type] || CPA.QUESTION_TYPES[sec.type].label),
        type: sec.type,
        count: Math.max(0, Number(sec.count) || 0),
        scorePer: Math.max(0, Number(sec.scorePer) || 0),
      });
    });
    return {
      duration: Math.max(1, Number(raw.duration) || 120),
      passScore: Math.max(0, Number(raw.passScore) || 60),
      note: String(raw.note || ""),
      sections: normalized,
    };
  }

  function normalizePlaceholderProfile(profile) {
    if (!profile) return null;
    const out = {
      singlesPerChapter: Math.max(0, Number(profile.singlesPerChapter) || 0),
      multiplesPerChapter: Math.max(0, Number(profile.multiplesPerChapter) || 0),
      subjectives: {},
    };
    Object.keys(profile.subjectives || {}).forEach(function (type) {
      if (!CPA.QUESTION_TYPES[type] || isObjective(type)) return;
      const count = Math.max(0, Number(profile.subjectives[type]) || 0);
      if (count) out.subjectives[type] = count;
    });
    return out;
  }

  function pushQuestionToKp(chapter, kpId, question) {
    const kp =
      chapter.knowledgePoints.find(function (x) {
        return x.id === kpId;
      }) || chapter.knowledgePoints[0];
    if (kp) kp.questions.push(question);
  }

  function makePlaceholderObjective(subject, chapter, kp, type, index) {
    const label = typeLabel(subject, type);
    const letters = ["A", "B", "C", "D"];
    const singleAnswer = letters[index % 4];
    const multiAnswers = index % 2 === 0 ? ["A", "C"] : ["B", "D"];
    const qid = subject.id + "-" + chapter.id + "-ph-" + type + "-" + (index + 1);
    const optionAnalysis = {};
    letters.forEach(function (letter) {
      const correct = type === "single" ? letter === singleAnswer : multiAnswers.includes(letter);
      optionAnalysis[letter] = correct
        ? "√ 占位解析：该选项为示例正确答案，正式录入时请替换为准确理由。"
        : "× 占位解析：正式录入时请填写该选项不成立的具体原因。";
    });
    return {
      id: qid,
      type: type,
      stem:
        "【占位题】" +
        chapter.name +
        " · " +
        kp.name +
        "：请在此录入第 " +
        (index + 1) +
        " 道" +
        label +
        "的题干。",
      options: letters.map(function (letter) {
        return { key: letter, text: "待补充选项 " + letter };
      }),
      answer: type === "single" ? [singleAnswer] : multiAnswers.slice(),
      analysis:
        "本题为框架占位题，仅用于验证练习、组卷与判分流程。正式录入题目后，请在此填写完整解析。",
      optionAnalysis: optionAnalysis,
      knowledgePoint: kp.name + " · 待补充考点说明",
      tip: "可在「录入题目」中新建正式题目，或编辑 data/subjects 下的科目数据文件批量补充。",
      year: null,
      source: "框架占位题",
      placeholder: true,
      isUser: false,
      subjectId: subject.id,
      chapterId: chapter.id,
      kpId: kp.id,
      subs: [],
    };
  }

  function makePlaceholderSubjective(subject, chapter, kp, type, index) {
    const label = typeLabel(subject, type);
    const qid = subject.id + "-" + chapter.id + "-ph-" + type + "-" + (index + 1);
    return {
      id: qid,
      type: type,
      stem:
        "【占位材料】" +
        chapter.name +
        " · " +
        kp.name +
        "\n\n此处用于放置" +
        label +
        "的背景材料。请在录入正式题目时替换本段文字，并按 CPA 考试风格给出完整设问。",
      options: [],
      answer: [],
      analysis: "主观题参考答案见各小问；正式录入时请补充评分要点与解析。",
      knowledgePoint: kp.name + " · 待补充考点说明",
      tip: "主观题不计入自动判分，练习与测试中均通过对照参考答案完成自评。",
      year: null,
      source: "框架占位题",
      score: 10,
      placeholder: true,
      isUser: false,
      subjectId: subject.id,
      chapterId: chapter.id,
      kpId: kp.id,
      subs: [
        {
          id: qid + "-s1",
          prompt: "第（1）问：请在此录入设问，并说明判断理由。",
          answer: "参考答案待补充。正式录入时请写明结论与依据。",
          analysis: "",
        },
        {
          id: qid + "-s2",
          prompt: "第（2）问：请在此录入设问，并说明判断理由。",
          answer: "参考答案待补充。正式录入时请写明结论与依据。",
          analysis: "",
        },
      ],
    };
  }

  function chapterHasRealQuestions(chapter) {
    return chapter.knowledgePoints.some(function (kp) {
      return kp.questions.some(function (q) {
        return !q.placeholder;
      });
    });
  }

  function materializePlaceholders(subject) {
    const profile = subject.placeholderProfile;
    if (!profile) return;
    subject.baseChapters.forEach(function (chapter, ci) {
      if (chapterHasRealQuestions(chapter)) return;
      const kps = chapter.knowledgePoints;
      if (!kps.length) return;
      for (let i = 0; i < profile.singlesPerChapter; i++) {
        const kp = kps[(i + ci) % kps.length];
        kp.questions.push(makePlaceholderObjective(subject, chapter, kp, "single", i));
      }
      for (let i = 0; i < profile.multiplesPerChapter; i++) {
        const kp = kps[(i + ci + 1) % kps.length];
        kp.questions.push(makePlaceholderObjective(subject, chapter, kp, "multiple", i));
      }
    });

    const eligibleForSubjective = subject.baseChapters.filter(function (chapter) {
      return !chapterHasRealQuestions(chapter);
    });
    if (!eligibleForSubjective.length) return;

    let seed = 0;
    Object.keys(profile.subjectives).forEach(function (type) {
      const count = profile.subjectives[type];
      for (let i = 0; i < count; i++) {
        const chapter = eligibleForSubjective[seed % eligibleForSubjective.length];
        const kp = chapter.knowledgePoints[(seed + 1) % chapter.knowledgePoints.length];
        kp.questions.push(makePlaceholderSubjective(subject, chapter, kp, type, i));
        seed++;
      }
    });
  }

  function registerSubject(def) {
    if (!def || !def.id) throw new Error("科目定义缺少 id");
    if (!/^[a-z0-9-]+$/.test(def.id)) {
      throw new Error("科目 id 只能包含小写字母、数字和短横线：" + def.id);
    }
    if (CPA.subjectMap[def.id]) {
      console.warn("[CPA] 科目 id 重复，已忽略：", def.id);
      return CPA.subjectMap[def.id];
    }
    if (!def.name) throw new Error("科目 " + def.id + " 缺少 name");

    const typeLabels = {};
    Object.keys(CPA.QUESTION_TYPES).forEach(function (type) {
      typeLabels[type] = CPA.QUESTION_TYPES[type].label;
    });
    Object.keys(def.typeLabels || {}).forEach(function (type) {
      if (CPA.QUESTION_TYPES[type]) typeLabels[type] = def.typeLabels[type];
    });

    const typeSet = new Set(def.questionTypes || ["single", "multiple"]);
    (def.exam && def.exam.sections ? def.exam.sections : []).forEach(function (sec) {
      if (CPA.QUESTION_TYPES[sec.type]) typeSet.add(sec.type);
    });
    Object.keys((def.placeholderProfile && def.placeholderProfile.subjectives) || {}).forEach(
      function (type) {
        if (CPA.QUESTION_TYPES[type]) typeSet.add(type);
      }
    );
    const questionTypes = TYPE_ORDER.filter(function (type) {
      return typeSet.has(type);
    });

    const subject = {
      id: def.id,
      name: def.name,
      fullName: def.fullName || "CPA《" + def.name + "》",
      tagline: def.tagline || "",
      description: def.description || "",
      accent: def.accent || "#1d4ed8",
      icon: def.icon || def.name.slice(0, 1),
      stage: def.stage || "专业阶段",
      typeLabels: typeLabels,
      questionTypes: questionTypes,
      subjectiveTypes: questionTypes.filter(function (type) {
        return !isObjective(type);
      }),
      placeholderProfile: normalizePlaceholderProfile(def.placeholderProfile),
      baseChapters: [],
      chapters: [],
      index: [],
      qMap: Object.create(null),
      stats: null,
    };

    const chapters = Array.isArray(def.chapters) ? def.chapters : [];
    if (!chapters.length) {
      chapters.push({
        id: "general",
        name: "未分类",
        knowledgePoints: [{ id: "general-k1", name: "待整理", questions: [] }],
      });
    }
    const usedChapterIds = new Set();
    subject.baseChapters = chapters.map(function (ch, i) {
      let id = String(ch.id || "ch" + (i + 1));
      while (usedChapterIds.has(id)) id = id + "-x";
      usedChapterIds.add(id);
      return normalizeChapter(Object.assign({}, ch, { id: id }), subject.id, i);
    });

    subject.baseChapters.forEach(function (ch) {
      ch.knowledgePoints.forEach(function (kp) {
        kp.questions.forEach(function (q) {
          if (CPA.QUESTION_TYPES[q.type]) typeSet.add(q.type);
        });
      });
    });
    subject.questionTypes = TYPE_ORDER.filter(function (type) {
      return typeSet.has(type);
    });
    subject.subjectiveTypes = subject.questionTypes.filter(function (type) {
      return !isObjective(type);
    });
    subject.primarySubjectiveType = subject.subjectiveTypes[0] || null;

    subject.exam = normalizeExam(def.exam, subject);
    subject.typeLabels = typeLabels;
    subject.questionTypes = TYPE_ORDER.filter(function (type) {
      return typeSet.has(type);
    });
    subject.subjectiveTypes = subject.questionTypes.filter(function (type) {
      return !isObjective(type);
    });
    subject.primarySubjectiveType = subject.subjectiveTypes[0] || null;

    materializePlaceholders(subject);

    CPA.subjects.push(subject);
    CPA.subjectMap[subject.id] = subject;
    rebuildSubject(subject);
    return subject;
  }

  function registerQuestions(subjectId, questions) {
    const subject = CPA.getSubject(subjectId);
    if (!subject) throw new Error("科目不存在：" + subjectId);
    const list = Array.isArray(questions) ? questions : [];
    const usedIds = new Set();
    subject.baseChapters.forEach(function (ch) {
      ch.knowledgePoints.forEach(function (kp) {
        kp.questions.forEach(function (item) {
          usedIds.add(item.id);
        });
      });
    });
    let added = 0;
    list.forEach(function (raw) {
      if (!raw) return;
      const chapterId = raw.chapterId || raw.chapter || null;
      const kpId = raw.kpId || raw.knowledgePointId || null;
      const chapter =
        (chapterId &&
          subject.baseChapters.find(function (ch) {
            return ch.id === chapterId;
          })) ||
        subject.baseChapters[0];
      if (!chapter) return;
      const kp =
        (kpId &&
          chapter.knowledgePoints.find(function (k) {
            return k.id === kpId;
          })) ||
        chapter.knowledgePoints[0];
      if (!kp) return;
      const q = normalizeQuestion(
        Object.assign({}, raw, { placeholder: false, isUser: false }),
        {
          subjectId: subject.id,
          chapterId: chapter.id,
          kpId: kp.id,
          _index: kp.questions.length + 1,
        }
      );
      if (usedIds.has(q.id)) {
        if (raw.id) {
          console.warn("[CPA] 题目 id 重复，已跳过：", q.id);
          return;
        }
        let n = 2;
        const baseId = q.id;
        while (usedIds.has(baseId + "-" + n)) n++;
        q.id = baseId + "-" + n;
      }
      usedIds.add(q.id);
      kp.questions.push(q);
      added++;
    });
    rebuildSubject(subject);
    if (CPA.booted && CPA.app && CPA.app.refreshChrome) CPA.app.refreshChrome();
    return added;
  }

  function rebuildSubject(subject) {
    if (!subject) return;
    const base = subject.baseChapters || [];
    const chapters = base.map(function (ch) {
      return {
        id: ch.id,
        name: ch.name,
        knowledgePoints: ch.knowledgePoints.map(function (kp) {
          return { id: kp.id, name: kp.name, questions: kp.questions.slice() };
        }),
      };
    });

    if (!chapters.length) {
      chapters.push({
        id: "general",
        name: "未分类",
        knowledgePoints: [{ id: "general-k1", name: "待整理", questions: [] }],
      });
    }

    const userQuestions =
      CPA.store && CPA.store.getUserQuestions ? CPA.store.getUserQuestions(subject.id) : [];
    const index = [];
    const qMap = Object.create(null);
    const usedIds = new Set();
    chapters.forEach(function (ch) {
      ch.knowledgePoints.forEach(function (kp) {
        kp.questions.forEach(function (q) {
          usedIds.add(q.id);
        });
      });
    });

    userQuestions.forEach(function (raw) {
      const chapter =
        chapters.find(function (ch) {
          return ch.id === raw.chapterId;
        }) || chapters[0];
      const kp =
        (chapter.knowledgePoints.find(function (k) {
          return k.id === raw.kpId;
        }) || chapter.knowledgePoints[0]);
      if (!kp) return;
      const q = normalizeQuestion(Object.assign({}, raw, { isUser: true, placeholder: false }), {
        subjectId: subject.id,
        chapterId: chapter.id,
        kpId: kp.id,
        _index: "u",
      });
      let qid = q.id;
      while (usedIds.has(qid)) qid = qid + "-u";
      q.id = qid;
      usedIds.add(qid);
      q.isUser = true;
      kp.questions.push(q);
    });

    const stats = {
      total: 0,
      objective: 0,
      subjective: 0,
      placeholder: 0,
      user: 0,
      real: 0,
      chapters: chapters.length,
      kps: 0,
      byType: {},
    };

    chapters.forEach(function (ch) {
      ch.knowledgePoints.forEach(function (kp) {
        stats.kps++;
        kp.questions.forEach(function (q) {
          if (qMap[q.id]) {
            console.warn("[CPA] 题目 id 重复，已跳过索引：", q.id);
            return;
          }
          q.subjectId = subject.id;
          q.chapterId = ch.id;
          q.kpId = kp.id;
          const item = {
            q: q,
            chapterId: ch.id,
            chapterName: ch.name,
            kpId: kp.id,
            kpName: kp.name,
          };
          index.push(item);
          qMap[q.id] = item;
          stats.total++;
          if (isObjective(q.type)) stats.objective++;
          else stats.subjective++;
          if (q.placeholder) stats.placeholder++;
          if (q.isUser) stats.user++;
          stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
        });
      });
    });
    stats.real = stats.total - stats.placeholder;

    subject.chapters = chapters;
    subject.index = index;
    subject.qMap = qMap;
    subject.stats = stats;
  }

  function rebuildAll() {
    CPA.subjects.forEach(rebuildSubject);
  }

  function getSubject(id) {
    return CPA.subjectMap[id] || null;
  }

  function validateQuestion(raw) {
    const errors = [];
    const type = raw && raw.type;
    if (!CPA.QUESTION_TYPES[type]) {
      errors.push("题型不合法");
      return { ok: false, errors: errors };
    }
    const normalized = normalizeQuestion(raw || {}, {
      subjectId: raw && raw.subjectId,
      chapterId: raw && raw.chapterId,
      kpId: raw && raw.kpId,
      _index: "validate",
    });
    if (!normalized.stem.trim()) errors.push("题干不能为空");

    if (isObjective(type)) {
      const keys = normalized.options.map(function (o) {
        return o.key;
      });
      if (normalized.options.length < 2) errors.push("选择题至少需要 2 个选项");
      normalized.options.forEach(function (opt) {
        if (!opt.text) errors.push("选项 " + opt.key + " 内容不能为空");
      });
      if (new Set(keys).size !== keys.length) errors.push("选项字母不能重复");
      if (!normalized.answer.length) errors.push("请设置正确答案");
      if (type === "single" && normalized.answer.length !== 1) {
        errors.push("单项选择题只能有 1 个正确答案");
      }
      normalized.answer.forEach(function (ans) {
        if (keys.indexOf(ans) < 0) errors.push("正确答案 " + ans + " 不在选项范围内");
      });
    } else {
      if (!normalized.subs.length) errors.push("主观题至少需要 1 个设问");
      normalized.subs.forEach(function (sub, i) {
        if (!sub.prompt.trim()) errors.push("第 " + (i + 1) + " 问缺少设问");
        if (!sub.answer.trim()) errors.push("第 " + (i + 1) + " 问缺少参考答案");
      });
    }

    return { ok: errors.length === 0, errors: errors, question: normalized };
  }

  function computeProgress(subject, progress) {
    const prog = progress || (CPA.store ? CPA.store.getProgress(subject.id) : {});
    let answered = 0;
    let graded = 0;
    let correct = 0;
    let wrong = 0;
    let weak = 0;
    let todo = 0;

    subject.index.forEach(function (item) {
      const a = prog[item.q.id];
      if (!a) {
        todo++;
        return;
      }
      if (a.weak) weak++;
      if (!a.submitted) {
        todo++;
        return;
      }
      answered++;
      if (isObjective(item.q.type)) {
        graded++;
        if (a.correct) correct++;
        else wrong++;
      }
    });

    return {
      answered: answered,
      graded: graded,
      correct: correct,
      wrong: wrong,
      weak: weak,
      todo: todo,
      total: subject.stats.total,
      rate: graded ? Math.round((correct / graded) * 100) : null,
      pct: subject.stats.total ? Math.round((answered / subject.stats.total) * 100) : 0,
    };
  }

  function statusOf(subject, q) {
    if (!q || !CPA.store) return "todo";
    const a = CPA.store.getAnswer(subject.id, q.id);
    if (!a || !a.submitted) return "todo";
    if (a.weak) return "weak";
    if (!isObjective(q.type)) return "done";
    return a.correct ? "right" : "wrong";
  }

  function defineChapters(list) {
    return (Array.isArray(list) ? list : []).map(function (entry) {
      const id = entry[0];
      const name = entry[1];
      const kps = entry[2] && entry[2].length ? entry[2] : ["核心考点", "综合应用"];
      return {
        id: id,
        name: name,
        knowledgePoints: kps.map(function (kp, i) {
          return { id: id + "-k" + (i + 1), name: kp };
        }),
      };
    });
  }

  function typeOptions(subject) {
    return subject.questionTypes.map(function (type) {
      return { value: type, label: typeLabel(subject, type), objective: isObjective(type) };
    });
  }

  CPA.normalizeQuestion = normalizeQuestion;
  CPA.normalizeAnswer = normalizeAnswer;
  CPA.isObjective = isObjective;
  CPA.typeLabel = typeLabel;
  CPA.typeShort = typeShort;
  CPA.typeOptions = typeOptions;
  CPA.registerSubject = registerSubject;
  CPA.registerQuestions = registerQuestions;
  CPA.rebuildSubject = rebuildSubject;
  CPA.rebuildAll = rebuildAll;
  CPA.getSubject = getSubject;
  CPA.validateQuestion = validateQuestion;
  CPA.computeProgress = computeProgress;
  CPA.statusOf = statusOf;
  CPA.defineChapters = defineChapters;
})();
