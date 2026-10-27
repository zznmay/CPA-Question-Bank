/* CPA《财务成本管理》科目框架 */
(function () {
  "use strict";

  CPA.registerSubject({
    id: "finance",
    name: "财管",
    fullName: "CPA《财务成本管理》",
    tagline: "估值决策 · 成本管理 · 业绩评价",
    description: "覆盖财务报表分析、资本预算、价值评估、资本结构、营运资本、成本计算与管理会计。",
    accent: "#0f766e",
    icon: "财",
    stage: "专业阶段",
    typeLabels: { calculation: "计算分析题", comprehensive: "综合题" },
    questionTypes: ["single", "multiple", "calculation", "comprehensive"],
    exam: {
      duration: 150,
      passScore: 60,
      note: "框架示例结构，正式题量与分值可在本文件中调整",
      sections: [
        { name: "一、单项选择题", type: "single", count: 12, scorePer: 1.5 },
        { name: "二、多项选择题", type: "multiple", count: 8, scorePer: 2 },
        { name: "三、计算分析题", type: "calculation", count: 3, scorePer: 12 },
        { name: "四、综合题", type: "comprehensive", count: 1, scorePer: 30 },
      ],
    },
    placeholderProfile: {
      singlesPerChapter: 2,
      multiplesPerChapter: 1,
      subjectives: { calculation: 4, comprehensive: 2 },
    },
    chapters: CPA.defineChapters([
      ["ch1", "第一章 财务管理基本原理"],
      ["ch2", "第二章 财务报表分析和财务预测"],
      ["ch3", "第三章 价值评估基础"],
      ["ch4", "第四章 资本成本"],
      ["ch5", "第五章 投资项目资本预算"],
      ["ch6", "第六章 债券、股票价值评估"],
      ["ch7", "第七章 期权价值评估"],
      ["ch8", "第八章 企业价值评估"],
      ["ch9", "第九章 资本结构"],
      ["ch10", "第十章 长期筹资"],
      ["ch11", "第十一章 股利分配、股票分割与股票回购"],
      ["ch12", "第十二章 营运资本管理"],
      ["ch13", "第十三章 产品成本计算"],
      ["ch14", "第十四章 标准成本法"],
      ["ch15", "第十五章 作业成本法"],
      ["ch16", "第十六章 本量利分析"],
      ["ch17", "第十七章 短期经营决策"],
      ["ch18", "第十八章 全面预算"],
      ["ch19", "第十九章 责任会计"],
      ["ch20", "第二十章 业绩评价"],
    ]),
  });
})();
