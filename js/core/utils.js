/* CPA 统一题库 · 通用工具 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});

  const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function shuffle(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function arrEq(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const as = a.map(String).slice().sort();
    const bs = b.map(String).slice().sort();
    return as.every((v, i) => v === bs[i]);
  }

  function uid(prefix) {
    return (
      (prefix || "id") +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return (h > 0 ? h + ":" + pad2(m) : pad2(m)) + ":" + pad2(s);
  }

  function formatMinutes(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 60) return minutes + " 分钟";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + " 小时" + (m ? " " + m + " 分" : "");
  }

  function formatDate(value, withTime) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    if (!withTime) return y + "-" + m + "-" + day;
    return y + "-" + m + "-" + day + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function truncate(text, max) {
    const s = String(text || "").replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    return s.slice(0, Math.max(1, max - 1)) + "…";
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait || 300);
    };
  }

  function toast(message, type, duration) {
    const root = document.getElementById("toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast toast-" + (type || "success");
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("show");
    });
    setTimeout(
      function () {
        el.classList.remove("show");
        setTimeout(function () {
          el.remove();
        }, 260);
      },
      duration || 2600
    );
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function readTextFile(file, onLoad, onError) {
    const reader = new FileReader();
    reader.onload = function (e) {
      onLoad(String(e.target.result || "").replace(/^\uFEFF/, ""));
    };
    reader.onerror = function () {
      if (onError) onError(reader.error || new Error("文件读取失败"));
    };
    reader.readAsText(file, "utf-8");
  }

  function cssEscapeAttr(value) {
    return esc(value);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return fallbackCopy(text);
        }
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  function plural(n, unit) {
    return n + " " + unit;
  }

  CPA.utils = {
    esc: esc,
    $: $,
    $$: $$,
    shuffle: shuffle,
    arrEq: arrEq,
    uid: uid,
    clamp: clamp,
    pad2: pad2,
    formatClock: formatClock,
    formatMinutes: formatMinutes,
    formatDate: formatDate,
    truncate: truncate,
    debounce: debounce,
    toast: toast,
    downloadJson: downloadJson,
    readTextFile: readTextFile,
    cssEscapeAttr: cssEscapeAttr,
    copyText: copyText,
    plural: plural,
  };
})();
