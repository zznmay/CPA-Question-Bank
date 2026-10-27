/* CPA 统一题库 · 基于 hash 的路由 */
(function () {
  "use strict";

  const CPA = (window.CPA = window.CPA || {});

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }

  function parse() {
    const raw = (location.hash || "").replace(/^#/, "");
    const split = raw.split("?");
    const pathPart = split[0] || "/";
    const query = {};
    new URLSearchParams(split[1] || "").forEach(function (value, key) {
      query[key] = value;
    });
    const parts = pathPart.split("/").filter(Boolean).map(decode);

    const route = {
      view: "home",
      subjectId: null,
      testId: null,
      query: query,
      path: pathPart || "/",
    };

    if (parts[0] === "s" && parts[1]) {
      route.subjectId = parts[1];
      const view = parts[2] || "practice";
      if (view === "test") {
        route.view = "test";
        route.testId = parts[3] || null;
      } else if (view === "entry") {
        route.view = "entry";
      } else {
        route.view = "practice";
      }
    }
    return route;
  }

  function go(path) {
    const next = path.charAt(0) === "#" ? path : "#" + path;
    if (location.hash === next) {
      if (CPA.app && CPA.app.rerender) CPA.app.rerender();
      return;
    }
    location.hash = next;
  }

  function replace(path) {
    const next = path.charAt(0) === "#" ? path : "#" + path;
    history.replaceState(null, "", next);
  }

  function subjectPath(subjectId, view) {
    return "#/s/" + encodeURIComponent(subjectId) + "/" + (view || "practice");
  }

  function onChange(handler) {
    window.addEventListener("hashchange", handler);
  }

  CPA.router = {
    parse: parse,
    go: go,
    replace: replace,
    onChange: onChange,
    subjectPath: subjectPath,
  };
})();
