#!/usr/bin/env node
/* 题库数据校验：提交前自检科目数据文件是否合法（无依赖，仅用 Node 内置模块）。
   用法：node tools/qa-data.js            # 校验全部科目
        node tools/qa-data.js accounting  # 只校验指定科目
   退出码：0 = 通过，1 = 存在错误 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const only = process.argv.slice(2);

global.window = global;
global.CPA = global.CPA || {};

function load(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error("缺少文件：" + rel);
  (0, eval)(fs.readFileSync(file, "utf8"));
}

try {
  load("js/core/utils.js");
  load("js/core/registry.js");
  load("data/manifest.js");
} catch (err) {
  console.error("加载失败：" + err.message);
  process.exit(1);
}

const files = Array.isArray(window.CPA_SUBJECT_FILES) ? window.CPA_SUBJECT_FILES : [];
if (!files.length) {
  console.error("data/manifest.js 未登记任何科目文件");
  process.exit(1);
}
files.forEach(load);

if (typeof global.CPA.rebuildAll === "function") global.CPA.rebuildAll();

const errors = [];
const warnings = [];
const globalIds = new Map();
const summary = [];

function checkQuestion(subjectId, q, where) {
  const tag = subjectId + "/" + (q.id || where);
  if (!q.id) errors.push(tag + " 缺少 id");
  if (globalIds.has(q.id)) warnings.push("题目 id 跨科目重复：" + q.id + "（" + globalIds.get(q.id) + " / " + subjectId + "）");
  else globalIds.set(q.id, subjectId);

  const v = global.CPA.validateQuestion(q);
  if (!v.ok) errors.push(tag + " 校验失败：" + v.errors.join("；"));

  if (!q.stem || !String(q.stem).trim()) errors.push(tag + " 题干为空");
  if (!q.placeholder) {
    if (!q.analysis || !String(q.analysis).trim()) errors.push(tag + " 缺少解析");
    if (!q.knowledgePoint || !String(q.knowledgePoint).trim()) errors.push(tag + " 缺少知识点说明");
  }

  const keys = (q.options || []).map((o) => o.key);
  if (new Set(keys).size !== keys.length) errors.push(tag + " 选项 key 重复");
  (q.options || []).forEach((o) => {
    if (!o.text || !String(o.text).trim()) errors.push(tag + " 选项 " + o.key + " 文本为空");
  });

  const answer = Array.isArray(q.answer) ? q.answer : [];
  answer.forEach((a) => {
    if (!keys.includes(a)) errors.push(tag + " 答案 " + a + " 不在选项中");
  });
  if (q.type === "single" && answer.length !== 1) errors.push(tag + " 单选答案应为 1 个，实际 " + answer.length + " 个");
  if (q.type === "multiple" && answer.length < 2) errors.push(tag + " 多选答案应至少 2 个，实际 " + answer.length + " 个");

  if (q.optionAnalysis) {
    Object.keys(q.optionAnalysis).forEach((k) => {
      if (!keys.includes(k)) errors.push(tag + " optionAnalysis 的键 " + k + " 不在选项中");
      if (!String(q.optionAnalysis[k]).trim()) errors.push(tag + " optionAnalysis[" + k + "] 内容为空");
    });
  }

  if (q.subs && q.subs.length) {
    q.subs.forEach((s, i) => {
      if (!s.prompt || !String(s.prompt).trim()) errors.push(tag + " 第 " + (i + 1) + " 小问缺少题干");
      if (!s.answer || !String(s.answer).trim()) errors.push(tag + " 第 " + (i + 1) + " 小问缺少参考答案");
    });
  }
}

const subjects = (global.CPA.subjects || []).filter((s) => !only.length || only.includes(s.id));
if (!subjects.length) {
  console.error("没有匹配的科目：" + (only.join(", ") || "（全部）"));
  process.exit(1);
}

let gTotal = 0;
let gReal = 0;
let gPlaceholder = 0;

subjects.forEach((s) => {
  let total = 0;
  let real = 0;
  let placeholder = 0;
  s.chapters.forEach((ch) => {
    ch.knowledgePoints.forEach((kp) => {
      kp.questions.forEach((q) => {
        total++;
        if (q.placeholder) placeholder++;
        else real++;
        checkQuestion(s.id, q, ch.id + "/" + kp.id);
      });
    });
  });
  gTotal += total;
  gReal += real;
  gPlaceholder += placeholder;
  summary.push(
    s.name.padEnd(6, "　") +
      " 章节 " + String(s.chapters.length).padStart(2, " ") +
      " | 题目 " + String(total).padStart(3, " ") +
      "（正式 " + String(real).padStart(3, " ") + " / 占位 " + String(placeholder).padStart(3, " ") + "）"
  );
});

console.log("科目数据校验");
console.log("-------------");
summary.forEach((line) => console.log(line));
console.log("-------------");
console.log("合计 " + subjects.length + " 科 / " + gTotal + " 题（正式 " + gReal + "，占位 " + gPlaceholder + "）");

if (warnings.length) {
  console.log("\n提示 " + warnings.length + " 条：");
  warnings.slice(0, 20).forEach((w) => console.log(" - " + w));
}

if (errors.length) {
  console.log("\n错误 " + errors.length + " 条：");
  errors.slice(0, 60).forEach((e) => console.log(" - " + e));
  if (errors.length > 60) console.log(" … 其余 " + (errors.length - 60) + " 条省略");
  process.exit(1);
}

console.log("\n校验通过：题目 id 唯一、答案与选项一致、解析与知识点齐全。");
