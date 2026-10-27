/* CPA《会计》科目框架 · 第一章总论待补充正式题目 */

(function () {
  "use strict";

  const ch1 = {
    "id": "ch1",
    "name": "第一章 总论",
    "knowledgePoints": [
      {
        "id": "ch1-k1",
        "name": "会计概述与会计工作责任",
        "questions": []
      },
      {
        "id": "ch1-k2",
        "name": "财务报告目标、会计基本假设和会计基础",
        "questions": []
      },
      {
        "id": "ch1-k3",
        "name": "会计信息质量要求",
        "questions": []
      },
      {
        "id": "ch1-k4",
        "name": "会计要素及其确认与计量",
        "questions": []
      },
      {
        "id": "ch1-k5",
        "name": "可持续信息披露",
        "questions": []
      },
      {
        "id": "ch1-k6",
        "name": "人工智能在会计审计领域的应用",
        "questions": []
      },
      {
        "id": "ch1-k7",
        "name": "注册会计师职业道德",
        "questions": []
      }
    ]
  };

  const chapters = CPA.defineChapters([
    [
      "ch2",
      "第二章 存货"
    ],
    [
      "ch3",
      "第三章 固定资产"
    ],
    [
      "ch4",
      "第四章 无形资产"
    ],
    [
      "ch5",
      "第五章 投资性房地产"
    ],
    [
      "ch6",
      "第六章 长期股权投资与合营安排"
    ],
    [
      "ch7",
      "第七章 资产减值"
    ],
    [
      "ch8",
      "第八章 负债"
    ],
    [
      "ch9",
      "第九章 职工薪酬"
    ],
    [
      "ch10",
      "第十章 股份支付"
    ],
    [
      "ch11",
      "第十一章 借款费用"
    ],
    [
      "ch12",
      "第十二章 或有事项"
    ],
    [
      "ch13",
      "第十三章 金融工具"
    ],
    [
      "ch14",
      "第十四章 租赁"
    ],
    [
      "ch15",
      "第十五章 持有待售的非流动资产、处置组和终止经营"
    ],
    [
      "ch16",
      "第十六章 所有者权益"
    ],
    [
      "ch17",
      "第十七章 收入、费用和利润"
    ],
    [
      "ch18",
      "第十八章 政府补助"
    ],
    [
      "ch19",
      "第十九章 所得税"
    ],
    [
      "ch20",
      "第二十章 非货币性资产交换"
    ],
    [
      "ch21",
      "第二十一章 债务重组"
    ],
    [
      "ch22",
      "第二十二章 外币折算"
    ],
    [
      "ch23",
      "第二十三章 财务报告"
    ],
    [
      "ch24",
      "第二十四章 会计政策、会计估计及其变更和差错更正"
    ],
    [
      "ch25",
      "第二十五章 资产负债表日后事项"
    ],
    [
      "ch26",
      "第二十六章 企业合并"
    ],
    [
      "ch27",
      "第二十七章 合并财务报表"
    ],
    [
      "ch28",
      "第二十八章 每股收益"
    ],
    [
      "ch29",
      "第二十九章 公允价值计量"
    ],
    [
      "ch30",
      "第三十章 政府及民间非营利组织会计"
    ]
  ]);
  chapters.unshift(ch1);

  CPA.registerSubject({
    id: "accounting",
    name: "会计",
    fullName: "CPA《会计》",
    tagline: "准则理解 · 账务处理 · 合并报表",
    description: "覆盖会计要素确认计量、金融工具、收入、所得税、企业合并与合并财务报表等核心内容。",
    accent: "#2563eb",
    icon: "会",
    stage: "专业阶段",
    typeLabels: { calculation: "计算分析题", comprehensive: "综合题" },
    questionTypes: ["single", "multiple", "calculation", "comprehensive"],
    exam: {
      duration: 180,
      passScore: 60,
      note: "框架示例结构，正式题量与分值可在本文件中调整",
      sections: [
        { name: "一、单项选择题", type: "single", count: 12, scorePer: 2 },
        { name: "二、多项选择题", type: "multiple", count: 8, scorePer: 2 },
        { name: "三、计算分析题", type: "calculation", count: 2, scorePer: 12 },
        { name: "四、综合题", type: "comprehensive", count: 2, scorePer: 18 },
      ],
    },
    placeholderProfile: {
      singlesPerChapter: 2,
      multiplesPerChapter: 1,
      subjectives: { calculation: 3, comprehensive: 2 },
    },
    chapters: chapters,
  });
})();
