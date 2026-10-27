/* CPA《税法》科目框架 */
(function () {
  "use strict";

  CPA.registerSubject({
    id: "tax",
    name: "税法",
    fullName: "CPA《税法》",
    tagline: "税种规则 · 计算申报 · 征管实务",
    description: "覆盖增值税、消费税、企业所得税、个人所得税、小税种、国际税收与税收征管。",
    accent: "#c2410c",
    icon: "税",
    stage: "专业阶段",
    typeLabels: { calculation: "计算问答题", comprehensive: "综合题" },
    questionTypes: ["single", "multiple", "calculation", "comprehensive"],
    exam: {
      duration: 120,
      passScore: 60,
      note: "框架示例结构，正式题量与分值可在本文件中调整",
      sections: [
        { name: "一、单项选择题", type: "single", count: 15, scorePer: 1 },
        { name: "二、多项选择题", type: "multiple", count: 10, scorePer: 2 },
        { name: "三、计算问答题", type: "calculation", count: 3, scorePer: 12 },
        { name: "四、综合题", type: "comprehensive", count: 1, scorePer: 29 },
      ],
    },
    placeholderProfile: {
      singlesPerChapter: 2,
      multiplesPerChapter: 1,
      subjectives: { calculation: 4, comprehensive: 2 },
    },
    chapters: CPA.defineChapters([
      ["ch1", "第一章 税法总论"],
      ["ch2", "第二章 增值税法"],
      ["ch3", "第三章 消费税法"],
      ["ch4", "第四章 企业所得税法"],
      ["ch5", "第五章 个人所得税法"],
      ["ch6", "第六章 城市维护建设税法和烟叶税法"],
      ["ch7", "第七章 关税法和船舶吨税法"],
      ["ch8", "第八章 资源税法和环境保护税法"],
      ["ch9", "第九章 城镇土地使用税法和耕地占用税法"],
      ["ch10", "第十章 房产税法、契税法和土地增值税法"],
      ["ch11", "第十一章 车辆购置税法、车船税法和印花税法"],
      ["ch12", "第十二章 国际税收税务管理实务"],
      ["ch13", "第十三章 税收征收管理法"],
      ["ch14", "第十四章 税务行政法制"],
    ]),
  });
})();
