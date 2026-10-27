/* CPA 统一题库 · 本地持久化（进度 / 测试 / 自建题目） */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});
  const U = CPA.utils;

  const STORAGE_KEY = "cpa-unified-bank-v1";
  const TEST_KEEP_DONE = 40;

  let storageAvailable = true;
  try {
    const probe = "__cpa_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
  } catch (e) {
    storageAvailable = false;
  }

  function createState() {
    return {
      app: "cpa-unified-bank",
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeSubjectId: null,
      progress: {},
      tests: {},
      userQuestions: {},
    };
  }

  function sanitizeState(raw) {
    const base = createState();
    if (!raw || typeof raw !== "object") return base;
    base.createdAt = raw.createdAt || base.createdAt;
    base.updatedAt = raw.updatedAt || Date.now();
    base.activeSubjectId = typeof raw.activeSubjectId === "string" ? raw.activeSubjectId : null;
    base.progress = raw.progress && typeof raw.progress === "object" ? raw.progress : {};
    base.tests = raw.tests && typeof raw.tests === "object" ? raw.tests : {};
    base.userQuestions =
      raw.userQuestions && typeof raw.userQuestions === "object" ? raw.userQuestions : {};
    return base;
  }

  function load() {
    if (!storageAvailable) return createState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createState();
      return sanitizeState(JSON.parse(raw));
    } catch (e) {
      console.warn("[CPA] 本地数据读取失败：", e);
      return createState();
    }
  }

  const state = load();

  function save() {
    state.updatedAt = Date.now();
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("[CPA] 本地数据保存失败：", e);
      if (U && U.toast) U.toast("本地存储写入失败，可能空间不足，请先导出数据。", "error", 4000);
      return false;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getProgress(subjectId) {
    if (!state.progress[subjectId]) state.progress[subjectId] = {};
    return state.progress[subjectId];
  }

  function getAnswer(subjectId, qid) {
    return getProgress(subjectId)[qid] || null;
  }

  function setAnswer(subjectId, qid, patch) {
    const progress = getProgress(subjectId);
    progress[qid] = Object.assign({}, progress[qid] || {}, patch || {}, {
      updatedAt: Date.now(),
    });
    save();
    return progress[qid];
  }

  function setWeak(subjectId, qid, weak) {
    return setAnswer(subjectId, qid, { weak: !!weak });
  }

  function resetSubjectProgress(subjectId) {
    state.progress[subjectId] = {};
    save();
  }

  function resetAllProgress() {
    state.progress = {};
    state.tests = {};
    save();
  }

  function setActiveSubject(subjectId) {
    if (state.activeSubjectId === subjectId) return;
    state.activeSubjectId = subjectId || null;
    save();
  }

  function getTests(subjectId) {
    if (!Array.isArray(state.tests[subjectId])) state.tests[subjectId] = [];
    return state.tests[subjectId];
  }

  function getTest(subjectId, testId) {
    return (
      getTests(subjectId).find(function (t) {
        return t && t.id === testId;
      }) || null
    );
  }

  function getActiveTest(subjectId) {
    const active = getTests(subjectId).filter(function (t) {
      return t && t.status === "active";
    });
    active.sort(function (a, b) {
      return (b.startedAt || 0) - (a.startedAt || 0);
    });
    return active[0] || null;
  }

  function trimTests(subjectId) {
    const arr = getTests(subjectId);
    const done = arr
      .filter(function (t) {
        return t && t.status !== "active";
      })
      .sort(function (a, b) {
        return (a.submittedAt || a.createdAt || 0) - (b.submittedAt || b.createdAt || 0);
      });
    if (done.length <= TEST_KEEP_DONE) return;
    const remove = new Set(
      done.slice(0, done.length - TEST_KEEP_DONE).map(function (t) {
        return t.id;
      })
    );
    state.tests[subjectId] = arr.filter(function (t) {
      return !remove.has(t.id);
    });
  }

  function saveTest(session) {
    if (!session || !session.subjectId || !session.id) return;
    const arr = getTests(session.subjectId);
    const idx = arr.findIndex(function (t) {
      return t && t.id === session.id;
    });
    if (idx >= 0) arr[idx] = session;
    else arr.push(session);
    trimTests(session.subjectId);
    save();
  }

  function deleteTest(subjectId, testId) {
    state.tests[subjectId] = getTests(subjectId).filter(function (t) {
      return t && t.id !== testId;
    });
    save();
  }

  function getUserQuestions(subjectId) {
    if (!Array.isArray(state.userQuestions[subjectId])) state.userQuestions[subjectId] = [];
    return state.userQuestions[subjectId];
  }

  function newUserQuestionId(subjectId) {
    const list = getUserQuestions(subjectId);
    let id;
    do {
      id = "u-" + subjectId + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
    } while (list.some(function (q) {
      return q.id === id;
    }));
    return id;
  }

  function addUserQuestion(subjectId, raw) {
    const q = Object.assign({}, raw, {
      id: newUserQuestionId(subjectId),
      isUser: true,
      placeholder: false,
      updatedAt: Date.now(),
    });
    getUserQuestions(subjectId).push(q);
    save();
    return q;
  }

  function addUserQuestionsBulk(subjectId, list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (raw) {
      const q = Object.assign({}, raw, {
        id: newUserQuestionId(subjectId),
        isUser: true,
        placeholder: false,
        updatedAt: Date.now(),
      });
      getUserQuestions(subjectId).push(q);
      out.push(q);
    });
    save();
    return out;
  }

  function updateUserQuestion(subjectId, id, patch) {
    const list = getUserQuestions(subjectId);
    const idx = list.findIndex(function (q) {
      return q && q.id === id;
    });
    if (idx < 0) return null;
    list[idx] = Object.assign({}, list[idx], patch, {
      id: id,
      isUser: true,
      placeholder: false,
      updatedAt: Date.now(),
    });
    save();
    return list[idx];
  }

  function deleteUserQuestion(subjectId, id) {
    state.userQuestions[subjectId] = getUserQuestions(subjectId).filter(function (q) {
      return q && q.id !== id;
    });
    save();
  }

  function exportAll() {
    return {
      app: "cpa-unified-bank",
      version: 1,
      exportedAt: new Date().toISOString(),
      activeSubjectId: state.activeSubjectId,
      progress: clone(state.progress),
      tests: clone(state.tests),
      userQuestions: clone(state.userQuestions),
    };
  }

  function importAll(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("导入文件格式不正确");
    }
    if (payload.app && payload.app !== "cpa-unified-bank") {
      throw new Error("这不是本系统导出的数据文件");
    }
    const counts = { answers: { added: 0, updated: 0 }, tests: 0, questions: 0 };
    const now = Date.now();

    const remoteProgress = payload.progress && typeof payload.progress === "object" ? payload.progress : {};
    Object.keys(remoteProgress).forEach(function (subjectId) {
      const local = getProgress(subjectId);
      const remote = remoteProgress[subjectId] || {};
      Object.keys(remote).forEach(function (qid) {
        const remoteAnswer = remote[qid] || {};
        const localAnswer = local[qid];
        if (!localAnswer) {
          local[qid] = remoteAnswer;
          counts.answers.added++;
        } else if ((Number(remoteAnswer.updatedAt) || 0) > (Number(localAnswer.updatedAt) || 0)) {
          local[qid] = remoteAnswer;
          counts.answers.updated++;
        }
      });
    });

    const remoteTests = payload.tests && typeof payload.tests === "object" ? payload.tests : {};
    Object.keys(remoteTests).forEach(function (subjectId) {
      const local = getTests(subjectId);
      (Array.isArray(remoteTests[subjectId]) ? remoteTests[subjectId] : []).forEach(function (test) {
        if (!test || !test.id) return;
        const idx = local.findIndex(function (t) {
          return t && t.id === test.id;
        });
        if (idx < 0) {
          local.push(test);
          counts.tests++;
        } else {
          const localTime = local[idx].submittedAt || local[idx].startedAt || local[idx].createdAt || 0;
          const remoteTime = test.submittedAt || test.startedAt || test.createdAt || 0;
          if (remoteTime >= localTime) {
            local[idx] = test;
            counts.tests++;
          }
        }
      });
      trimTests(subjectId);
    });

    const remoteQuestions =
      payload.userQuestions && typeof payload.userQuestions === "object"
        ? payload.userQuestions
        : {};
    Object.keys(remoteQuestions).forEach(function (subjectId) {
      const local = getUserQuestions(subjectId);
      (Array.isArray(remoteQuestions[subjectId]) ? remoteQuestions[subjectId] : []).forEach(function (q) {
        if (!q) return;
        const id = q.id || newUserQuestionId(subjectId);
        const idx = local.findIndex(function (item) {
          return item && item.id === id;
        });
        const next = Object.assign({}, q, {
          id: id,
          isUser: true,
          placeholder: false,
          updatedAt: q.updatedAt || now,
        });
        if (idx < 0) {
          local.push(next);
          counts.questions++;
        } else if ((Number(q.updatedAt) || 0) >= (Number(local[idx].updatedAt) || 0)) {
          local[idx] = next;
          counts.questions++;
        }
      });
    });

    if (payload.activeSubjectId) state.activeSubjectId = payload.activeSubjectId;
    save();
    return counts;
  }

  function storageBytes() {
    try {
      return new Blob([JSON.stringify(state)]).size;
    } catch (e) {
      return JSON.stringify(state).length;
    }
  }

  CPA.store = {
    key: STORAGE_KEY,
    available: storageAvailable,
    getState: function () {
      return state;
    },
    save: save,
    getProgress: getProgress,
    getAnswer: getAnswer,
    setAnswer: setAnswer,
    setWeak: setWeak,
    resetSubjectProgress: resetSubjectProgress,
    resetAllProgress: resetAllProgress,
    setActiveSubject: setActiveSubject,
    getTests: getTests,
    getTest: getTest,
    getActiveTest: getActiveTest,
    saveTest: saveTest,
    deleteTest: deleteTest,
    getUserQuestions: getUserQuestions,
    addUserQuestion: addUserQuestion,
    addUserQuestionsBulk: addUserQuestionsBulk,
    updateUserQuestion: updateUserQuestion,
    deleteUserQuestion: deleteUserQuestion,
    exportAll: exportAll,
    importAll: importAll,
    storageBytes: storageBytes,
  };
})();
