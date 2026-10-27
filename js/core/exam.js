/* CPA 统一题库 · 抽题、组卷与判分引擎 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  function inScope(item, chapterIds) {
    if (!chapterIds || !chapterIds.length) return true;
    return chapterIds.indexOf(item.chapterId) >= 0;
  }

  function priority(subject, item) {
    const answer = CPA.store ? CPA.store.getAnswer(subject.id, item.q.id) : null;
    let score = Math.random() * 20;
    if (!answer || !answer.submitted) score += 100;
    if (item.q.year) score += 40;
    if (answer && answer.correct === false) score += 30;
    if (item.q.placeholder) score -= 5;
    return score;
  }

  function itemsOfType(subject, type, chapterIds) {
    return subject.index.filter(function (item) {
      if (!inScope(item, chapterIds)) return false;
      if (type === "subjective") return !CPA.isObjective(item.q.type);
      return item.q.type === type;
    });
  }

  function pickItems(subject, type, count, chapterIds) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (!n) return [];
    const pool = U.shuffle(itemsOfType(subject, type, chapterIds)).sort(function (a, b) {
      return priority(subject, b) - priority(subject, a);
    });
    return pool.slice(0, n);
  }

  function availability(subject, chapterIds) {
    const out = {
      single: 0,
      multiple: 0,
      subjective: 0,
      total: 0,
      todo: 0,
      wrong: 0,
      weak: 0,
      real: 0,
      byType: {},
      todoByType: {},
      wrongByType: {},
      realByType: {},
    };
    subject.index.forEach(function (item) {
      if (!inScope(item, chapterIds)) return;
      out.total++;
      if (CPA.isObjective(item.q.type)) {
        if (item.q.type === "single") out.single++;
        else if (item.q.type === "multiple") out.multiple++;
      } else {
        out.subjective++;
      }
      out.byType[item.q.type] = (out.byType[item.q.type] || 0) + 1;
      const a = CPA.store ? CPA.store.getAnswer(subject.id, item.q.id) : null;
      if (!a || !a.submitted) {
        out.todo++;
        out.todoByType[item.q.type] = (out.todoByType[item.q.type] || 0) + 1;
      }
      if (a && a.correct === false) {
        out.wrong++;
        out.wrongByType[item.q.type] = (out.wrongByType[item.q.type] || 0) + 1;
      }
      if (a && a.weak) out.weak++;
      if (item.q.year) {
        out.real++;
        out.realByType[item.q.type] = (out.realByType[item.q.type] || 0) + 1;
      }
    });
    return out;
  }

  function buildQuick(subject, options) {
    const opts = options || {};
    const chapterIds = Array.isArray(opts.chapterIds) ? opts.chapterIds : [];
    const counts = opts.counts || {};
    const sections = [];

    const single = pickItems(subject, "single", counts.single, chapterIds);
    if (single.length) {
      sections.push({
        name: "单项选择题",
        type: "single",
        scorePer: 2,
        requested: Number(counts.single) || single.length,
        questionIds: single.map(function (item) {
          return item.q.id;
        }),
      });
    }
    const multiple = pickItems(subject, "multiple", counts.multiple, chapterIds);
    if (multiple.length) {
      sections.push({
        name: "多项选择题",
        type: "multiple",
        scorePer: 3,
        requested: Number(counts.multiple) || multiple.length,
        questionIds: multiple.map(function (item) {
          return item.q.id;
        }),
      });
    }
    const subjective = pickItems(subject, "subjective", counts.subjective, chapterIds);
    if (subjective.length) {
      sections.push({
        name: "主观题",
        type: "subjective",
        scorePer: 12,
        requested: Number(counts.subjective) || subjective.length,
        questionIds: subjective.map(function (item) {
          return item.q.id;
        }),
      });
    }

    const cn = ["一", "二", "三", "四", "五"];
    sections.forEach(function (sec, i) {
      sec.name = cn[i] + "、" + sec.name;
    });

    return {
      title: "快速自测",
      duration: Math.max(5, Number(opts.duration) || 30),
      sections: sections,
      meta: { chapterIds: chapterIds, counts: counts },
    };
  }

  function mockPlan(subject) {
    return (subject.exam.sections || []).map(function (sec) {
      const available = subject.index.filter(function (item) {
        return item.q.type === sec.type;
      }).length;
      return {
        name: sec.name,
        type: sec.type,
        requested: sec.count,
        scorePer: sec.scorePer,
        available: available,
        actual: Math.min(sec.count, available),
      };
    });
  }

  function buildMock(subject) {
    const sections = [];
    mockPlan(subject).forEach(function (sec) {
      if (!sec.actual) return;
      const picked = pickItems(subject, sec.type, sec.actual);
      if (!picked.length) return;
      sections.push({
        name: sec.name,
        type: sec.type,
        scorePer: sec.scorePer,
        requested: sec.requested,
        questionIds: picked.map(function (item) {
          return item.q.id;
        }),
      });
    });
    return {
      title: subject.name + " · 全真模拟",
      duration: subject.exam.duration,
      sections: sections,
      meta: { blueprint: true },
    };
  }

  function createSession(subject, kind, plan) {
    const now = Date.now();
    const duration = Math.max(1, Number(plan.duration) || 30);
    return {
      id: "test-" + now.toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      subjectId: subject.id,
      kind: kind,
      title: plan.title,
      durationMin: duration,
      createdAt: now,
      startedAt: now,
      deadline: now + duration * 60000,
      sections: plan.sections.map(function (sec) {
        return {
          name: sec.name,
          type: sec.type,
          scorePer: sec.scorePer,
          requested: sec.requested,
          questionIds: sec.questionIds.slice(),
        };
      }),
      answers: {},
      selfScores: {},
      status: "active",
      submittedAt: null,
      meta: plan.meta || {},
    };
  }

  function getSessionItems(session) {
    const subject = CPA.getSubject(session.subjectId);
    if (!subject) return [];
    const items = [];
    (session.sections || []).forEach(function (sec, sectionIndex) {
      (sec.questionIds || []).forEach(function (qid) {
        const item = subject.qMap[qid];
        if (!item) return;
        items.push({
          q: item.q,
          chapterId: item.chapterId,
          chapterName: item.chapterName,
          kpId: item.kpId,
          kpName: item.kpName,
          section: sec,
          sectionIndex: sectionIndex,
          scorePer: Number(sec.scorePer) || 0,
        });
      });
    });
    return items;
  }

  function getSessionItem(session, qid) {
    return (
      getSessionItems(session).find(function (item) {
        return item.q.id === qid;
      }) || null
    );
  }

  function isAnswered(q, answer) {
    if (!answer) return false;
    if (CPA.isObjective(q.type)) {
      return Array.isArray(answer.sel) && answer.sel.length > 0;
    }
    return (
      Array.isArray(answer.texts) &&
      answer.texts.some(function (text) {
        return String(text || "").trim().length > 0;
      })
    );
  }

  function answeredCount(session) {
    return getSessionItems(session).filter(function (item) {
      return isAnswered(item.q, session.answers[item.q.id]);
    }).length;
  }

  function evaluate(q, answer) {
    if (!CPA.isObjective(q.type)) {
      return { answered: isAnswered(q, answer), correct: null };
    }
    const sel = answer && Array.isArray(answer.sel) ? answer.sel : [];
    return {
      answered: sel.length > 0,
      correct: sel.length > 0 ? U.arrEq(sel, q.answer) : null,
    };
  }

  function scoreSession(session) {
    const subject = CPA.getSubject(session.subjectId);
    const items = getSessionItems(session);
    const result = {
      items: items,
      maxScore: 0,
      autoMax: 0,
      autoScore: 0,
      selfMax: 0,
      selfScore: 0,
      totalScore: 0,
      percent: 0,
      autoPercent: 0,
      right: 0,
      wrong: 0,
      blank: 0,
      answered: 0,
      subjectiveCount: 0,
      selfGradedCount: 0,
      fullySelfGraded: true,
      passed: null,
      bySection: [],
      subjectiveItems: [],
      durationMs: Math.max(0, (session.submittedAt || Date.now()) - (session.startedAt || Date.now())),
    };

    const sectionMap = {};
    (session.sections || []).forEach(function (sec, si) {
      sectionMap[si] = {
        name: sec.name,
        type: sec.type,
        count: 0,
        right: 0,
        wrong: 0,
        blank: 0,
        subjective: 0,
        selfGraded: 0,
        score: 0,
        max: 0,
      };
    });

    items.forEach(function (item) {
      const q = item.q;
      const answer = session.answers[q.id];
      const ev = evaluate(q, answer);
      const secStat = sectionMap[item.sectionIndex];
      result.maxScore += item.scorePer;
      if (secStat) {
        secStat.count++;
        secStat.max += item.scorePer;
      }

      if (CPA.isObjective(q.type)) {
        result.autoMax += item.scorePer;
        if (!ev.answered) {
          result.blank++;
          if (secStat) secStat.blank++;
        } else {
          result.answered++;
          if (ev.correct) {
            result.right++;
            result.autoScore += item.scorePer;
            if (secStat) {
              secStat.right++;
              secStat.score += item.scorePer;
            }
          } else {
            result.wrong++;
            if (secStat) secStat.wrong++;
          }
        }
      } else {
        result.subjectiveCount++;
        result.selfMax += item.scorePer;
        if (ev.answered) result.answered++;
        if (secStat) secStat.subjective++;

        const raw = session.selfScores ? session.selfScores[q.id] : undefined;
        const hasSelf = raw !== undefined && raw !== null && raw !== "";
        let self = hasSelf ? Number(raw) : 0;
        if (!isFinite(self)) self = 0;
        self = U.clamp(self, 0, item.scorePer);
        if (hasSelf) {
          result.selfGradedCount++;
          result.selfScore += self;
          if (secStat) {
            secStat.selfGraded++;
            secStat.score += self;
          }
        } else {
          result.fullySelfGraded = false;
        }
        result.subjectiveItems.push({
          item: item,
          answer: answer || {},
          selfScore: hasSelf ? self : null,
          maxScore: item.scorePer,
        });
      }
    });

    result.totalScore = result.autoScore + result.selfScore;
    result.percent = result.maxScore
      ? Math.round((result.totalScore / result.maxScore) * 100)
      : 0;
    result.autoPercent = result.autoMax
      ? Math.round((result.autoScore / result.autoMax) * 100)
      : 0;
    if (result.fullySelfGraded && subject) {
      result.passed = result.percent >= Number(subject.exam.passScore || 60);
    }

    result.bySection = Object.keys(sectionMap)
      .sort(function (a, b) {
        return Number(a) - Number(b);
      })
      .map(function (key) {
        return sectionMap[key];
      });

    return result;
  }

  function isExpired(session, now) {
    return !!session.deadline && (now || Date.now()) >= session.deadline;
  }

  function formatClock(ms) {
    return U.formatClock(ms);
  }

  CPA.exam = {
    pickItems: pickItems,
    availability: availability,
    buildQuick: buildQuick,
    mockPlan: mockPlan,
    buildMock: buildMock,
    createSession: createSession,
    getSessionItems: getSessionItems,
    getSessionItem: getSessionItem,
    isAnswered: isAnswered,
    answeredCount: answeredCount,
    evaluate: evaluate,
    scoreSession: scoreSession,
    isExpired: isExpired,
    formatClock: formatClock,
    kindLabel: function (kind) {
      return kind === "mock" ? "全真模拟" : "快速自测";
    },
  };
})();
