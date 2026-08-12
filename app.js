(function initPromptGenerator(root) {
  const data = typeof module !== "undefined" && module.exports
    ? require("./prompt-data.js")
    : root.promptData;
  const premiumStyles = typeof module !== "undefined" && module.exports
    ? safeRequirePremiumStyles()
    : root.premiumTypeStyles;
  const chineseDramaStyles = typeof module !== "undefined" && module.exports
    ? safeRequireChineseDramaStyles()
    : root.chineseDramaStyles;

  const categoryLabels = {
    all: "全部影调",
    directors: "导演影调",
    types: "类型影调",
    premiumTypes: "高级影调",
    chineseDrama: "中国影视",
    scenes: "场景影调"
  };

  const referenceYearMap = {
    "一次别离": "2011",
    "小偷家族": "2018",
    "海边的曼彻斯特": "2016",
    "爱": "2012",
    "隐藏摄像机": "2005",
    "过客": "1975",
    "小鞋子": "1997",
    "何处是我朋友的家": "1987",
    "中央车站": "1998",
    "花样年华": "2000",
    "英国病人": "1996",
    "断背山": "2005",
    "东京物语": "1953",
    "悲情城市": "1989",
    "一一": "2000",
    "迷失东京": "2003",
    "她": "2013",
    "路边野餐": "2015",
    "地球最后的夜晚": "2018",
    "南方车站的聚会": "2019",
    "第七封印": "1957",
    "假面": "1966",
    "冬日之光": "1963",
    "冬眠": "2014",
    "远方": "2002",
    "野梨树": "2018",
    "血色将至": "2007",
    "卡罗尔": "2015",
    "布鲁克林": "2015",
    "末代皇帝": "1987",
    "乱": "1985",
    "角斗士": "2000",
    "巴里·林登": "1975",
    "豹": "1963",
    "宠儿": "2018",
    "拆弹部队": "2008",
    "猎杀本·拉登": "2012",
    "黑鹰坠落": "2001",
    "拯救大兵瑞恩": "1998",
    "敦刻尔克": "2017",
    "1917": "2019",
    "英雄": "2002",
    "影": "2018",
    "满城尽带黄金甲": "2006",
    "沙丘": "2021",
    "阿拉伯的劳伦斯": "1962",
    "木乃伊": "1999",
    "天国王朝": "2005",
    "最后的决斗": "2021",
    "辛德勒的名单": "1993",
    "2001太空漫游": "1968",
    "机械姬": "2014",
    "月球": "2009",
    "银翼杀手2049": "2017",
    "降临": "2016",
    "银翼杀手": "1982",
    "攻壳机动队": "1995",
    "阿丽塔：战斗天使": "2019",
    "少数派报告": "2002",
    "异形": "1979",
    "湮灭": "2018",
    "怪形": "1982",
    "星球大战": "1977",
    "银河护卫队": "2014",
    "潘神的迷宫": "2006",
    "水形物语": "2017",
    "猩红山峰": "2015",
    "黑客帝国": "1999",
    "盗火线": "1995",
    "夜行者": "2014",
    "洛城机密": "1997",
    "七宗罪": "1995",
    "十二宫": "2007",
    "沉默的羔羊": "1991",
    "暗战": "1999",
    "枪火": "1999",
    "无间道": "2002",
    "教父": "1972",
    "美国往事": "1984",
    "好家伙": "1990",
    "龙纹身的女孩": "2011",
    "老无所依": "2007",
    "亡命驾驶": "2011",
    "霓虹恶魔": "2016",
    "疾速追杀": "2014",
    "唐人街": "1974",
    "马耳他之鹰": "1941",
    "双重赔偿": "1944",
    "边境杀手": "2015",
    "赴汤蹈火": "2016",
    "独行杀手": "1967",
    "红圈": "1970",
    "影子部队": "1969",
    "消失的爱人": "2014",
    "黑天鹅": "2010",
    "搏击俱乐部": "1999",
    "逃出绝命镇": "2017",
    "我们": "2019",
    "仲夏夜惊魂": "2019",
    "女巫": "2015",
    "柳条人": "1973",
    "闪灵": "1980",
    "招魂": "2013",
    "碟中谍：幽灵协议": "2011",
    "007：大破天幕杀机": "2012",
    "谍影重重": "2002",
    "锅匠，裁缝，士兵，间谍": "2011",
    "007：大战皇家赌场": "2006",
    "英雄本色": "1986",
    "喋血双雄": "1989",
    "辣手神探": "1992",
    "疯狂的麦克斯2": "1981",
    "卧虎藏龙": "2000",
    "一代宗师": "2013",
    "刺客聂隐娘": "2015",
    "新龙门客栈": "1992",
    "蜀山传": "2001",
    "青蛇": "1993",
    "夺宝奇兵": "1981",
    "金刚": "2005",
    "侏罗纪公园": "1993",
    "加勒比海盗": "2003",
    "少年派的奇幻漂流": "2012",
    "法国贩毒网": "1971",
    "极盗车神": "2017",
    "古墓丽影": "2001",
    "重庆森林": "1994",
    "堕落天使": "1995",
    "爱在黎明破晓前": "1995",
    "请以你的名字呼唤我": "2017",
    "阳光灿烂的日子": "1994",
    "怦然心动": "2010",
    "海街日记": "2015",
    "比海更深": "2016",
    "情书": "1995",
    "红磨坊": "2001",
    "爱乐之城": "2016",
    "芝加哥": "2002",
    "爆裂鼓手": "2014",
    "一个明星的诞生": "2018",
    "处女之死": "1999",
    "绝代艳后": "2006",
    "春光乍泄": "1997",
    "雨中曲": "1952",
    "赎罪": "2007",
    "布达佩斯大饭店": "2014",
    "天使爱美丽": "2001",
    "剪刀手爱德华": "1990",
    "大吉岭有限公司": "2007",
    "饮食男女": "1994",
    "阳光小美女": "2006",
    "东京家族": "2013",
    "甲方乙方": "1997",
    "手机": "2003",
    "人在囧途": "2010",
    "实习生": "2015",
    "穿普拉达的女王": "2006",
    "诺丁山": "1999",
    "冰血暴": "1996",
    "三块广告牌": "2017",
    "月升王国": "2012",
    "小妇人": "2019",
    "欢乐满人间": "1964",
    "E.T.外星人": "1982",
    "龙猫": "1988",
    "寄生虫": "2019",
    "上流社会": "2018",
    "方形": "2017",
    "摘金奇缘": "2018",
    "了不起的狐狸爸爸": "2009",
    "帕丁顿熊": "2014",
    "幽灵公主": "1997",
    "天空之城": "1986",
    "风之谷": "1984",
    "红辣椒": "2006",
    "千年女优": "2001",
    "未麻的部屋": "1997",
    "犬之岛": "2018",
    "鬼妈妈": "2009",
    "海洋之歌": "2014",
    "养家之人": "2017",
    "辉夜姬物语": "2013",
    "阿基拉": "1988",
    "去年在马里昂巴德": "1961",
    "狗镇": "2003",
    "资产阶级的审慎魅力": "1972",
    "自由的幻影": "1974",
    "一条安达鲁狗": "1929",
    "进入虚空": "2009",
    "穆赫兰道": "2001",
    "生命之树": "2011",
    "圣女贞德蒙难记": "1928",
    "沉默": "2016",
    "亲爱的，不要跨过那条江": "2014",
    "人生七年": "1964",
    "寻找小糖人": "2012",
    "聚焦": "2015",
    "总统班底": "1976",
    "内幕": "1999",
    "对不起，我们错过了你": "2019",
    "我是布莱克": "2016",
    "站台": "2000",
    "三峡好人": "2006",
    "山河故人": "2015",
    "出租车": "2015",
    "十": "2002",
    "樱桃的滋味": "1997",
    "摩托日记": "2004",
    "德州巴黎": "1984",
    "出租车司机": "1976",
    "寻梦环游记": "2017",
    "天堂的颜色": "1999",
    "廷巴克图": "2014",
    "焦土之城": "2010",
    "浩劫重生": "2000",
    "流浪地球": "2019"
  };

  const directorReferenceMap = {
    D001: ["2001太空漫游（1968）", "闪灵（1980）", "巴里·林登（1975）"],
    D002: ["惊魂记（1960）", "迷魂记（1958）", "后窗（1954）"],
    D003: ["教父（1972）", "现代启示录（1979）", "对话（1974）"],
    D004: ["出租车司机（1976）", "好家伙（1990）", "愤怒的公牛（1980）"],
    D005: ["E.T.外星人（1982）", "辛德勒的名单（1993）", "拯救大兵瑞恩（1998）"],
    D006: ["银翼杀手（1982）", "异形（1979）", "角斗士（2000）"],
    D007: ["七宗罪（1995）", "搏击俱乐部（1999）", "社交网络（2010）"],
    D008: ["黑暗骑士（2008）", "盗梦空间（2010）", "敦刻尔克（2017）"],
    D009: ["降临（2016）", "银翼杀手2049（2017）", "沙丘（2021）"],
    D010: ["天堂之日（1978）", "生命之树（2011）", "细细的红线（1998）"],
    D011: ["低俗小说（1994）", "杀死比尔（2003）", "被解救的姜戈（2012）"],
    D012: ["布达佩斯大饭店（2014）", "月升王国（2012）", "犬之岛（2018）"],
    D013: ["逃出绝命镇（2017）", "我们（2019）", "不（2022）"],
    D014: ["第七封印（1957）", "假面（1966）", "野草莓（1957）"],
    D015: ["镜子（1975）", "潜行者（1979）", "乡愁（1983）"],
    D016: ["八部半（1963）", "甜蜜的生活（1960）", "大路（1954）"],
    D017: ["奇遇（1960）", "放大（1966）", "红色沙漠（1964）"],
    D018: ["黄金三镖客（1966）", "美国往事（1984）", "西部往事（1968）"],
    D019: ["精疲力尽（1960）", "狂人皮埃罗（1965）", "轻蔑（1963）"],
    D020: ["独行杀手（1967）", "红圈（1970）", "影子部队（1969）"],
    D021: ["爱（2012）", "白丝带（2009）", "隐藏摄像机（2005）"],
    D022: ["关于我母亲的一切（1999）", "对她说（2002）", "痛苦与荣耀（2019）"],
    D023: ["阴风阵阵（1977）", "深红（1975）", "神话（1985）"],
    D024: ["亡命驾驶（2011）", "霓虹恶魔（2016）", "唯神能恕（2013）"],
    D025: ["潘神的迷宫（2006）", "水形物语（2017）", "地狱男爵（2004）"],
    D026: ["七武士（1954）", "乱（1985）", "罗生门（1950）"],
    D027: ["东京物语（1953）", "晚春（1949）", "秋刀鱼之味（1962）"],
    D028: ["千与千寻（2001）", "龙猫（1988）", "幽灵公主（1997）"],
    D029: ["红辣椒（2006）", "未麻的部屋（1997）", "千年女优（2001）"],
    D030: ["小偷家族（2018）", "无人知晓（2004）", "海街日记（2015）"],
    D031: ["花火（1997）", "奏鸣曲（1993）", "菊次郎的夏天（1999）"],
    D032: ["花样年华（2000）", "重庆森林（1994）", "春光乍泄（1997）"],
    D033: ["英雄本色（1986）", "喋血双雄（1989）", "变脸（1997）"],
    D034: ["新龙门客栈（1992）", "黄飞鸿（1991）", "青蛇（1993）"],
    D035: ["枪火（1999）", "黑社会（2005）", "暗战（1999）"],
    D036: ["卧虎藏龙（2000）", "断背山（2005）", "少年派的奇幻漂流（2012）"],
    D037: ["一一（2000）", "牯岭街少年杀人事件（1991）", "恐怖分子（1986）"],
    D038: ["悲情城市（1989）", "海上花（1998）", "刺客聂隐娘（2015）"],
    D039: ["爱情万岁（1994）", "河流（1997）", "不散（2003）"],
    D040: ["红高粱（1988）", "英雄（2002）", "影（2018）"],
    D041: ["霸王别姬（1993）", "黄土地（1984）", "妖猫传（2017）"],
    D042: ["站台（2000）", "三峡好人（2006）", "山河故人（2015）"],
    D043: ["苏州河（2000）", "推拿（2014）", "风中有朵雨做的云（2018）"],
    D044: ["路边野餐（2015）", "地球最后的夜晚（2018）", "狂野时代（2025）"],
    D045: ["老男孩（2003）", "小姐（2016）", "分手的决心（2022）"],
    D046: ["寄生虫（2019）", "杀人回忆（2003）", "汉江怪物（2006）"],
    D047: ["燃烧（2018）", "薄荷糖（1999）", "诗（2010）"],
    D048: ["哭声（2016）", "追击者（2008）", "黄海（2010）"],
    D049: ["大地之歌（1955）", "音乐室（1958）", "大树之歌（1959）"],
    D050: ["何处是我朋友的家（1987）", "樱桃的滋味（1997）", "特写（1990）"],
    D051: ["冬眠（2014）", "远方（2002）", "野梨树（2018）"],
    D052: ["红磨坊（2001）", "了不起的盖茨比（2013）", "罗密欧与朱丽叶（1996）"]
  };

  const typeReferenceMap = {
    T01: ["双重赔偿（1944）", "马耳他之鹰（1941）", "第三人（1949）"],
    T02: ["唐人街（1974）", "银翼杀手（1982）", "亡命驾驶（2011）"],
    T03: ["七宗罪（1995）", "黑天鹅（2010）", "禁闭岛（2010）"],
    T04: ["驱魔人（1973）", "招魂（2013）", "午夜凶铃（1998）"],
    T05: ["异教徒（1973）", "女巫（2015）", "仲夏魇（2019）"],
    T06: ["2001太空漫游（1968）", "星际穿越（2014）", "火星救援（2015）"],
    T07: ["银翼杀手（1982）", "攻壳机动队（1995）", "银翼杀手2049（2017）"],
    T08: ["巴西（1985）", "人类之子（2006）", "1984（1984）"],
    T09: ["拯救大兵瑞恩（1998）", "1917（2019）", "敦刻尔克（2017）"],
    T10: ["黑鹰坠落（2001）", "边境杀手（2015）", "危机13小时（2016）"],
    T11: ["英雄（2002）", "卧虎藏龙（2000）", "刺客聂隐娘（2015）"],
    T12: ["指环王：护戒使者（2001）", "潘神的迷宫（2006）", "绿衣骑士（2021）"],
    T13: ["教父（1972）", "好家伙（1990）", "美国往事（1984）"],
    T14: ["盗火线（1995）", "法国贩毒网（1971）", "突袭（2011）"],
    T15: ["德州巴黎（1984）", "末路狂花（1991）", "无依之地（2020）"],
    T16: ["四百击（1959）", "少年时代（2014）", "伯德小姐（2017）"],
    T17: ["花样年华（2000）", "相见恨晚（1945）", "燃烧女子的肖像（2019）"],
    T18: ["一一（2000）", "一次别离（2011）", "驾驶我的车（2021）"],
    T19: ["东京物语（1953）", "步履不停（2008）", "婚姻故事（2019）"],
    T20: ["巴里·林登（1975）", "宠儿（2018）", "绝代艳后（2006）"],
    T21: ["奇爱博士（1964）", "龙虾（2015）", "悲情三角（2022）"],
    T22: ["雨中曲（1952）", "爱乐之城（2016）", "芝加哥（2002）"],
    T23: ["无依之地（2020）", "骑士（2017）", "鱼缸（2009）"],
    T24: ["假面（1966）", "去年在马里昂巴德（1961）", "石榴的颜色（1969）"]
  };

  const sceneReferenceMap = {
    S01: ["天堂之日（1978）", "生命之树（2011）", "请以你的名字呼唤我（2017）"],
    S02: ["阿拉伯的劳伦斯（1962）", "老无所依（2007）", "正午（1952）"],
    S03: ["天堂之日（1978）", "花样年华（2000）", "神枪手之死（2007）"],
    S04: ["月光男孩（2016）", "盗火线（1995）", "迷失东京（2003）"],
    S05: ["出租车司机（1976）", "借刀杀人（2004）", "夜行者（2014）"],
    S06: ["囚徒（2013）", "杀人回忆（2003）", "都灵之马（2011）"],
    S07: ["花样年华（2000）", "罗生门（1950）", "毁灭之路（2002）"],
    S08: ["七武士（1954）", "寄生虫（2019）", "银翼杀手2049（2017）"],
    S09: ["迷雾（2007）", "潜行者（1979）", "小岛惊魂（2001）"],
    S10: ["钢琴课（1993）", "燃烧女子的肖像（2019）", "月光男孩（2016）"],
    S11: ["荒野猎人（2015）", "女巫（2015）", "幽灵公主（1997）"],
    S12: ["阿拉伯的劳伦斯（1962）", "沙丘（2021）", "疯狂的麦克斯：狂暴之路（2015）"],
    S13: ["小岛惊魂（2001）", "小姐（2016）", "大红灯笼高高挂（1991）"],
    S14: ["她（2013）", "一次别离（2011）", "燃烧（2018）"],
    S15: ["饮食男女（1994）", "寄生虫（2019）", "教父（1972）"],
    S16: ["花样年华（2000）", "卡罗尔（2015）", "迷失东京（2003）"],
    S17: ["闪灵（1980）", "2046（2004）", "巴顿·芬克（1991）"],
    S18: ["社交网络（2010）", "公寓春光（1960）", "助理（2019）"],
    S19: ["飞越疯人院（1975）", "圣鹿之死（2017）", "关于我母亲的一切（1999）"],
    S20: ["沉默的羔羊（1991）", "十二宫（2007）", "黑暗骑士（2008）"],
    S21: ["寄生虫（2019）", "十二宫（2007）", "沉默的羔羊（1991）"],
    S22: ["终结者2（1991）", "机械师（2004）", "机器战警（1987）"],
    S23: ["银翼杀手（1982）", "重庆森林（1994）", "堕落天使（1995）"],
    S24: ["第三人（1949）", "上帝之城（2002）", "突袭2：暴徒（2014）"],
    S25: ["法国贩毒网（1971）", "黑天鹅（2010）", "小丑（2019）"],
    S26: ["迷魂记（1958）", "黑暗骑士（2008）", "怒火青春（1995）"],
    S27: ["上帝之城（2002）", "贫民窟的百万富翁（2008）", "小偷家族（2018）"],
    S28: ["寄生虫（2019）", "了不起的盖茨比（2013）", "利刃出鞘（2019）"],
    S29: ["疯狂的麦克斯：狂暴之路（2015）", "谍影重重3（2007）", "法国贩毒网（1971）"],
    S30: ["盗火线（1995）", "黄金三镖客（1966）", "边境杀手（2015）"],
    S31: ["相见恨晚（1945）", "卡萨布兰卡（1942）", "瑟堡的雨伞（1964）"],
    S32: ["穆赫兰道（2001）", "八部半（1963）", "镜子（1975）"],
    S33: ["猛鬼街（1984）", "异世浮生（1990）", "黑天鹅（2010）"],
    S34: ["异形（1979）", "怪形（1982）", "汉江怪物（2006）"],
    S35: ["异教徒（1973）", "仲夏魇（2019）", "灵媒（2021）"],
    S36: ["肖申克的救赎（1994）", "人类之子（2006）", "生命之树（2011）"]
  };

  function safeRequirePremiumStyles() {
    try {
      return require("./premium-type-styles.js");
    } catch (error) {
      return [];
    }
  }

  function safeRequireChineseDramaStyles() {
    try {
      return require("./chinese-drama-styles.js");
    } catch (error) {
      return [];
    }
  }

  function withExtraStyles(promptData) {
    return {
      ...promptData,
      premiumTypes: promptData.premiumTypes || premiumStyles || [],
      chineseDrama: promptData.chineseDrama || chineseDramaStyles || []
    };
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }

  function itemSearchText(item) {
    return normalizeText([
      item.id,
      item.name,
      item.country || "",
      item.group || "",
      (item.tags || []).join(" "),
      (item.references || []).join(" "),
      item.scenarios || "",
      item.color || "",
      item.lighting || "",
      item.camera || "",
      item.texture || "",
      item.avoid || "",
      item.audit || "",
      item.prompt
    ].join(" "));
  }

  function directorCountries(promptData) {
    return [...new Set((promptData.directors || []).map((item) => item.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function allItems(promptData) {
    const mergedData = withExtraStyles(promptData);
    return [
      ...mergedData.directors.map((item) => upgradeItem({ ...item, category: "directors" })),
      ...mergedData.types.map((item) => upgradeItem({ ...item, category: "types" })),
      ...mergedData.premiumTypes.map((item) => upgradeItem({ ...item, category: "premiumTypes" })),
      ...mergedData.chineseDrama.map((item) => upgradeItem({ ...item, category: "chineseDrama" })),
      ...mergedData.scenes.map((item) => upgradeItem({ ...item, category: "scenes" }))
    ];
  }

  function searchItems(promptData, query, category = "all", country = "all") {
    const terms = String(query || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeText);

    return allItems(promptData)
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => country === "all" || (item.category === "directors" && item.country === country))
      .filter((item) => {
        if (!terms.length) return true;
        const haystack = itemSearchText(item);
        return terms.every((term) => haystack.includes(term));
      });
  }

  function compactParts(parts) {
    return parts
      .map((part) => String(part || "").trim())
      .filter(Boolean);
  }

  function shortText(value, maxLength = 42) {
    const text = String(value || "").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
  }

  function compactReferences(references) {
    if (!references || !references.length) return "";
    return references.slice(0, 3).join(" / ");
  }

  function formatReferenceTitle(reference) {
    const title = String(reference || "").trim();
    if (!title) return "";
    return /^《.*》$/.test(title) ? title : `《${title}》`;
  }

  function referencePromptLines(itemOrReferences) {
    const item = Array.isArray(itemOrReferences) ? null : itemOrReferences;
    const references = Array.isArray(itemOrReferences)
      ? itemOrReferences
      : (itemOrReferences && itemOrReferences.references) || [];
    return references.slice(0, 3)
      .map((reference, index) => {
        const title = formatReferenceTitle(reference);
        if (!title) return "";
        const styleName = item && item.name ? `；保留「${item.name}」的色调、光影、镜头和材质方向` : "";
        return `参考${index + 1}：只参考${title}的影调，不混合其他参考片${styleName}`;
      })
      .filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderReferenceFilms(itemOrReferences) {
    const prompts = referencePromptLines(itemOrReferences);
    if (!prompts.length) return "";
    const lines = prompts
      .map((prompt) => `<span class="reference-line">${escapeHtml(prompt)}</span>`)
      .join("");
    return `<span class="result-refs">${lines}</span>`;
  }

  function renderPromptDetails(item) {
    if (!item) return "";
    const details = [
      ["色调", item.color],
      ["光影", item.lighting],
      ["镜头", item.camera],
      ["材质", item.texture],
      ["适合", item.scenarios],
      ["避免", item.avoid]
    ];
    const rows = details
      .map(([label, value]) => {
        const text = shortText(value, label === "避免" ? 54 : 48);
        return `<span class="detail-item"><b>${label}</b><span class="detail-value" title="${escapeHtml(value)}">${escapeHtml(text)}</span></span>`;
      })
      .join("");
    return `<span class="result-detail-grid">${rows}</span>`;
  }

  function addReferenceYears(references) {
    return (references || []).map((reference) => {
      if (/\d{4}/.test(reference)) return reference;
      const year = referenceYearMap[reference];
      return year ? `${reference}（${year}）` : reference;
    });
  }

  function itemReferences(item) {
    if (item.references && item.references.length) return item.references;
    if (item.category === "directors") return directorReferenceMap[item.id] || [];
    if (item.category === "types") return typeReferenceMap[item.id] || [];
    if (item.category === "scenes") return sceneReferenceMap[item.id] || [];
    return [];
  }

  function neutralizeDirectorPrompt(item) {
    if (item.category !== "directors") return item.prompt || "";
    return String(item.prompt || "").replace(/^参考\s*[^，]+的视觉语言，/, "");
  }

  function pickClauses(text, patterns, fallback) {
    const clauses = String(text || "")
      .split(/[，。；;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const picked = clauses.filter((part) => patterns.some((pattern) => pattern.test(part)));
    return compactParts(picked).slice(0, 4).join("，") || fallback;
  }

  function scenarioText(item) {
    if (item.scenarios) return item.scenarios;
    if (item.category === "directors") return `${(item.tags || []).slice(0, 3).join("、")}场景，适合建立明确作者气质的关键镜头`;
    if (item.category === "scenes") return `${item.name}场景，可叠加任意导演或类型影调`;
    if (item.category === "chineseDrama") return `${item.group || "中国影视"}中的${(item.tags || []).slice(0, 3).join("、")}段落`;
    return `${(item.tags || []).slice(0, 3).join("、")}题材，适合做主视觉或关键场面参考`;
  }

  function avoidText(item) {
    const base = [];
    const text = `${item.name} ${(item.tags || []).join(" ")} ${item.prompt || ""}`;
    if (/古偶|仙侠|柔光|清透/.test(text)) base.push("避免塑料磨皮、过曝柔光、廉价棚拍感");
    if (/现实|纪实|家庭|社会|乡村/.test(text)) base.push("避免过度戏剧化打光、过强滤镜、人物皮肤失真");
    if (/动作|战争|军事|追逐|犯罪/.test(text)) base.push("避免动作主体不清、枪火过曝、空间方向混乱");
    if (/恐怖|惊悚|悬疑|黑色/.test(text)) base.push("避免暗部死黑、只靠黑画面制造恐怖");
    if (!base.length) base.push("避免过曝、塑料质感、AI 油腻感、背景杂乱失控");
    return [...new Set(base)].join("；");
  }

  function buildIntensity(item, basePrompt) {
    return {
      realistic: `写实版：${basePrompt}，降低风格化，保留自然光源和真实材质`,
      cinematic: `电影版：${basePrompt}，加强光影层次、构图秩序和镜头运动`,
      stylized: `强风格版：${basePrompt}，放大色彩倾向、明暗反差、空气质感和情绪压迫`
    };
  }

  function upgradeItem(item) {
    if (!item) return item;
    const basePrompt = neutralizeDirectorPrompt(item);
    const upgraded = {
      ...item,
      prompt: basePrompt,
      references: addReferenceYears(itemReferences(item)),
      scenarios: item.scenarios || scenarioText(item),
      color: item.color || pickClauses(basePrompt, [/色|冷|暖|灰|蓝|绿|红|黄|金|棕|黑|白|饱和|暗|青|赭|玄/], "低饱和电影色彩，按题材控制冷暖关系"),
      lighting: item.lighting || pickClauses(basePrompt, [/光|照度|反差|阴影|逆光|侧光|顶光|烛光|窗光|高光|暗部/], "自然光或可见环境光为主，暗部保留细节，光比服务情绪"),
      camera: item.camera || pickClauses(basePrompt, [/构图|镜头|景深|手持|推轨|长镜头|远景|特写|低角度|留白|对称|广角|俯拍|剪影/], "宽银幕构图，主体清晰，必要时使用前景遮挡、门框构图或缓慢推轨"),
      texture: item.texture || pickClauses(basePrompt, [/材质|胶片|颗粒|烟雾|雾气|尘|雨|水|玻璃|金属|木|墙|空气|纹理|服装|道具/], "真实电影摄影质感，保留服装、皮肤、道具、墙面和空气颗粒细节"),
      avoid: item.avoid || avoidText(item)
    };
    upgraded.intensity = item.intensity || buildIntensity(upgraded, basePrompt);
    upgraded.copyPrompt = compactParts([
      `${upgraded.name}`,
      `适用：${upgraded.scenarios}`,
      `色调：${upgraded.color}`,
      `光影：${upgraded.lighting}`,
      `镜头：${upgraded.camera}`,
      `材质：${upgraded.texture}`,
      referencePromptLines(upgraded)[0] ? `单片参考：${referencePromptLines(upgraded)[0]}` : "",
      upgraded.audit ? `校正：${upgraded.audit}` : "",
      `避坑：${upgraded.avoid}`
    ]).join("，");
    return upgraded;
  }

  function composePrompt({ subject, selectedItems, mood, extra, negatives }) {
    const selected = compactParts((selectedItems || []).map((item) => {
      if (!item) return "";
      return upgradeItem(item).copyPrompt;
    }));
    const negativeText = compactParts(negatives || []).join("，");
    const parts = compactParts([
      subject,
      ...selected,
      mood ? `情绪：${mood}` : "",
      extra,
      negativeText ? `负面约束：${negativeText}` : ""
    ]);
    return parts.join("，");
  }

  function defaultToneSelection(appData) {
    const directors = (appData && appData.directors) || [];
    const defaultDirector = directors.find((item) => item.id === "D004") || directors[0];
    return defaultDirector ? [upgradeItem({ ...defaultDirector, category: "directors" })] : [];
  }

  function restoreToneSelection(appData, saved = {}) {
    const restored = (saved.selected || []).map(({ category, id }) => {
      const list = appData[category] || [];
      const item = list.find((candidate) => candidate.id === id);
      return item ? { ...item, category } : null;
    }).filter(Boolean);
    const selected = saved.blendMode === true ? restored.slice(-2) : restored.slice(-1);
    if (selected.length || Number(saved.schemaVersion) >= 2) return selected;
    return defaultToneSelection(appData);
  }

  function firstToneSelectionForCategory(appData, category, country = "all") {
    if (category === "all") return defaultToneSelection(appData);
    const list = (appData && appData[category]) || [];
    const first = list.find((item) => category !== "directors" || country === "all" || item.country === country);
    return first ? [upgradeItem({ ...first, category })] : [];
  }

  function bootBrowserApp() {
    if (!root.document || !data) return;
    const appData = withExtraStyles(data);

    const state = {
      category: "all",
      country: "all",
      query: "",
      selected: defaultToneSelection(appData),
      selectedExplicit: false,
      blendMode: false,
      favoriteKeys: [],
      favoritesOnly: false,
      versions: [],
      negatives: ["避免卡通感", "避免过曝", "避免塑料皮肤"],
      mood: "",
      extra: "真实电影摄影，宽银幕构图，细腻材质",
      copied: false
    };

    const elements = {
      search: document.querySelector("#search"),
      tabs: document.querySelector("#tabs"),
      countryFilter: document.querySelector("#country-filter"),
      results: document.querySelector("#results"),
      selected: document.querySelector("#selected"),
      blendToggle: document.querySelector("#tone-blend-toggle"),
      subject: document.querySelector("#subject"),
      mood: document.querySelector("#mood"),
      moodList: document.querySelector("#mood-list"),
      extra: document.querySelector("#extra"),
      negatives: document.querySelector("#negatives"),
      output: document.querySelector("#output"),
      copy: document.querySelector("#copy"),
      clear: document.querySelector("#clear"),
      random: document.querySelector("#random"),
      count: document.querySelector("#count"),
      validation: document.querySelector("#tone-validation")
    };

    function getKey(item) {
      return `${item.category}:${item.id}`;
    }

    function isSelected(item) {
      const key = getKey(item);
      return state.selected.some((selected) => getKey(selected) === key);
    }

    function isFavorite(item) {
      return state.favoriteKeys.includes(getKey(item));
    }

    function toggleFavorite(item) {
      const key = getKey(item);
      state.favoriteKeys = state.favoriteKeys.includes(key)
        ? state.favoriteKeys.filter((candidate) => candidate !== key)
        : [...state.favoriteKeys, key];
      render();
      return state.favoriteKeys.includes(key);
    }

    function addItem(item) {
      state.selectedExplicit = true;
      if (isSelected(item)) {
        render();
        return;
      }
      if (!state.blendMode) state.selected = [item];
      else state.selected = [...state.selected.slice(-1), item].slice(-2);
      elements.results.scrollLeft = 0;
      render();
    }

    function removeItem(key) {
      state.selected = state.selected.filter((item) => getKey(item) !== key);
      render();
    }

    function currentPrompt() {
      const blendRule = state.blendMode && state.selected.length === 2
        ? "双影调融合：第一个选择为主影调，占70%；第二个选择为辅助影调，占30%；辅助影调只补充局部光色和材质，不得覆盖主影调的色温、光比与整体调色逻辑"
        : "";
      return composePrompt({
        subject: elements.subject.value,
        selectedItems: state.selected,
        mood: state.mood,
        extra: compactParts([elements.extra.value, blendRule]).join("，"),
        negatives: state.negatives
      });
    }

    function renderTabs() {
      elements.tabs.innerHTML = "";
      Object.entries(categoryLabels).forEach(([key, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `tab ${state.category === key ? "active" : ""}`;
        button.dataset.category = key;
        button.textContent = label;
        button.addEventListener("click", () => {
          state.category = key;
          state.query = "";
          elements.search.value = "";
          if (key !== "all") {
            const firstSelection = firstToneSelectionForCategory(appData, key, state.country);
            if (firstSelection.length) {
              state.selected = firstSelection;
              state.selectedExplicit = true;
            }
          }
          elements.results.scrollLeft = 0;
          render();
        });
        elements.tabs.appendChild(button);
      });
    }

    function renderCountryFilter() {
      if (!elements.countryFilter) return;
      const countries = directorCountries(appData);
      elements.countryFilter.innerHTML = "";
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "全部国家/地区";
      elements.countryFilter.appendChild(allOption);
      countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        elements.countryFilter.appendChild(option);
      });
      elements.countryFilter.value = state.country;
    }

    function renderResults() {
      const searched = searchItems(appData, state.query, state.category, state.country);
      const results = (state.favoritesOnly ? searched.filter((item) => isFavorite(item)) : searched)
        .slice(0, 120)
        .sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)));
      elements.count.textContent = `${results.length} 条`;
      elements.results.innerHTML = "";

      results.forEach((item) => {
        const upgraded = upgradeItem(item);
        const card = document.createElement("article");
        card.className = `result result-${upgraded.category} ${isSelected(upgraded) ? "picked" : ""}`;
        card.setAttribute("role", "button");
        card.tabIndex = 0;
        card.innerHTML = `
          <span class="result-top">
            <span class="result-id">${upgraded.id}</span>
            <span class="result-category">${categoryLabels[upgraded.category]}</span>
            <button type="button" class="result-favorite ${isFavorite(upgraded) ? "active" : ""}" aria-label="${isFavorite(upgraded) ? "取消收藏" : "收藏"}" title="${isFavorite(upgraded) ? "取消收藏" : "收藏"}">
              <i data-lucide="star" aria-hidden="true"></i>
            </button>
          </span>
          <span class="result-name">${upgraded.name}</span>
          ${upgraded.country ? `<span class="result-country">${upgraded.country}</span>` : ""}
          ${upgraded.group ? `<span class="result-group">${upgraded.group}</span>` : ""}
          <span class="result-tags">${(upgraded.tags || []).slice(0, 5).join(" / ")}</span>
          ${renderPromptDetails(upgraded)}
          ${renderReferenceFilms(upgraded)}
        `;
        card.querySelector(".result-favorite").addEventListener("click", (event) => {
          event.stopPropagation();
          toggleFavorite(upgraded);
        });
        card.addEventListener("click", () => addItem(upgraded));
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            addItem(upgraded);
          }
        });
        elements.results.appendChild(card);
      });
      if (!results.length) {
        const empty = document.createElement("div");
        empty.className = "empty result-empty";
        empty.textContent = state.favoritesOnly ? "还没有收藏符合条件的影调" : "没有找到符合条件的影调";
        elements.results.appendChild(empty);
      }
      if (root.lucide) root.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
    }

    function renderSelected() {
      elements.selected.innerHTML = "";
      if (!state.selected.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "未选择";
        elements.selected.appendChild(empty);
        return;
      }

      state.selected.forEach((item, index) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        const role = state.blendMode && state.selected.length === 2 ? (index === 0 ? "主" : "辅") : "单一";
        chip.textContent = `${role} · ${item.id} ${item.name}`;
        chip.title = "点击移除";
        chip.addEventListener("click", () => removeItem(getKey(item)));
        elements.selected.appendChild(chip);
      });
    }

    function renderMoods() {
      elements.moodList.innerHTML = "";
      appData.moods.forEach((mood) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `pill ${state.mood.includes(mood) ? "active" : ""}`;
        button.textContent = mood;
        button.addEventListener("click", () => {
          const moods = state.mood ? state.mood.split("、").filter(Boolean) : [];
          state.mood = moods.includes(mood)
            ? moods.filter((item) => item !== mood).join("、")
            : [...moods, mood].join("、");
          elements.mood.value = state.mood;
          render();
        });
        elements.moodList.appendChild(button);
      });
    }

    function renderNegatives() {
      elements.negatives.innerHTML = "";
      appData.negatives.forEach((negative) => {
        const label = document.createElement("label");
        label.className = "check";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.negatives.includes(negative);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            state.negatives = [...new Set([...state.negatives, negative])];
          } else {
            state.negatives = state.negatives.filter((item) => item !== negative);
          }
          render();
        });
        const span = document.createElement("span");
        span.textContent = negative;
        label.append(checkbox, span);
        elements.negatives.appendChild(label);
      });
    }

    function renderOutput() {
      elements.output.value = currentPrompt();
      elements.copy.textContent = state.copied ? "已复制" : "复制";
      const missing = [];
      if (!elements.subject.value.trim()) missing.push("主体");
      if (!state.selected.length) missing.push("至少一种影调素材");
      elements.copy.disabled = missing.length > 0;
      elements.validation.textContent = missing.length ? `还需完成：${missing.join("、")}` : "影调方案完整，可以复制或发送到其他工作台。";
      elements.validation.classList.toggle("ready", missing.length === 0);
    }

    function previewSnapshot() {
      const selected = state.selected.map((item) => upgradeItem(item));
      const primary = selected[0] || null;
      return {
        selected,
        primary,
        prompt: currentPrompt(),
        favorite: primary ? isFavorite(primary) : false,
        favoritesOnly: state.favoritesOnly,
        favoriteCount: state.favoriteKeys.length,
        versions: state.versions.map((version) => ({ ...version })),
        categoryLabel: primary ? categoryLabels[primary.category] : ""
      };
    }

    function notifyLookStudio() {
      document.dispatchEvent(new CustomEvent("aigc:tone-update", { detail: previewSnapshot() }));
    }

    function render() {
      renderTabs();
      renderCountryFilter();
      renderResults();
      renderSelected();
      renderMoods();
      renderNegatives();
      renderOutput();
      notifyLookStudio();
    }

    function pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    elements.results.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maxScrollLeft = elements.results.scrollWidth - elements.results.clientWidth;
      if (maxScrollLeft <= 0) return;
      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, elements.results.scrollLeft + event.deltaY));
      if (nextScrollLeft === elements.results.scrollLeft) return;
      event.preventDefault();
      elements.results.scrollLeft = nextScrollLeft;
    }, { passive: false });

    elements.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      elements.results.scrollLeft = 0;
      render();
    });

    if (elements.countryFilter) {
      elements.countryFilter.addEventListener("change", (event) => {
        state.country = event.target.value;
        if (state.country !== "all" && state.category !== "directors") {
          state.category = "directors";
        }
        elements.results.scrollLeft = 0;
        render();
      });
    }

    elements.subject.addEventListener("input", renderOutput);
    elements.extra.addEventListener("input", renderOutput);
    elements.blendToggle.addEventListener("change", () => {
      state.blendMode = elements.blendToggle.checked;
      if (!state.blendMode && state.selected.length > 1) state.selected = [state.selected[state.selected.length - 1]];
      render();
    });
    elements.mood.addEventListener("input", (event) => {
      state.mood = event.target.value;
      render();
    });

    elements.copy.addEventListener("click", async () => {
      const prompt = currentPrompt();
      elements.output.focus();
      elements.output.select();
      try {
        await navigator.clipboard.writeText(prompt);
      } catch (error) {
        document.execCommand("copy");
      }
      state.copied = true;
      renderOutput();
      setTimeout(() => {
        state.copied = false;
        renderOutput();
      }, 1200);
    });

    elements.clear.addEventListener("click", () => {
      state.selected = [];
      state.selectedExplicit = false;
      state.mood = "";
      elements.mood.value = "";
      elements.subject.value = "";
      render();
    });

    elements.random.addEventListener("click", () => {
      const typeCategory = appData.premiumTypes.length ? "premiumTypes" : "types";
      const typeChoice = { ...pickRandom(appData[typeCategory]), category: typeCategory };
      state.selected = state.blendMode
        ? [{ ...pickRandom(appData.directors), category: "directors" }, typeChoice]
        : [typeChoice];
      state.selectedExplicit = true;
      state.mood = [pickRandom(appData.moods), pickRandom(appData.moods)].filter((item, index, arr) => arr.indexOf(item) === index).join("、");
      elements.mood.value = state.mood;
      if (!elements.subject.value.trim()) {
        elements.subject.value = "一个人物站在关键场景中，情绪即将爆发";
      }
      render();
    });

    root.aigcToneWorkbench = {
      exportState() {
        return {
          schemaVersion: 2,
          category: state.category,
          country: state.country,
          query: state.query,
          blendMode: state.blendMode,
          favoriteKeys: [...state.favoriteKeys],
          favoritesOnly: state.favoritesOnly,
          versions: state.versions.map((version) => ({ ...version })),
          selected: state.selected.map((item) => ({ category: item.category, id: item.id })),
          selectedDetails: state.selected.map((item) => ({
            category: item.category,
            id: item.id,
            title: item.title || item.name || "",
            color: item.color || "",
            palette: item.palette || "",
            lighting: item.lighting || "",
            camera: item.camera || "",
            texture: item.texture || "",
            mood: item.mood || ""
          })),
          selectedExplicit: state.selectedExplicit,
          negatives: [...state.negatives],
          mood: state.mood,
          extra: elements.extra.value,
          subject: elements.subject.value
        };
      },
      importState(saved = {}) {
        state.category = categoryLabels[saved.category] ? saved.category : "all";
        state.country = saved.country || "all";
        state.query = saved.query || "";
        state.blendMode = saved.blendMode === true;
        state.favoriteKeys = Array.isArray(saved.favoriteKeys) ? saved.favoriteKeys : [];
        state.favoritesOnly = saved.favoritesOnly === true;
        state.versions = Array.isArray(saved.versions) ? saved.versions.slice(0, 24) : [];
        state.negatives = Array.isArray(saved.negatives) ? saved.negatives : ["避免卡通感", "避免过曝", "避免塑料皮肤"];
        state.mood = saved.mood || "";
        state.selected = restoreToneSelection(appData, saved);
        state.selectedExplicit = state.selected.length ? saved.selectedExplicit !== false : false;
        elements.search.value = state.query;
        elements.blendToggle.checked = state.blendMode;
        elements.subject.value = saved.subject || "";
        elements.extra.value = saved.extra || state.extra;
        elements.mood.value = state.mood;
        render();
      },
      getPrompt: currentPrompt,
      getSnapshot: previewSnapshot,
      getSearchItems(query = "") {
        return searchItems(appData, query, "all", "all").slice(0, 40).map((item) => {
          const upgraded = upgradeItem(item);
          return {
            id: upgraded.id,
            name: upgraded.name,
            category: upgraded.category,
            categoryLabel: categoryLabels[upgraded.category],
            country: upgraded.country || upgraded.group || "",
            tags: upgraded.tags || [],
            favorite: isFavorite(upgraded)
          };
        });
      },
      selectItem(category, id) {
        const item = (appData[category] || []).find((candidate) => candidate.id === id);
        if (!item) return false;
        state.category = category;
        state.favoritesOnly = false;
        state.query = "";
        elements.search.value = "";
        addItem({ ...item, category });
        return true;
      },
      toggleCurrentFavorite() {
        if (!state.selected[0]) return false;
        return toggleFavorite(state.selected[0]);
      },
      setFavoritesOnly(value) {
        state.favoritesOnly = Boolean(value);
        render();
      },
      saveVersion() {
        const primary = state.selected[0] ? upgradeItem(state.selected[0]) : null;
        if (!primary) return null;
        const version = {
          id: `look-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          number: state.versions.length + 1,
          name: primary.name,
          styleId: primary.id,
          category: primary.category,
          prompt: currentPrompt(),
          createdAt: new Date().toISOString()
        };
        state.versions = [version, ...state.versions].slice(0, 24);
        render();
        return version;
      },
      removeVersion(id) {
        state.versions = state.versions.filter((version) => version.id !== id);
        render();
      },
      getTransferPrompt() {
        const blendRule = state.blendMode && state.selected.length === 2
          ? "双影调融合：第一个选择为主影调，占70%；第二个选择为辅助影调，占30%；辅助影调不得覆盖主影调的色温、光比和整体调色逻辑"
          : "";
        return composePrompt({
          subject: "",
          selectedItems: state.selected,
          mood: state.mood,
          extra: compactParts([elements.extra.value, blendRule]).join("，"),
          negatives: state.negatives
        });
      },
      receiveProjectContext(context) {
        const prompt = String(context?.prompt || "").trim();
        if (!prompt) return false;
        if (!elements.extra.value.includes(prompt)) {
          elements.extra.value = [elements.extra.value.trim(), prompt].filter(Boolean).join("；");
        }
        render();
        document.dispatchEvent(new Event("aigc:workspace-dirty"));
        return true;
      }
    };

    elements.subject.value = "海边旧旅馆，一个女人回头看";
    elements.extra.value = state.extra;
    elements.mood.value = state.mood;
    render();
  }

  if (typeof module !== "undefined") {
    module.exports = { searchItems, composePrompt, directorCountries, upgradeItem, compactReferences, referencePromptLines, renderReferenceFilms, renderPromptDetails, defaultToneSelection, restoreToneSelection, firstToneSelectionForCategory };
  }

  bootBrowserApp();
})(typeof window !== "undefined" ? window : globalThis);
