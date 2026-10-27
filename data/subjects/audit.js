/* CPA《审计》科目框架 */
(function () {
  "use strict";

  CPA.registerSubject({
    id: "audit",
    name: "审计",
    fullName: "CPA《审计》",
    tagline: "风险识别 · 程序证据 · 审计报告",
    description: "覆盖审计计划、风险评估与应对、业务循环审计、审计报告、质量控制与职业道德。",
    accent: "#7c3aed",
    icon: "审",
    stage: "专业阶段",
    typeLabels: { short: "简答题", comprehensive: "综合题" },
    questionTypes: ["single", "multiple", "short", "comprehensive"],
    exam: {
      duration: 150,
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
      multiplesPerChapter: 1,
      subjectives: { short: 4, comprehensive: 2 },
    },
    chapters: CPA.defineChapters([
      ["ch1", "第一章 审计概述"],
      ["ch2", "第二章 审计计划"],
      ["ch3", "第三章 审计证据"],
      ["ch4", "第四章 审计抽样"],
      ["ch5", "第五章 信息技术对审计的影响"],
      ["ch6", "第六章 审计工作底稿"],
      ["ch7", "第七章 风险评估"],
      ["ch8", "第八章 风险应对"],
      ["ch9", "第九章 销售与收款循环的审计"],
      ["ch10", "第十章 采购与付款循环的审计"],
      ["ch11", "第十一章 生产与存货循环的审计"],
      ["ch12", "第十二章 货币资金的审计"],
      ["ch13", "第十三章 对舞弊和法律法规的考虑"],
      ["ch14", "第十四章 审计沟通"],
      ["ch15", "第十五章 注册会计师利用他人的工作"],
      ["ch16", "第十六章 对集团财务报表审计的特殊考虑"],
      ["ch17", "第十七章 其他特殊项目的审计"],
      ["ch18", "第十八章 完成审计工作"],
      ["ch19", "第十九章 审计报告"],
      ["ch20", "第二十章 企业内部控制审计"],
      ["ch21", "第二十一章 会计师事务所业务质量管理"],
      ["ch22", "第二十二章 职业道德基本原则和概念框架"],
      ["ch23", "第二十三章 审计业务对独立性的要求"],
    ]),
  });
})();
