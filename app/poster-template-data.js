(function initPosterTemplateData(root) {
  const ratios = ["2:3", "4:5", "9:16", "16:9", "3:2", "1:1"];

  const purposes = {
    film: {
      label: "电影海报",
      canonicalPurpose: "film",
      defaultRatio: "2:3",
      description: "院线、剧集与品牌叙事主视觉"
    },
    social: {
      label: "自媒体封面",
      canonicalPurpose: "social",
      defaultRatio: "4:5",
      description: "移动端缩略图与平台内容封面"
    },
    product: {
      label: "商品主视觉",
      canonicalPurpose: "product",
      defaultRatio: "1:1",
      description: "商品发布、材质特写与功能表达"
    }
  };

  const templates = [
    {
      id: "film-portrait-close",
      label: "人物大脸主视觉",
      purposeGroups: ["film"],
      compositionKey: "portrait-close",
      image: "assets/poster-templates/film-portrait-close.jpg",
      genreHint: "人物传记 / 悬疑 / 爱情",
      ratioDefaults: ["2:3", "4:5"],
      visualIntent: "用眼神和面部微表情建立唯一视觉中心",
      subjectRatio: "人物占画面 55%–70%",
      typographyRisk: "标题避开眼睛、嘴部与高光边缘",
      promptRule: "一张主角近景或特写占据画面约55%至70%，眼睛成为第一视觉焦点；脸部与标题区错开，背景只保留少量类型线索。"
    },
    {
      id: "film-character-world",
      label: "小人物与宏大环境",
      purposeGroups: ["film"],
      compositionKey: "character-world",
      image: "assets/poster-templates/film-character-world.jpg",
      genreHint: "史诗 / 灾难 / 科幻",
      ratioDefaults: ["2:3", "16:9"],
      visualIntent: "以人与世界的尺度反差建立史诗感",
      subjectRatio: "人物占画面 10%–25%",
      typographyRisk: "标题不能破坏环境尺度和地平线",
      promptRule: "人物只占画面约10%至25%，放在下三分之一；巨大建筑、灾难、荒野、海洋、太空或历史空间承担主要视觉重量。"
    },
    {
      id: "film-dual-conflict",
      label: "双人对峙",
      purposeGroups: ["film"],
      compositionKey: "dual-conflict",
      image: "assets/poster-templates/film-dual-conflict.jpg",
      genreHint: "犯罪 / 爱情 / 关系",
      ratioDefaults: ["2:3", "16:9"],
      visualIntent: "用视线和身体方向制造关系张力",
      subjectRatio: "双主体合计占画面 55%–70%",
      typographyRisk: "中央冲突轴和两张脸必须保持清楚",
      promptRule: "两个人物分居画面左右或前后，脸部尺度接近，视线与身体方向形成对峙、错过或情感拉力；中央保留冲突物件或标题区。"
    },
    {
      id: "film-ensemble",
      label: "群像金字塔",
      purposeGroups: ["film"],
      compositionKey: "ensemble",
      image: "assets/poster-templates/film-ensemble.jpg",
      genreHint: "家族 / 战争 / 群像",
      ratioDefaults: ["2:3", "4:5"],
      visualIntent: "通过人物尺度和层级表达叙事地位",
      subjectRatio: "最多 5 名主要人物",
      typographyRisk: "避免标题切脸和头像拼贴墙",
      promptRule: "核心人物位于上方或中心，次要人物按地位和戏份由大到小形成稳定金字塔；最多5名主要人物，每张脸方向不同但光向统一。"
    },
    {
      id: "film-double-exposure",
      label: "双重曝光 / 记忆叠化",
      purposeGroups: ["film"],
      compositionKey: "double-exposure",
      image: "assets/poster-templates/film-double-exposure.jpg",
      genreHint: "心理 / 记忆 / 科幻",
      ratioDefaults: ["2:3", "4:5"],
      visualIntent: "让人物身份与关键事件形成一体化叙事",
      subjectRatio: "轮廓占画面 50%–70%",
      typographyRisk: "叠化细节不能进入主要文字安全区",
      promptRule: "人物侧脸或正脸轮廓作为主形，轮廓内部叠入城市、森林、海面、火焰或关键事件；叠化边缘自然，面部五官仍清楚。"
    },
    {
      id: "film-object-symbol",
      label: "关键物件符号",
      purposeGroups: ["film"],
      compositionKey: "object-symbol",
      image: "assets/poster-templates/film-object-symbol.jpg",
      genreHint: "悬疑 / 历史 / 概念",
      ratioDefaults: ["2:3", "1:1"],
      visualIntent: "以一个物件浓缩影片的核心命题",
      subjectRatio: "物件占画面 35%–55%",
      typographyRisk: "文字不可削弱物件轮廓和材质",
      promptRule: "只突出一个具有叙事意义的物件、武器、信物、车辆或图形符号，主体占画面约35%至55%；人物只以剪影、倒影或极小尺度出现。"
    },
    {
      id: "film-diagonal-action",
      label: "斜线动作爆发",
      purposeGroups: ["film"],
      compositionKey: "diagonal-action",
      image: "assets/poster-templates/film-diagonal-action.jpg",
      genreHint: "动作 / 战争 / 冒险",
      ratioDefaults: ["2:3", "16:9"],
      visualIntent: "用斜向运动线制造速度与冲突",
      subjectRatio: "动作主体占画面 40%–60%",
      typographyRisk: "标题避开动作路径、武器和人物脸",
      promptRule: "人物、车辆、武器、烟尘或光束沿明确斜线方向组织，形成速度与冲突；动作主体清晰，背景分层，标题避开运动路径。"
    },
    {
      id: "film-negative-space",
      label: "文艺留白",
      purposeGroups: ["film"],
      compositionKey: "negative-space",
      image: "assets/poster-templates/film-negative-space.jpg",
      genreHint: "文艺 / 爱情 / 纪录",
      ratioDefaults: ["2:3", "4:5"],
      visualIntent: "用安静空间承载情绪和作者气质",
      subjectRatio: "留白不低于画面 40%",
      typographyRisk: "留白区必须干净且明暗稳定",
      promptRule: "主体缩小并偏置于一侧或下方，保留40%以上干净留白；用单一色面、自然光、墙面、天空或雾气承载标题。"
    },
    {
      id: "film-split-world",
      label: "双世界",
      purposeGroups: ["film"],
      compositionKey: "split-world",
      image: "assets/poster-templates/film-split-world.jpg",
      genreHint: "科幻 / 悬疑 / 奇幻",
      ratioDefaults: ["2:3", "16:9"],
      visualIntent: "把现实与记忆或两个阵营放在同一视觉命题中",
      subjectRatio: "两个空间各占约 40%–60%",
      typographyRisk: "标题不可模糊世界分界线",
      promptRule: "画面被地平线、镜面、门框、裂缝或色彩边界分成两个相关世界；同一人物、两组人物或现实与记忆形成明确对照。"
    },
    {
      id: "social-thumbnail-focus",
      label: "高识别封面主体",
      purposeGroups: ["social"],
      compositionKey: "social-focus",
      image: "assets/poster-templates/social-thumbnail-focus.jpg",
      genreHint: "自媒体 / 平台内容",
      ratioDefaults: ["4:5", "16:9", "9:16"],
      visualIntent: "在手机缩略图尺寸下仍能瞬间识别",
      subjectRatio: "主体占画面 45%–60%",
      typographyRisk: "大标题区与人脸必须明确分区",
      promptRule: "一个大主体或一张清晰人脸占画面约45%至60%，另一侧预留大标题区；背景简洁、明暗分离强，缩小后仍能立即识别。"
    },
    {
      id: "product-hero",
      label: "商品英雄主视觉",
      purposeGroups: ["product"],
      compositionKey: "product-hero",
      image: "assets/poster-templates/product-hero.jpg",
      genreHint: "新品发布 / 品牌广告",
      ratioDefaults: ["1:1", "4:5", "3:2"],
      visualIntent: "完整展示产品外形、品牌结构和核心材质",
      subjectRatio: "商品占画面 45%–65%",
      typographyRisk: "品牌区和轮廓高光不可被文字遮挡",
      promptRule: "商品位于画面中心或黄金分割点，占画面约45%至65%，完整展示外形、品牌结构和关键材质；使用真实接触阴影与克制轮廓光。"
    },
    {
      id: "product-macro",
      label: "材质微距主视觉",
      purposeGroups: ["product"],
      compositionKey: "product-macro",
      image: "assets/poster-templates/product-macro.jpg",
      genreHint: "工艺 / 美妆 / 食品",
      ratioDefaults: ["1:1", "4:5", "3:2"],
      visualIntent: "把材质和工艺细节转化为购买理由",
      subjectRatio: "微距细节占画面 60%–80%",
      typographyRisk: "信息文字不得压住核心材质高光",
      promptRule: "使用微距或局部近景突出商品最重要的结构、纹理、工艺、液体、金属、玻璃、织物或食物质感，并保留完整商品识别锚点。"
    },
    {
      id: "product-exploded",
      label: "悬浮部件 / 功能拆解",
      purposeGroups: ["product"],
      compositionKey: "floating-parts",
      image: "assets/poster-templates/product-exploded.jpg",
      genreHint: "科技 / 功能展示",
      ratioDefaults: ["1:1", "16:9", "3:2"],
      visualIntent: "用清楚层级解释产品结构和功能",
      subjectRatio: "主商品占画面 35%–55%",
      typographyRisk: "部件不能进入品牌和卖点安全区",
      promptRule: "商品主体稳定居中，少量部件、原料或功能元素按清楚层级悬浮环绕；每个组件方向和光影一致，不遮挡品牌核心区域。"
    }
  ];

  function getTemplatesForPurpose(purpose) {
    return templates.filter((template) => template.purposeGroups.includes(purpose));
  }

  const api = { purposes, ratios, templates, getTemplatesForPurpose };
  root.aigcPosterTemplateData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
