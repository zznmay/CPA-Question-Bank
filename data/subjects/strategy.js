/* CPA《公司战略与风险管理》科目框架 */
(function () {
  "use strict";

  CPA.registerSubject({
    id: "strategy",
    name: "战略",
    fullName: "CPA《公司战略与风险管理》",
    tagline: "战略分析 · 风险内控 · 综合案例",
    description: "覆盖战略管理与分析、战略选择与实施、公司治理、风险管理、内部控制与信息系统。",
    accent: "#4d7c0f",
    icon: "战",
    stage: "专业阶段",
    typeLabels: { short: "简答题", comprehensive: "综合题" },
    questionTypes: ["single", "multiple", "short", "comprehensive"],
    exam: {
      duration: 120,
      passScore: 60,
      note: "框架示例结构，正式题量与分值可在本文件中调整",
      sections: [
        { name: "一、单项选择题", type: "single", count: 15, scorePer: 1 },
        { name: "二、多项选择题", type: "multiple", count: 10, scorePer: 2 },
        { name: "三、简答题", type: "short", count: 3, scorePer: 10 },
        { name: "四、综合题", type: "comprehensive", count: 1, scorePer: 35 },
      ],
    },
    placeholderProfile: {
      singlesPerChapter: 2,
      multiplesPerChapter: 2,
      subjectives: { short: 4, comprehensive: 2 },
    },
    chapters: CPA.defineChapters([
      ["ch1", "第一章 战略与战略管理"],
      ["ch2", "第二章 战略分析"],
      ["ch3", "第三章 战略选择"],
      ["ch4", "第四章 战略实施"],
      ["ch5", "第五章 公司治理"],
      ["ch6", "第六章 风险与风险管理"],
      ["ch7", "第七章 内部控制"],
      ["ch8", "第八章 管理信息系统的应用"],
    ]),
  });
})();
