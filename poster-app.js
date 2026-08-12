(function initPosterWorkspace(root) {
  if (!root.document) return;

  const templateData = root.aigcPosterTemplateData;
  const titleData = root.aigcPosterTitleTemplateData;
  const titleMarkData = root.aigcPosterTitleMarkData;
  const compositorData = root.aigcPosterCompositor;
  const posterAssetStore = root.aigcPosterAssetStore;
  if (!templateData || !titleData || !titleMarkData || !compositorData || !posterAssetStore) return;

  const {
    TITLE_CATEGORIES,
    TITLE_LANGUAGE_MODES,
    TITLE_MATERIALS,
    DEFAULT_TITLE_TEMPLATE_ID,
    getTitleTemplate,
    filterTitleTemplates,
    normalizePosterTitleState
  } = titleData;
  const {
    TITLE_MARK_CATEGORIES,
    TITLE_MARK_SKELETONS,
    TITLE_MARK_METHODS,
    TITLE_MARK_MATERIALS,
    TITLE_MARK_LIGHTING,
    TITLE_MARK_BACKGROUNDS,
    TITLE_MARK_OUTPUT_MODES,
    DEFAULT_TITLE_MARK_TEMPLATE_ID,
    getTitleMarkTemplate,
    filterTitleMarkTemplates,
    normalizePosterTitleMarkState
  } = titleMarkData;
  const { migratePosterLayerFontStyles, normalizePosterCompositorState, safePosterExportName, createPosterCompositor } = compositorData;

  const purposeProfiles = {
    film: { label: "电影正式海报", ratio: "2:3", status: "POSTER KEY ART", compositions: ["portrait-close", "character-world", "dual-conflict", "ensemble", "double-exposure", "object-symbol", "diagonal-action", "negative-space", "split-world"] },
    series: { label: "剧集 / 短剧海报", ratio: "2:3", status: "SERIES KEY ART", compositions: ["portrait-close", "dual-conflict", "ensemble", "character-world", "split-world", "diagonal-action"] },
    streaming: { label: "视频平台横版封面", ratio: "16:9", status: "STREAMING COVER", compositions: ["portrait-close", "dual-conflict", "diagonal-action", "character-world", "ensemble", "object-symbol"] },
    social: { label: "自媒体内容封面", ratio: "4:5", status: "SOCIAL COVER", compositions: ["social-focus", "portrait-close", "object-symbol", "split-world", "negative-space"] },
    product: { label: "商品主视觉图", ratio: "1:1", status: "PRODUCT KEY VISUAL", compositions: ["product-hero", "product-macro", "floating-parts", "negative-space"] },
    event: { label: "活动与品牌主视觉", ratio: "4:5", status: "CAMPAIGN KEY VISUAL", compositions: ["object-symbol", "negative-space", "character-world", "social-focus", "double-exposure"] }
  };

  const compositionProfiles = {
    "portrait-close": { label: "人物大脸主视觉", css: "poster-preview-portrait", rule: "一张主角近景或特写占据画面约55%至70%，眼睛成为第一视觉焦点；脸部与标题区错开，背景只保留少量类型线索，适合明星、人物传记、悬疑、爱情和剧集封面。" },
    "character-world": { label: "小人物与宏大环境", css: "poster-preview-world", rule: "人物只占画面约10%至25%，放在下三分之一；巨大建筑、灾难、荒野、海洋、太空或历史空间承担主要视觉重量，用尺度关系建立史诗感。" },
    "dual-conflict": { label: "双人对峙 / 关系海报", css: "poster-preview-dual", rule: "两个人物分居画面左右或前后，脸部尺度接近，视线与身体方向形成对峙、错过或情感拉力；中央保留冲突物件、裂缝或标题区。" },
    ensemble: { label: "群像金字塔", css: "poster-preview-ensemble", rule: "核心人物位于上方或中心，次要人物按地位和戏份由大到小形成稳定金字塔；最多5名主要人物，每张脸方向不同但光向统一，避免头像拼贴墙。" },
    "double-exposure": { label: "双重曝光 / 记忆叠化", css: "poster-preview-double", rule: "人物侧脸或正脸轮廓作为主形，轮廓内部叠入城市、森林、海面、火焰或关键事件；叠化边缘自然，面部五官仍清楚，不做廉价透明图层。" },
    "object-symbol": { label: "关键物件符号海报", css: "poster-preview-object", rule: "只突出一个具有叙事意义的物件、商品、武器、信物、车辆或图形符号，主体占画面约35%至55%；人物可以只以剪影、倒影或极小尺度出现。" },
    "diagonal-action": { label: "斜线动作爆发", css: "poster-preview-action", rule: "人物、车辆、武器、烟尘或光束沿明确斜线方向组织，形成速度与冲突；动作主体清晰，背景信息分层，标题避开运动路径和人物脸。" },
    "negative-space": { label: "文艺留白海报", css: "poster-preview-space", rule: "主体缩小并偏置于一侧或下方，保留40%以上干净留白；用单一色面、自然光、墙面、天空或雾气承载标题，画面克制且有作者气质。" },
    "split-world": { label: "上下 / 左右双世界", css: "poster-preview-split", rule: "画面被地平线、镜面、门框、裂缝或色彩边界分成两个相互关联的世界；同一人物、两组人物或现实与记忆形成明确对照。" },
    "social-focus": { label: "缩略图强识别封面", css: "poster-preview-social", rule: "一个大主体或一张清晰人脸占画面约45%至60%，另一侧预留大标题区；背景简洁、明暗分离强，即使缩小到手机缩略图仍能立即识别。" },
    "product-hero": { label: "商品英雄主视觉", css: "poster-preview-product", rule: "商品位于画面中心或黄金分割点，占画面约45%至65%，完整展示外形、品牌结构和关键材质；使用干净渐变或纯色空间、真实接触阴影与克制轮廓光。" },
    "product-macro": { label: "商品微距材质", css: "poster-preview-macro", rule: "使用微距或局部近景突出商品最重要的结构、纹理、工艺、液体、金属、玻璃、织物或食物质感；保留一个完整商品小视图作为识别锚点。" },
    "floating-parts": { label: "商品悬浮组件", css: "poster-preview-floating", rule: "商品主体稳定居中，少量部件、原料或功能元素按清楚层级悬浮环绕；每个组件方向和光影一致，不做杂乱爆炸图，不遮挡品牌核心区域。" }
  };

  const genreProfiles = {
    drama: { label: "剧情现实", tones: { natural: ["自然纪实", "自然窗光或阴天漫射光，低饱和生活色，真实肤色和环境纹理"], muted: ["低饱和作者电影", "暖灰、冷灰或褪色色彩，柔和反差，大面积安静色面"], chiaroscuro: ["人物明暗心理", "克制侧光与深色背景，面部半明半暗，暗部保留细节"] } },
    crime: { label: "犯罪黑色", tones: { noir: ["经典黑色电影", "黑白或低饱和蓝灰，高反差侧光、百叶窗影、雨夜湿地反光"], neon: ["都市霓虹犯罪", "蓝黑夜色、钠灯橙与少量红绿霓虹，玻璃和潮湿路面反射"], amber: ["权力暖棕", "琥珀低照度、深棕木色、厚重阴影与局部暖灯"] } },
    suspense: { label: "悬疑推理", tones: { green: ["心理绿灰", "绿灰低饱和、冷白顶光、局部暖色线索高光"], cold: ["理性冷蓝", "冷蓝灰、精确光区、清晰证物和受控暗部"], red: ["危险红色线索", "主体冷灰，只有一个克制红色焦点用于暗示危险"] } },
    horror: { label: "恐怖惊悚", tones: { moon: ["冷月深影", "冷蓝月光、长阴影、大面积负空间和微弱暖灯"], sickly: ["病态灰绿", "低饱和灰绿、旧墙与荧光灯质感，肤色仍可辨"], ritual: ["仪式暗红", "深黑、暗红、烛光与烟雾，强轮廓但不靠死黑遮挡信息"] } },
    action: { label: "动作枪战", tones: { steel: ["钢蓝橙火", "蓝黑或钢蓝环境、橙色火光与烟雾、高反差轮廓"], daylight: ["硬光现实动作", "烈日硬光、晒白天空、灰褐尘土和真实装备色"], redblack: ["红黑速度", "黑色主面、红色斜线或尾灯、少量白色高光"] } },
    scifi: { label: "科幻未来", tones: { clinical: ["冷白硬科幻", "冷白、蓝灰、金属和玻璃反光，极简干净光源"], orange: ["沙金巨构", "沙金、橙褐雾气、冷白远光和巨大尺度"], cosmic: ["深空蓝紫", "深蓝黑、克制蓝紫星云、冷白轮廓光与深邃空间"] } },
    fantasy: { label: "史诗奇幻", tones: { dawn: ["金蓝晨雾", "暖金晨光、冷蓝阴影、薄雾与古老石材"], dark: ["冷铁黑暗奇幻", "铁灰、冷蓝、火把橙与湿冷空气"], mythic: ["神话大色块", "朱红、暗金、青绿或黑白主色，仪式光与强轮廓"] } },
    war: { label: "战争历史", tones: { dust: ["灰褐战地", "低饱和灰褐、军绿、烟尘与阴天漫射光"], fire: ["烟火悲壮", "灰黑天空、浓烟、橙色火光和人物剪影"], archive: ["黑白档案", "高反差黑白、粗粝胶片颗粒和纪录摄影感"] } },
    wuxia: { label: "武侠东方", tones: { ink: ["水墨青灰", "墨黑、青灰、米白与雾气，山水留白和柔和侧逆光"], bamboo: ["竹林青绿", "低饱和青绿、冷月白、薄雾和衣袂轮廓"], ritual: ["东方红黑金", "朱红、墨黑、暗金与对称仪式光"] } },
    romance: { label: "爱情文艺", tones: { golden: ["暖金逆光", "黄昏暖金、浅景深、柔和肤色和空气光"], nostalgic: ["胶片怀旧", "低饱和暖灰、暗红与墨绿点缀、柔软胶片颗粒"], cool: ["清冷错过", "冷蓝灰、雨天或冬日柔光、克制留白"] } },
    comedy: { label: "喜剧", tones: { bright: ["明亮自然", "均匀明亮光、清晰色彩、真实肤色和轻松空间"], pastel: ["粉彩荒诞", "粉色、芥末黄、薄荷绿等受控粉彩与对称空间"], graphic: ["高识别色块", "单纯背景色、强轮廓、清晰对比和舞台式秩序"] } },
    youth: { label: "青春成长", tones: { summer: ["夏日暖光", "暖阳、浅绿树影、低对比高光与清澈肤色"], campus: ["校园清透", "中性日光、蓝白与浅绿色、干净空气感"], retro: ["青春胶片", "轻暖褪色、自然颗粒、旧校服与年代色彩"] } },
    animation: { label: "动画电影", tones: { storybook: ["手绘童话", "清晰轮廓、暖色主光、蓝紫阴影和丰富背景层次"], cinematic3d: ["电影三维动画", "体积柔光、精细材质、清晰角色轮廓和综合色彩"], oriental: ["东方动画", "青绿、朱红、墨黑、矿物色与云雾层次"] } },
    documentary: { label: "纪录片", tones: { natural: ["现场自然光", "真实环境光、低饱和、深景深和生活纹理"], monochrome: ["黑白纪实", "自然黑白层次、克制颗粒和清楚人物关系"], archival: ["档案拼贴", "旧纸、照片边缘、低饱和褪色和真实年代材料"] } },
    commercial: { label: "商业产品", tones: { clean: ["高端纯净", "中性高还原光、干净色面、精确材质和柔和接触阴影"], luxury: ["暗场奢华", "黑色或深色空间、金色边缘、克制高光和深邃材质"], energetic: ["明快活力", "鲜明主色、清晰反差、轻快光线和高识别轮廓"] } }
  };

  const lightingProfiles = {
    genre: { label: "跟随类型影调", rule: "以所选类型影调中的光源描述为主，不额外叠加另一套布光风格" },
    rembrandt: { label: "伦勃朗光", rule: "主光从人物侧前方约45度、高于眼睛的位置落下，背光侧脸颊保留清楚的小三角亮区；面部明暗比约4:1，暗侧仍保留眼睛和皮肤细节，背景压暗并用轻微轮廓光分离人物" },
    side: { label: "侧光 / 半明半暗", rule: "主光从人物正侧方进入，一半脸明亮、一半脸进入受控阴影，用明暗分界表达人物矛盾；鼻影不过度横跨面部，暗侧保留最低限度层次" },
    backlight: { label: "逆光 / 轮廓光", rule: "强主光位于主体后侧，勾勒头发、肩线、服装或商品外缘；正面用极弱柔和补光保留身份信息，逆光不吞没五官，不让背景高光大面积过曝" },
    silhouette: { label: "剪影逆光", rule: "明亮背景或远处光源勾勒完整人物姿态，主体大部分压成深色剪影，只保留少量边缘层次；轮廓动作必须一眼可读，剪影不与背景物体粘连" },
    chiaroscuro: { label: "明暗对照 / 黑色电影", rule: "小面积硬主光切入大面积阴影，形成强烈明暗对照；可使用门缝、百叶窗、烟雾或建筑投影塑造图形化光区，黑位深但不死黑" },
    top: { label: "顶光 / 压迫感", rule: "主光从人物正上方落下，强化眉骨、眼窝与颧骨阴影，制造审讯、权力或孤立感；用微弱正面补光避免眼睛完全消失" },
    under: { label: "底光 / 异常感", rule: "低位光源向上照亮下巴、鼻底和眼窝，制造非日常、惊悚或火光感；必须给出蜡烛、屏幕、火焰等合理光源，控制强度避免廉价恐怖脸" },
    window: { label: "窗光 / 百叶窗影", rule: "单向窗光作为主光，光线有明确方向与空间衰减；可让窗框或百叶窗影落在墙面与服装上，但不要用硬影遮住两只眼睛和标题区" },
    practical: { label: "场景光源 / 动机光", rule: "所有光线来自画面中合理可见或可推断的灯、窗、车灯、路灯、霓虹、火焰或屏幕；主光方向与场景光源严格一致，环境反射色可信" },
    soft: { label: "大面积柔光", rule: "使用阴天、窗帘、大面积柔光箱或反射墙形成包裹式柔光，阴影边缘柔和、反差低，肤色自然，适合人物关系、爱情、青春与高端商业肖像" },
    hard: { label: "硬质日光", rule: "使用烈日或小型远距离光源形成清晰硬影、晒白高光和强烈空间感；人物眯眼、衣料和地面阴影符合太阳方向，高光保留纹理" },
    highkey: { label: "高调均匀光", rule: "整体明亮、阴影很浅、背景接近高调但不过曝，人物或商品边缘清楚，色彩干净；仍保留微弱主次光比，避免平光证件照" },
    lowkey: { label: "低调局部光", rule: "画面大部分保持低照度，只让脸、眼神、手、商品Logo或关键物件进入精确光区；暗部有层次，视觉焦点集中，不依靠全黑隐藏错误" },
    neon: { label: "霓虹混合光", rule: "两种以内的有色场景光从不同方向塑造主体，例如冷青边光与暖红侧光；光源位置合理，肤色保留中性区域，不把整张脸染成单一荧光色" },
    volumetric: { label: "体积光 / 穿透光束", rule: "让窗光、探照灯或阳光穿过薄雾、烟尘、雨丝形成可见光束，光束服务视觉动线与空间深度；空气介质克制，不遮挡人物脸和商品细节" }
  };

  const colorGradeProfiles = {
    genre: { label: "跟随类型影调", rule: "沿用所选类型影调的主色关系，不再增加额外互补色" },
    warmcool: { label: "冷暖对比", rule: "主体与背景形成明确冷暖分离：暖色承担人物、火光或情感焦点，冷色承担阴影、夜色或环境；冷暖面积有主次，肤色保持可信" },
    tealorange: { label: "青橙互补", rule: "阴影与环境偏克制青蓝，人物肤色、灯光或火光偏自然橙暖；降低青橙饱和度，避免商业预设滤镜感" },
    blueamber: { label: "蓝调与琥珀", rule: "深蓝或蓝灰构成夜色和暗部，琥珀灯光落在人物与关键物件上，形成高级、克制的冷夜暖灯关系" },
    redcyan: { label: "红青对立", rule: "冷青环境与小面积电影红形成危险或科技冲突；红色只用于一个叙事焦点，避免红青平均分布和廉价霓虹污染" },
    redgreen: { label: "红绿心理对比", rule: "低饱和绿灰作为环境底色，暗红或深红作为人物、物件或文字强调；控制肤色，避免红绿同时高饱和" },
    monochrome: { label: "单色统一", rule: "围绕一种主色建立明度层次，只允许中性色和极小面积强调色；靠光影、材质与构图区分层次，不靠杂色" },
    desaturated: { label: "低饱和去色", rule: "整体降低饱和度但保留真实肤色和关键物件的微弱色彩，黑位和高光不过度压缩，呈现作者电影或现实主义质感" },
    bleach: { label: "漂白旁路质感", rule: "低饱和、高微反差、银质黑位、粗粝而克制的胶片质感，适合战争、犯罪和工业环境；避免过度锐化与脏灰肤色" },
    warm: { label: "暖金与琥珀", rule: "暖金、琥珀、褐色与少量深绿构成怀旧或权力感，高光温暖、阴影保持中性或微冷，避免整张画面发黄" },
    cold: { label: "冷蓝灰", rule: "蓝灰、钢灰与冷白构成主色，肤色略微去暖但仍有血色，用少量中性亮部保持清晰，避免全片单一蓝滤镜" },
    blackred: { label: "黑白红强调", rule: "黑白或近乎无彩色画面中只保留一个深红叙事焦点；红色面积不超过约10%，形成强识别与危险暗示" },
    earth: { label: "大地色与军绿", rule: "灰褐、土黄、橄榄绿和旧布料色构成现实历史质感，饱和度低，火光或天空只提供有限冷暖变化" },
    pastel: { label: "柔和粉彩", rule: "粉色、浅黄、薄荷绿、天蓝等粉彩保持低至中等饱和，明度统一、阴影柔和，适合青春、喜剧、动画和生活方式封面" },
    jewel: { label: "宝石色 / 高贵浓郁", rule: "深红、祖母绿、蓝宝石与暗金中选择一至两种作为主色，暗部浓郁、高光克制，营造奢华和史诗感，不做多色堆叠" }
  };

  const fontProfiles = {
    serif: "高对比电影衬线字体，笔画优雅、字距舒展，适合史诗、剧情与爱情",
    condensed: "高窄无衬线字体，紧凑有压力，适合犯罪、动作、战争与流媒体封面",
    bold: "粗黑无衬线字体，字面宽大、缩略图识别强，适合商业、自媒体与喜剧",
    song: "中文宋体电影标题，横细竖粗、端庄克制，适合历史、文艺和现实题材",
    calligraphy: "东方书法标题，笔势有方向和力度，但字形必须可读，适合武侠与东方历史",
    handwritten: "克制手写字体，保留真实书写节奏，适合青春、爱情与纪录片",
    geometric: "几何无衬线或模块化科幻字体，结构精确、字距较宽，适合科幻与未来题材",
    horror: "局部残缺或压迫的惊悚字体，仍需保证字形完整可读，不使用廉价滴血效果",
    playful: "圆润或带节奏变化的活泼标题字体，结构清晰，适合喜剧与动画"
  };

  const COMPOSITOR_FONT_PRESETS = {
    serif: { cn: { fontFamily: "cn-display-serif", fontWeight: 700, letterSpacing: 20 }, en: { fontFamily: "en-serif", fontWeight: 700, letterSpacing: 110 } },
    condensed: { cn: { fontFamily: "cn-display", fontWeight: 700, letterSpacing: -50 }, en: { fontFamily: "en-condensed", fontWeight: 800, letterSpacing: 40 } },
    bold: { cn: { fontFamily: "cn-sans", fontWeight: 900, letterSpacing: 0 }, en: { fontFamily: "en-sans", fontWeight: 900, letterSpacing: 30 } },
    song: { cn: { fontFamily: "cn-serif", fontWeight: 700, letterSpacing: 30 }, en: { fontFamily: "en-serif", fontWeight: 600, letterSpacing: 100 } },
    calligraphy: { cn: { fontFamily: "cn-brush", fontWeight: 400, letterSpacing: 10 }, en: { fontFamily: "en-serif", fontWeight: 600, letterSpacing: 90 } },
    handwritten: { cn: { fontFamily: "cn-fangsong", fontWeight: 500, letterSpacing: 35 }, en: { fontFamily: "en-sans", fontWeight: 400, letterSpacing: 120 } },
    geometric: { cn: { fontFamily: "cn-display", fontWeight: 700, letterSpacing: 140 }, en: { fontFamily: "en-sans", fontWeight: 700, letterSpacing: 220 } },
    horror: { cn: { fontFamily: "cn-display-serif", fontWeight: 900, letterSpacing: -60 }, en: { fontFamily: "en-serif", fontWeight: 800, letterSpacing: 50 } },
    playful: { cn: { fontFamily: "cn-playful", fontWeight: 400, letterSpacing: 45 }, en: { fontFamily: "en-sans", fontWeight: 800, letterSpacing: 60 } }
  };

  const titlePositionProfiles = {
    bottom: "主标题放在画面底部约15%至25%区域，演员名或副标题位于其上方，演职员表置于最底部",
    top: "主标题放在顶部约12%至22%区域，避开人物头顶和高光，底部保留演职员表与日期",
    center: "主标题跨越画面中央，但不得遮挡人物眼睛、商品Logo或关键叙事物件",
    side: "主标题沿画面侧边竖向排列，保持阅读顺序和安全边距，适合东方海报与强留白构图",
    "negative-space": "把主标题完整放入画面最大留白区，标题与主体形成明确平衡，不压图"
  };

  const textColorProfiles = {
    white: "暖白或纯白标题，配极轻微暗色阴影或描边保证可读",
    black: "墨黑或深灰标题，适合明亮留白背景",
    red: "克制电影红标题，只作为主要文字焦点，不与其他鲜艳颜色竞争",
    gold: "暗金或温和金色标题，避免高亮塑料金和廉价渐变",
    cyan: "冷青或冰蓝标题，适合科幻、悬疑和冷调海报",
    auto: "根据标题所在区域自动选择最高可读反差色，整张海报只使用一套主文字颜色"
  };

  const referenceProfiles = {
    character: "引用已上传角色参考图作为最高身份优先级，严格保持同一张脸、年龄、肤色、发型、体型和服装轮廓；只改变构图、动作、环境和海报光线，不换脸",
    product: "引用已上传商品图作为最高产品优先级，严格保持商品外形、比例、材质、颜色、包装、Logo位置和结构，不改款、不变形、不生成相似产品替代",
    style: "上传图片只用于参考构图、色彩关系、光影方向和空间层次，不复制其中人物身份、品牌、文字或具体版权形象",
    none: "没有参考图，严格依据文字建立唯一清楚的主体，不添加无关人物、商品或品牌"
  };

  const focusProfiles = {
    face: "第一视觉焦点是人物脸部和眼神，眼睛清楚，五官不被文字、烟雾或高光遮挡",
    silhouette: "第一视觉焦点是人物轮廓、姿态和服装剪影，轮廓必须与背景形成清晰明暗分离",
    environment: "第一视觉焦点是环境尺度和世界观，人物作为尺度参照但仍能辨认身份与方向",
    object: "第一视觉焦点是关键物件或叙事符号，形状完整、材质真实、位置明确",
    product: "第一视觉焦点是商品外形、材质和功能结构，品牌核心区域清楚且不被装饰遮挡"
  };

  const DEFAULT_LAYOUT = { leftWidth: 320, rightWidth: 500 };
  const defaultTitleMarkState = normalizePosterTitleMarkState({});
  const state = {
    copied: false,
    sourceMode: "reference",
    purposeGroup: "film",
    selectedTemplate: "film-portrait-close",
    titleLibraryView: "composition",
    titleCategory: "all",
    titleLanguage: "bilingual",
    titleTemplate: DEFAULT_TITLE_TEMPLATE_ID,
    englishTitle: "",
    titleMaterial: getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID).materialOptions[0],
    ...defaultTitleMarkState,
    compositor: normalizePosterCompositorState({}),
    layout: { ...DEFAULT_LAYOUT }
  };

  const elements = {
    purpose: document.querySelector("#poster-purpose"),
    ratio: document.querySelector("#poster-ratio"),
    genre: document.querySelector("#poster-genre"),
    tone: document.querySelector("#poster-tone"),
    lighting: document.querySelector("#poster-lighting"),
    colorGrade: document.querySelector("#poster-color-grade"),
    composition: document.querySelector("#poster-composition"),
    subject: document.querySelector("#poster-subject"),
    environment: document.querySelector("#poster-environment"),
    look: document.querySelector("#poster-look"),
    reference: document.querySelector("#poster-reference"),
    sourceButtons: [...document.querySelectorAll("[data-poster-source]")],
    sourceNote: document.querySelector("#poster-source-note"),
    focus: document.querySelector("#poster-focus"),
    textMode: document.querySelector("#poster-text-mode"),
    font: document.querySelector("#poster-font"),
    titlePosition: document.querySelector("#poster-title-position"),
    textColor: document.querySelector("#poster-text-color"),
    title: document.querySelector("#poster-title"),
    titleLanguage: document.querySelector("#poster-title-language"),
    englishTitle: document.querySelector("#poster-english-title"),
    titleMaterial: document.querySelector("#poster-title-material"),
    titleTemplateSummary: document.querySelector("#poster-title-template-summary"),
    titleReferences: document.querySelector("#poster-title-references"),
    tagline: document.querySelector("#poster-tagline"),
    credits: document.querySelector("#poster-credits"),
    workspace: document.querySelector("#poster-workspace"),
    purposeGroupButtons: [...document.querySelectorAll("[data-poster-purpose-group]")],
    ratioButtons: [...document.querySelectorAll("[data-poster-ratio]")],
    templateList: document.querySelector("#poster-template-list"),
    libraryViewButtons: [...document.querySelectorAll("[data-poster-library-view]")],
    compositionLibrary: document.querySelector("#poster-composition-library"),
    titleLibrary: document.querySelector("#poster-title-library"),
    titleMarkLibrary: document.querySelector("#poster-title-mark-library"),
    titleCategoryButtons: [...document.querySelectorAll("[data-poster-title-category]")],
    titleLanguageButtons: [...document.querySelectorAll("[data-poster-title-language]")],
    titleTemplateList: document.querySelector("#poster-title-template-list"),
    titleMarkCategoryButtons: [...document.querySelectorAll("[data-poster-title-mark-category]")],
    titleMarkQuery: document.querySelector("#poster-title-mark-query"),
    titleMarkClearQuery: document.querySelector("#poster-title-mark-clear-query"),
    titleMarkFavoritesOnly: document.querySelector("#poster-title-mark-favorites-only"),
    titleMarkTemplateList: document.querySelector("#poster-title-mark-template-list"),
    titleMarkEmpty: document.querySelector("#poster-title-mark-empty"),
    titleMarkControls: document.querySelector(".poster-title-mark-controls"),
    titleMarkCategory: document.querySelector("#poster-title-mark-category"),
    titleMarkSkeleton: document.querySelector("#poster-title-mark-skeleton"),
    titleMarkMethods: document.querySelector("#poster-title-mark-methods"),
    titleMarkMetaphor: document.querySelector("#poster-title-mark-metaphor"),
    titleMarkMaterial: document.querySelector("#poster-title-mark-material"),
    titleMarkLighting: document.querySelector("#poster-title-mark-lighting"),
    titleMarkBackground: document.querySelector("#poster-title-mark-background"),
    titleMarkOutputMode: document.querySelector("#poster-title-mark-output-mode"),
    titleMarkSummary: document.querySelector("#poster-title-mark-summary"),
    titleMarkWarning: document.querySelector("#poster-title-mark-warning"),
    parameterScroll: document.querySelector(".poster-parameter-scroll"),
    parameterGroups: [...document.querySelectorAll(".poster-parameter-group")],
    compositorControls: document.querySelector(".poster-compositor-controls"),
    templateCount: document.querySelector("#poster-template-count"),
    monitorTitle: document.querySelector("#poster-monitor-title"),
    monitorContext: document.querySelector("#poster-monitor-context"),
    intent: document.querySelector("#poster-intent"),
    subjectRatio: document.querySelector("#poster-subject-ratio"),
    typographyRisk: document.querySelector("#poster-type-risk"),
    resizers: [...document.querySelectorAll("[data-poster-resizer]")],
    preview: document.querySelector("#poster-preview"),
    monitorCanvas: document.querySelector("#poster-monitor-canvas"),
    compositorStage: document.querySelector("#poster-compositor-stage"),
    compositorCanvas: document.querySelector("#poster-compositor-canvas"),
    compositorEmpty: document.querySelector("#poster-compositor-empty"),
    compositorCanvasWrap: document.querySelector("#poster-compositor-canvas-wrap"),
    canvasLayerButtons: [...document.querySelectorAll("[data-poster-canvas-layer]")],
    sourceUpload: document.querySelector("#poster-source-upload"),
    sourceReplace: document.querySelector("#poster-source-replace"),
    sourceRemove: document.querySelector("#poster-source-remove"),
    sourceStatus: document.querySelector("#poster-source-status"),
    viewFit: document.querySelector("#poster-view-fit"),
    view100: document.querySelector("#poster-view-100"),
    guidesToggle: document.querySelector("#poster-guides-toggle"),
    undo: document.querySelector("#poster-undo"),
    redo: document.querySelector("#poster-redo"),
    layerStatus: document.querySelector("#poster-layer-status"),
    exportSummary: document.querySelector("#poster-export-summary"),
    layerList: document.querySelector("#poster-layer-list"),
    addTextRole: document.querySelector("#poster-add-text-role"),
    addText: document.querySelector("#poster-add-text"),
    layerEditText: document.querySelector("#poster-layer-edit-text"),
    layerLineBreak: document.querySelector("#poster-layer-line-break"),
    layerText: document.querySelector("#poster-layer-text"),
    layerVisible: document.querySelector("#poster-layer-visible"),
    layerLocked: document.querySelector("#poster-layer-locked"),
    layerReset: document.querySelector("#poster-layer-reset"),
    layerNudgeButtons: [...document.querySelectorAll("[data-poster-layer-nudge]")],
    layerDuplicate: document.querySelector("#poster-layer-duplicate"),
    layerDelete: document.querySelector("#poster-layer-delete"),
    titleAssetUpload: document.querySelector("#poster-title-asset-upload"),
    titleAssetUploadButton: document.querySelector("[data-poster-title-asset-action='upload']"),
    titleAssetRemove: document.querySelector("#poster-title-asset-remove"),
    layerSize: document.querySelector("#poster-layer-size"),
    layerFontStyle: document.querySelector("#poster-layer-font-style"),
    layerColor: document.querySelector("#poster-layer-color"),
    layerLetterSpacing: document.querySelector("#poster-layer-letter-spacing"),
    layerLineHeight: document.querySelector("#poster-layer-line-height"),
    layerAlign: document.querySelector("#poster-layer-align"),
    layerRotation: document.querySelector("#poster-layer-rotation"),
    layerOpacity: document.querySelector("#poster-layer-opacity"),
    textLayerFields: [...document.querySelectorAll(".poster-text-layer-field")],
    positionButtons: [...document.querySelectorAll("[data-poster-position]")],
    exportFormat: document.querySelector("#poster-export-format"),
    download: document.querySelector("#poster-download"),
    output: document.querySelector("#poster-output"),
    outputLabel: document.querySelector("#poster-output-label"),
    badge: document.querySelector("#poster-format-badge"),
    status: document.querySelector("#poster-status-value"),
    filename: document.querySelector("#poster-filename"),
    example: document.querySelector("#poster-example"),
    clear: document.querySelector("#poster-clear"),
    copy: document.querySelector("#poster-copy"),
    validation: document.querySelector("#poster-validation"),
    checks: [...document.querySelectorAll("[data-poster-check]")]
  };

  let compositor = null;
  let sourcePreviewUrl = "";
  let titlePreviewUrl = "";
  let compositorRestoreToken = 0;
  let compositorBusy = false;
  let previewMode = "fit";
  let lastExportSummary = "";

  function value(element, fallback) {
    return element.value.trim() || fallback;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeName(text, fallback) {
    return String(text || "").trim().replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
  }

  function purposeGroupForValue(purpose) {
    if (purpose === "product") return "product";
    if (purpose === "streaming" || purpose === "social") return "social";
    return "film";
  }

  function currentTemplates() {
    return templateData.getTemplatesForPurpose(state.purposeGroup);
  }

  function currentTemplate() {
    const templates = currentTemplates();
    return templates.find((template) => template.id === state.selectedTemplate)
      || templates.find((template) => template.compositionKey === elements.composition.value)
      || templates[0];
  }

  function renderToneOptions() {
    const profile = genreProfiles[elements.genre.value] || genreProfiles.drama;
    const previous = elements.tone.value;
    elements.tone.innerHTML = "";
    Object.entries(profile.tones).forEach(([key, [label]]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      elements.tone.appendChild(option);
    });
    elements.tone.value = profile.tones[previous] ? previous : Object.keys(profile.tones)[0];
  }

  function renderCompositionOptions() {
    const templates = currentTemplates();
    const previous = elements.composition.value;
    const selected = templates.find((template) => template.id === state.selectedTemplate)
      || templates.find((template) => template.compositionKey === previous)
      || templates[0];
    elements.composition.innerHTML = "";
    templates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.compositionKey;
      option.textContent = template.label;
      elements.composition.appendChild(option);
    });
    state.selectedTemplate = selected.id;
    elements.composition.value = selected.compositionKey;
  }

  function renderPurposeGroups() {
    elements.purposeGroupButtons.forEach((button) => {
      const active = button.dataset.posterPurposeGroup === state.purposeGroup;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderRatioButtons() {
    elements.ratioButtons.forEach((button) => {
      const active = button.dataset.posterRatio === elements.ratio.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderTemplateLibrary() {
    const templates = currentTemplates();
    elements.templateCount.textContent = String(templates.length).padStart(2, "0");
    elements.templateList.innerHTML = templates.map((template) => {
      const selected = template.id === state.selectedTemplate;
      return `<button type="button" class="poster-template-card${selected ? " selected" : ""}" data-poster-template-id="${template.id}" role="option" aria-selected="${selected}">
        <img src="${template.image}" alt="${template.label}构图样片" loading="eager">
        <span class="poster-template-copy">
          <strong>${template.label}</strong>
          <span>${template.genreHint}</span>
          <small>${template.subjectRatio}</small>
        </span>
      </button>`;
    }).join("");
  }

  function currentTitleTemplate() {
    return getTitleTemplate(state.titleTemplate) || getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID);
  }

  function currentTitleMarkTemplate() {
    return getTitleMarkTemplate(state.titleMarkTemplate) || getTitleMarkTemplate(DEFAULT_TITLE_MARK_TEMPLATE_ID);
  }

  function renderLibraryView() {
    const compositionOpen = state.titleLibraryView === "composition";
    const titleOpen = state.titleLibraryView === "title";
    const titleMarkOpen = state.titleLibraryView === "title-mark";
    elements.compositionLibrary.hidden = !compositionOpen;
    elements.titleLibrary.hidden = !titleOpen;
    elements.titleMarkLibrary.hidden = !titleMarkOpen;
    elements.titleMarkControls.hidden = !titleMarkOpen;
    elements.libraryViewButtons.forEach((button) => {
      const active = button.dataset.posterLibraryView === state.titleLibraryView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function renderTitleFilters() {
    elements.titleCategoryButtons.forEach((button) => {
      const active = button.dataset.posterTitleCategory === state.titleCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.titleLanguageButtons.forEach((button) => {
      const active = button.dataset.posterTitleLanguage === state.titleLanguage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderTitleTemplateLibrary() {
    const templates = filterTitleTemplates({ category: state.titleCategory, language: state.titleLanguage });
    if (state.titleLibraryView === "title") elements.templateCount.textContent = String(templates.length).padStart(2, "0");
    elements.titleTemplateList.innerHTML = templates.map((template) => {
      const selected = template.id === state.titleTemplate;
      const genres = template.genreHints.join(" / ");
      const references = template.references.join(" · ");
      return `<button type="button" class="poster-title-template-card ${template.previewClass}" data-poster-title-template-id="${template.id}" role="option" aria-selected="${selected}">
        <strong>${escapeHtml(template.label)}</strong>
        <span>${escapeHtml(genres)}</span>
        <small>${escapeHtml(references)}</small>
      </button>`;
    }).join("");
  }

  function renderTitleMarkFilters() {
    elements.titleMarkCategoryButtons.forEach((button) => {
      const active = button.dataset.posterTitleMarkCategory === state.titleMarkCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.titleMarkCategory.value = state.titleMarkCategory;
    if (elements.titleMarkQuery.value !== state.titleMarkQuery) elements.titleMarkQuery.value = state.titleMarkQuery;
    elements.titleMarkClearQuery.disabled = !state.titleMarkQuery;
    elements.titleMarkFavoritesOnly.classList.toggle("active", state.titleMarkFavoritesOnly);
    elements.titleMarkFavoritesOnly.setAttribute("aria-pressed", String(state.titleMarkFavoritesOnly));
  }

  function visibleTitleMarkTemplates() {
    return filterTitleMarkTemplates({
      category: state.titleMarkCategory,
      query: state.titleMarkQuery,
      favorites: state.titleMarkFavorites,
      favoritesOnly: state.titleMarkFavoritesOnly
    });
  }

  function renderTitleMarkLibrary() {
    const templates = visibleTitleMarkTemplates();
    if (state.titleLibraryView === "title-mark") elements.templateCount.textContent = String(templates.length).padStart(2, "0");
    elements.titleMarkTemplateList.hidden = templates.length === 0;
    elements.titleMarkEmpty.hidden = templates.length !== 0;
    elements.titleMarkTemplateList.innerHTML = templates.map((template) => {
      const favorite = state.titleMarkFavorites.includes(template.id);
      return `
      <div class="poster-title-mark-template-card ${template.previewClass}"
        data-poster-title-mark-template-id="${template.id}" role="option"
        tabindex="0" aria-selected="${template.id === state.titleMarkTemplate}">
        <button type="button" class="poster-title-mark-favorite${favorite ? " active" : ""}"
          data-poster-title-mark-favorite-id="${template.id}" aria-pressed="${favorite}"
          title="${favorite ? "取消收藏" : "收藏此字标"}" aria-label="${favorite ? "取消收藏" : "收藏"}${escapeHtml(template.label)}">★</button>
        <span class="poster-title-mark-sample">${escapeHtml(template.sampleTitle)}</span>
        <strong>${escapeHtml(template.label)}</strong>
        <small>${escapeHtml(template.genreHints.join(" / "))}</small>
      </div>`;
    }).join("");
  }

  function optionMarkup(dictionary) {
    return Object.entries(dictionary).map(([id, option]) => `<option value="${id}">${escapeHtml(option.label)}</option>`).join("");
  }

  function renderTitleMarkControls() {
    const template = currentTitleMarkTemplate();
    elements.titleMarkSkeleton.innerHTML = optionMarkup(TITLE_MARK_SKELETONS);
    elements.titleMarkMaterial.innerHTML = optionMarkup(TITLE_MARK_MATERIALS);
    elements.titleMarkLighting.innerHTML = optionMarkup(TITLE_MARK_LIGHTING);
    elements.titleMarkBackground.innerHTML = optionMarkup(TITLE_MARK_BACKGROUNDS);
    elements.titleMarkSkeleton.value = state.titleMarkSkeleton;
    elements.titleMarkMaterial.value = state.titleMarkMaterial;
    elements.titleMarkLighting.value = state.titleMarkLighting;
    elements.titleMarkBackground.value = state.titleMarkBackground;
    elements.titleMarkOutputMode.value = state.titleMarkOutputMode;
    if (elements.titleMarkMetaphor.value !== state.titleMarkMetaphor) elements.titleMarkMetaphor.value = state.titleMarkMetaphor;
    elements.titleMarkMethods.innerHTML = Object.entries(TITLE_MARK_METHODS).map(([id, method]) => `
      <button type="button" data-poster-title-mark-method="${id}" aria-pressed="${state.titleMarkMethods.includes(id)}">${escapeHtml(method.label)}</button>`).join("");
    elements.titleMarkSummary.textContent = `${template.label} · ${template.genreHints.join(" / ")}`;
  }

  function renderTitleControls() {
    const template = currentTitleTemplate();
    if (!template.materialOptions.includes(state.titleMaterial)) state.titleMaterial = template.materialOptions[0];
    elements.titleLanguage.value = state.titleLanguage;
    if (elements.englishTitle.value !== state.englishTitle) elements.englishTitle.value = state.englishTitle;
    elements.titleMaterial.innerHTML = template.materialOptions.map((id) => {
      const material = TITLE_MATERIALS[id];
      return `<option value="${id}">${escapeHtml(material.label)}</option>`;
    }).join("");
    elements.titleMaterial.value = state.titleMaterial;
    elements.titleTemplateSummary.textContent = `${template.label} · ${template.genreHints.join(" / ")}`;
    elements.titleReferences.textContent = `参考观察：${template.references.join(" · ")}；仅提炼设计规律，不复刻专属字标。`;
  }

  function renderTemplateMetadata() {
    const template = currentTemplate();
    const purpose = purposeProfiles[elements.purpose.value] || purposeProfiles.film;
    elements.monitorTitle.textContent = template.label;
    elements.monitorContext.textContent = `${purpose.label} · ${template.genreHint}`;
    elements.intent.textContent = template.visualIntent;
    elements.subjectRatio.textContent = template.subjectRatio;
    elements.typographyRisk.textContent = template.typographyRisk;
  }

  function currentTone() {
    const genre = genreProfiles[elements.genre.value] || genreProfiles.drama;
    const tone = genre.tones[elements.tone.value] || Object.values(genre.tones)[0];
    return { genre: genre.label, name: tone[0], rule: tone[1] };
  }

  function referenceRule() {
    if (state.sourceMode === "text") {
      return "纯文字新建模式，不使用任何人物、商品或风格参考图；严格依据文字设定从零建立一个原创且唯一的主体。人物需要固定年龄、性别呈现、面部结构、发型、体型、服装和情绪；商品需要固定外形、比例、材质、颜色、结构和品牌区域，不得擅自添加相似角色、明星脸、现成IP或其他商品";
    }
    return referenceProfiles[elements.reference.value];
  }

  function renderSourceMode() {
    elements.sourceButtons.forEach((button) => {
      const active = button.dataset.posterSource === state.sourceMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const textMode = state.sourceMode === "text";
    elements.reference.disabled = textMode;
    elements.sourceNote.textContent = textMode
      ? "不需要上传参考图。请在“主视觉主体”中写清人物外貌、年龄、服装、动作、情绪，或商品外形、材质和结构。"
      : "使用上传的角色图、商品图或构图图，锁定需要保留的身份、产品或视觉关系。";
  }

  function typographyRule() {
    const title = value(elements.title, "[填写主标题]");
    const englishTitle = value(elements.englishTitle, "[填写英文标题或英文伴随标题]");
    const tagline = value(elements.tagline, "[填写副标题或宣传语]");
    const credits = value(elements.credits, "[填写演员、导演、日期、平台或卖点]");
    const titleTemplate = currentTitleTemplate();
    const titleMaterial = TITLE_MATERIALS[state.titleMaterial] || TITLE_MATERIALS[titleTemplate.materialOptions[0]];
    const languageText = state.titleLanguage === "cn"
      ? `中文主标题“${title}”，不生成英文标题`
      : state.titleLanguage === "en"
        ? `英文主标题“${englishTitle}”，中文片名只作为可选小型译名“${title}”`
        : `中文主标题“${title}”，英文伴随标题“${englishTitle}”`;
    const layout = `标题系统：${titleTemplate.label}。中文规则：${titleTemplate.cnRule}。英文规则：${titleTemplate.enRule}。层级：${titleTemplate.hierarchyRule}。排版：${titleTemplate.layoutRule}。${titlePositionProfiles[elements.titlePosition.value]}。补充字体方向：${fontProfiles[elements.font.value]}。材质：${titleMaterial.label}，${titleMaterial.rule}。颜色：${textColorProfiles[elements.textColor.value]}。设计原则：${titleTemplate.promptRule}。专属限制：${titleTemplate.negativeRule}。`;
    if (elements.textMode.value === "reserved") {
      return `生成无字海报底图，不在图像中实际出现任何文字、字母、数字、Logo或演职员表，但必须依据以下内容预留真实排版空间。${languageText}；宣传语“${tagline}”；附加层级“${credits}”。${layout} 留白区背景干净、明暗稳定、没有人物脸、商品主体或复杂纹理，方便后期准确排字。`;
    }
    if (elements.textMode.value === "direct") {
      return `在海报中直接生成以下准确文字：${languageText}，宣传语“${tagline}”，附加层级“${credits}”。必须逐字准确，不自动翻译，不添加随机文字。${layout} 文字不遮挡人物眼睛、商品Logo和关键叙事物件。`;
    }
    return "纯主视觉海报，不生成文字，也不刻意保留标题区；画面以主体、影调和叙事符号完成视觉冲击。不要任何文字、字母、数字、Logo或水印。";
  }

  function composePrompt() {
    const purpose = purposeProfiles[elements.purpose.value] || purposeProfiles.film;
    const tone = currentTone();
    const composition = compositionProfiles[elements.composition.value];
    const template = currentTemplate();
    const subject = value(elements.subject, "[填写人物、商品或核心主视觉主体]");
    const environment = value(elements.environment, "[填写时代、地点、天气、背景层次、关键物件和材质]");
    const inheritedLook = value(elements.look, "未指定；以当前影片类型与海报影调为准");
    const lighting = lightingProfiles[elements.lighting.value];
    const colorGrade = colorGradeProfiles[elements.colorGrade.value];
    return `【生成任务】\n生成一张${purpose.label}，${elements.ratio.value}构图，高分辨率正式主视觉，不是普通剧照截图，不是简单人物抠图，不是模板化宣传页。\n\n【主体建立模式】\n${state.sourceMode === "text" ? "纯文字新建" : "上传参考图"}。${referenceRule()}。\n\n【主视觉内容】\n主体：${subject}。\n环境与关键元素：${environment}。\n视觉重点：${focusProfiles[elements.focus.value]}。\n\n【主流海报构图形式】\n${composition.label}：${template.promptRule} 保持明确的前景、中景、背景层次，主体轮廓完整，视觉动线最终回到主标题区或核心主体。\n\n【项目继承影调】\n${inheritedLook}。这是本项目统一视觉基线，后续海报布光与色彩只能在此基础上细化，不能改成互相冲突的另一套影片风格。\n\n【影片类型与基础影调】\n类型：${tone.genre}。影调方案：${tone.name}。${tone.rule}。\n\n【电影布光】\n${lighting.label}：${lighting.rule}。明确主光方向、光源高度、软硬程度、主辅光比、环境光来源、轮廓光和局部高光；所有投影方向一致，高光不过曝，暗部不死黑。\n\n【电影色彩关系】\n${colorGrade.label}：${colorGrade.rule}。整张海报只使用一个主色体系、一个辅助色和一个小面积强调色；人物肤色或商品固有色准确，避免多种调色方案互相污染。\n\n【字体与文字排版】\n${typographyRule()}\n\n【海报完成度】\n院线电影或专业商业宣传级Key Art，构图成熟，信息层级清楚，缩略图仍有识别度；真实摄影或与所选类型一致的高质量动画材质，边缘干净，空气、烟雾、雨水、火光、金属、玻璃、布料、皮肤或商品表面具有可信物理质感。画面四周保留安全边距，重要人物脸、标题区和商品主体不贴边。\n\n【限定负面】\n不要廉价模板海报，不要头像无序拼贴，不要主体重复，不要多余人物，不要换脸，不要五官变形，不要手指错误，不要肢体穿模，不要商品变形，不要Logo位置变化，不要背景杂乱，不要光源冲突，不要多重主光，不要投影方向矛盾，不要肤色脏灰，不要高光爆白，不要暗部死黑，不要廉价霓虹堆叠，不要全图单一滤镜染色，不要多套互补色并用，不要渐变色污染整张画面，不要随机文字，不要乱码，不要错误英文，不要伪造演职员名单，不要文字压住眼睛，不要标题贴边，不要过度锐化，不要塑料皮肤，不要游戏CG感，不要水印。`;
  }

  function titleMarkLanguageRule() {
    const chinese = value(elements.title, "[填写准确中文片名]");
    const english = state.englishTitle.trim();
    if (state.titleLanguage === "cn") {
      return `只生成中文片名“${chinese}”，必须逐字准确，不生成英文、拼音或其他伴随文字。`;
    }
    if (state.titleLanguage === "en") {
      return `只生成英文片名“${english || "[填写准确英文片名]"}”，保持字母、空格与标点完全一致，不自动增加中文译名。`;
    }
    return english
      ? `中文主标“${chinese}”，英文伴随标题“${english}”；${currentTitleMarkTemplate().hierarchyRule}。两种语言都必须逐字准确。`
      : `中文主标“${chinese}”；英文伴随标题尚未填写，本次不要自动翻译或随机生成英文。${currentTitleMarkTemplate().hierarchyRule}。`;
  }

  function composeTitleMarkPrompt() {
    const template = currentTitleMarkTemplate();
    const skeleton = TITLE_MARK_SKELETONS[state.titleMarkSkeleton];
    const methods = state.titleMarkMethods.map((id) => TITLE_MARK_METHODS[id]).filter(Boolean);
    const material = TITLE_MARK_MATERIALS[state.titleMarkMaterial];
    const lighting = TITLE_MARK_LIGHTING[state.titleMarkLighting];
    const background = TITLE_MARK_BACKGROUNDS[state.titleMarkBackground];
    const outputMode = TITLE_MARK_OUTPUT_MODES[state.titleMarkOutputMode];
    const metaphor = state.titleMarkMetaphor.trim() || template.metaphorRule;
    const modeRule = state.titleMarkOutputMode === "composite"
      ? `${outputMode.rule}。字标放置规则：${titlePositionProfiles[elements.titlePosition.value]}；保持四周安全边距，避开人物眼睛、关键物件和高光区域，并让字缘光方向服从目标海报主光。`
      : `${outputMode.rule}。${background.rule}，字标完整居中，四周保留足够安全边距，便于后期无损抠取和缩放。`;
    return `【生成任务】\n设计一套院线电影级原创片名字标，不是选择现成字体，不是普通文字排版；先保证片名准确可读，再进行有限度造字。\n\n【准确文字】\n${titleMarkLanguageRule()}\n\n【字形骨架】\n${skeleton.label}：${skeleton.rule}。\n\n【造字方法】\n${methods.map((method, index) => `${index + 1}. ${method.label}：${method.rule}`).join("\n")}\n\n【单一图形隐喻】\n只使用一个隐喻“${metaphor}”。隐喻必须融入非关键笔画或负形，不能替代文字，不能再叠加第二套图形概念。\n\n【选定字标系统】\n${template.label}：${template.promptRule}。${template.metaphorRule}。\n\n【材质与光影】\n${material.label}：${material.rule}。${lighting.label}：${lighting.rule}。\n\n【语言层级】\n${titleMarkLanguageRule()}\n\n【输出方式】\n${modeRule}\n\n【完成度】\n专业电影片名字标、成熟字体设计、清晰字腔、统一重心、统一笔画逻辑、缩略图可识别、边缘干净、高分辨率。只输出一套最终字标方案。\n\n【限定负面】\n无人物、无场景、无海报排版；不要现成字体直接打字，不要多个字体混搭，不要多个隐喻，不要装饰堆叠，不要廉价3D挤压，不要彩虹渐变，不要游戏Logo感，不要综艺字效，不要笔画互相粘连，不要缺少关键笔画，不要错字、乱码、随机英文，不要自动翻译，不要额外副标题，不要水印。${template.negativeRule}。`;
  }

  function activePosterPrompt() {
    return state.titleLibraryView === "title-mark" ? composeTitleMarkPrompt() : composePrompt();
  }

  function titleMarkValidation() {
    if (state.titleLibraryView !== "title-mark") return { blocking: [], advisory: [] };
    const chinese = elements.title.value.trim();
    const english = state.englishTitle.trim();
    const blocking = [];
    const advisory = [];
    if (state.titleLanguage !== "en" && !chinese) blocking.push("请填写准确中文片名");
    if (state.titleLanguage === "en" && !english) blocking.push("请填写准确英文片名");
    if (state.titleLanguage === "bilingual" && !english) advisory.push("英文伴随标题未填写，将禁止模型自动翻译");
    if ((chinese.match(/[\u3400-\u9fff]/g) || []).length > 8) advisory.push("中文片名超过8字，建议拆成两行或先缩短测试");
    if (state.titleMarkMetaphor.trim().split(/[,，、/；;|]+/).filter(Boolean).length > 1) advisory.push("图形隐喻建议只保留一个，避免字标概念互相冲突");
    return { blocking, advisory };
  }

  function ratioClass() {
    return `ratio-${elements.ratio.value.replace(":", "x")}`;
  }

  function renderTitleMarkPreview() {
    const template = currentTitleMarkTemplate();
    const titleText = value(elements.title, template.sampleTitle);
    const englishText = state.englishTitle.trim() || template.sampleEnglish;
    const showChinese = state.titleLanguage !== "en";
    const showEnglish = state.titleLanguage !== "cn";
    return `<div class="poster-title-mark-preview ${template.previewClass} title-mark-material-${state.titleMarkMaterial} title-mark-light-${state.titleMarkLighting}" data-title-language="${state.titleLanguage}">
      <span class="poster-title-mark-preview-label">合成示意</span>
      ${showChinese ? `<strong class="poster-title-mark-preview-cn">${escapeHtml(titleText)}</strong>` : ""}
      ${showEnglish ? `<small class="poster-title-mark-preview-en">${escapeHtml(englishText)}</small>` : ""}
    </div>`;
  }

  function renderPreview() {
    const composition = compositionProfiles[elements.composition.value];
    const template = currentTemplate();
    const titleTemplate = currentTitleTemplate();
    const textVisible = elements.textMode.value !== "visual-only";
    const titleClass = `preview-title-${elements.titlePosition.value}`;
    const chineseFontStyle = state.compositor.layers["title-cn"].fontStyleKey || elements.font.value;
    const englishFontStyle = state.compositor.layers["title-en"].fontStyleKey || elements.font.value;
    const chineseTitle = elements.textMode.value === "reserved" ? "标题安全区" : value(elements.title, "主标题");
    const englishTitle = elements.textMode.value === "reserved" ? "TITLE AREA" : (state.englishTitle.trim() || "ENGLISH TITLE");
    const showChinese = state.titleLanguage !== "en";
    const showEnglish = state.titleLanguage !== "cn";
    const titleLayer = state.titleLibraryView === "title-mark"
      ? renderTitleMarkPreview()
      : (textVisible ? `<div class="poster-preview-title poster-preview-title-system ${titleClass} ${titleTemplate.previewClass} custom-font-${elements.font.value} title-material-${state.titleMaterial}" data-title-language="${state.titleLanguage}">
          ${showChinese ? `<strong class="poster-preview-title-cn custom-font-${chineseFontStyle}">${escapeHtml(value(elements.title, chineseTitle))}</strong>` : ""}
          ${showEnglish ? `<small class="poster-preview-title-en custom-font-${englishFontStyle}">${escapeHtml(state.englishTitle || englishTitle)}</small>` : ""}
        </div>` : "");
    elements.monitorCanvas.className = `poster-monitor-canvas poster-preview-canvas ${ratioClass()} ${composition.css}`;
    elements.monitorCanvas.innerHTML = `
        <img class="poster-monitor-image" src="${template.image}" alt="${template.label}构图监看">
        <div class="poster-monitor-shade"></div>
        <div class="poster-safe-area" aria-hidden="true"></div>
        ${titleLayer}
        ${textVisible ? '<div class="poster-preview-credits"></div>' : ""}`;
  }

  function currentCompositorState() {
    if (compositor) state.compositor = normalizePosterCompositorState({ ...compositor.serialize(), sourceAsset: state.compositor.sourceAsset, titleAsset: state.compositor.titleAsset, exportFormat: state.compositor.exportFormat, guidesVisible: state.compositor.guidesVisible, snapEnabled: state.compositor.snapEnabled });
    return state.compositor;
  }

  function applyOutputRatio() {
    if (!compositor) return;
    compositor.setOutputRatio(elements.ratio.value);
    if (previewMode === "100") compositor.setPreviewScale("100");
    else compositor.resizePreview();
    lastExportSummary = "";
  }

  function selectedCompositorLayer() {
    const compositorState = currentCompositorState();
    return compositorState.layers[compositorState.selectedLayer];
  }

  function applyCompositorTypography(fontKey) {
    applyTypographyToLayer("title-cn", fontKey);
    applyTypographyToLayer("title-en", fontKey);
  }

  function applyTypographyToLayer(layerId, fontKey) {
    const compositorState = currentCompositorState();
    const layer = compositorState.layers[layerId];
    if (!layer || layerId === "title-image") return;
    const language = layerId === "title-en" || (!/[\u3400-\u9fff]/.test(layer.text || "") && /[A-Za-z]/.test(layer.text || "")) ? "en" : "cn";
    const preset = COMPOSITOR_FONT_PRESETS[fontKey] || COMPOSITOR_FONT_PRESETS.serif;
    const patch = { ...preset[language], fontStyleKey: fontKey };
    state.compositor = normalizePosterCompositorState({
      ...compositorState,
      layers: { ...compositorState.layers, [layerId]: { ...compositorState.layers[layerId], ...patch } }
    });
    compositor?.updateLayer(layerId, patch);
  }

  function layerName(id, layer) {
    if (id === "title-image") return "透明字标";
    return layer.label || ({ "title-cn": "中文片名", "title-en": "英文副标" }[id]) || "文字图层";
  }

  function renderCompositorLayerList(compositorState) {
    const orderedIds = ["title-cn", "title-en", ...Object.keys(compositorState.layers).filter((id) => id.startsWith("text-")), "title-image"];
    elements.layerList.innerHTML = orderedIds.filter((id) => compositorState.layers[id]).map((id) => {
      const layer = compositorState.layers[id];
      const active = id === compositorState.selectedLayer;
      const isImage = id === "title-image";
      const badge = isImage ? "PNG" : id === "title-cn" ? "中" : id === "title-en" ? "EN" : "T";
      const detail = isImage ? (compositorState.titleAsset ? "已载入字标" : "等待上传") : `${layer.visible ? "显示" : "隐藏"}${layer.locked ? " · 位置已锁" : ""}`;
      return `<button${id === "title-cn" ? ' id="poster-layer-title-cn"' : id === "title-en" ? ' id="poster-layer-title-en"' : id === "title-image" ? ' id="poster-layer-title-image"' : ""} type="button" data-poster-layer="${id}" role="option" aria-selected="${active}"><span>${badge}</span><strong>${escapeHtml(layerName(id, layer))}</strong><small>${escapeHtml(detail)}</small></button>`;
    }).join("");
  }

  function renderCompositorControls() {
    const compositorState = currentCompositorState();
    const layer = compositorState.layers[compositorState.selectedLayer];
    const hasSource = Boolean(compositorState.sourceAsset && sourcePreviewUrl && compositor);
    const isText = compositorState.selectedLayer !== "title-image";
    elements.monitorCanvas.hidden = hasSource;
    elements.parameterScroll.classList.toggle("is-compositor-mode", hasSource);
    elements.compositorStage.hidden = !hasSource;
    elements.compositorEmpty.hidden = hasSource;
    elements.sourceReplace.querySelector("span").textContent = hasSource ? "替换海报" : "上传海报";
    elements.sourceRemove.disabled = !compositorState.sourceAsset || compositorBusy;
    elements.sourceStatus.textContent = hasSource
      ? `${compositorState.sourceAsset.name} · ${compositorState.sourceAsset.width}×${compositorState.sourceAsset.height}`
      : compositorState.sourceAsset ? "本机海报图片已丢失，请重新上传" : "示例画面 · 尚未上传海报";
    renderCompositorLayerList(compositorState);
    elements.canvasLayerButtons.forEach((button) => {
      const id = button.dataset.posterCanvasLayer;
      button.setAttribute("aria-pressed", String(id === compositorState.selectedLayer));
      button.disabled = id === "title-image" && !compositorState.titleAsset;
    });
    elements.layerVisible.setAttribute("aria-pressed", String(layer.visible));
    elements.layerVisible.querySelector("span").textContent = layer.visible ? "显示" : "隐藏";
    elements.layerLocked.setAttribute("aria-pressed", String(layer.locked));
    elements.layerLocked.querySelector("span").textContent = layer.locked ? "位置已锁" : "锁定位置";
    elements.layerSize.value = String(Math.round(layer.widthRatio * 100));
    if (isText) {
      elements.layerFontStyle.value = layer.fontStyleKey || (compositorState.selectedLayer === "title-cn" ? "song" : "bold");
      if (document.activeElement !== elements.layerText) elements.layerText.value = layer.text || "";
      elements.layerColor.value = layer.color || "#f7f3e8";
    }
    elements.layerLetterSpacing.value = String(layer.letterSpacing || 0);
    elements.layerLineHeight.value = String(Math.round((layer.lineHeight || 1) * 100));
    elements.layerAlign.value = layer.align || "center";
    elements.layerRotation.value = String(Math.round(layer.rotation));
    elements.layerOpacity.value = String(Math.round(layer.opacity * 100));
    elements.textLayerFields.forEach((field) => { field.hidden = !isText; });
    elements.layerEditText.hidden = !isText;
    elements.layerLineBreak.hidden = !isText;
    elements.layerEditText.disabled = !hasSource || compositorBusy;
    elements.layerLineBreak.disabled = !hasSource || compositorBusy;
    elements.layerNudgeButtons.forEach((button) => { button.disabled = !hasSource || compositorBusy || layer.locked || layer.visible === false; });
    elements.addText.disabled = !hasSource || compositorBusy;
    elements.layerDuplicate.disabled = !hasSource || !isText || compositorBusy;
    elements.layerDelete.disabled = !hasSource || !compositorState.selectedLayer.startsWith("text-") || compositorBusy;
    elements.titleAssetRemove.disabled = !compositorState.titleAsset || compositorBusy;
    elements.download.disabled = !hasSource || compositorBusy;
    elements.exportFormat.value = compositorState.exportFormat;
    const history = compositor?.getHistoryStatus() || { canUndo: false, canRedo: false };
    elements.undo.disabled = !history.canUndo;
    elements.redo.disabled = !history.canRedo;
    elements.guidesToggle.setAttribute("aria-pressed", String(compositorState.guidesVisible));
    elements.compositorStage.classList.toggle("guides-hidden", !compositorState.guidesVisible);
    elements.layerStatus.textContent = `当前图层：${layerName(compositorState.selectedLayer, layer)}`;
    const outputSize = compositor?.getSourceSize() || { width: 0, height: 0 };
    elements.exportSummary.textContent = lastExportSummary || (hasSource ? `${outputSize.width}×${outputSize.height} · ${compositorState.exportFormat.toUpperCase()}` : "上传后按所选画幅导出");
    compositor?.setTexts({ chinese: elements.title.value || "片名", english: elements.englishTitle.value || "FILM TITLE" });
  }

  function render() {
    renderToneOptions();
    renderCompositionOptions();
    const purpose = purposeProfiles[elements.purpose.value] || purposeProfiles.film;
    renderPurposeGroups();
    renderRatioButtons();
    renderTemplateLibrary();
    renderLibraryView();
    renderTitleFilters();
    renderTitleTemplateLibrary();
    renderTitleControls();
    renderTitleMarkFilters();
    renderTitleMarkLibrary();
    renderTitleMarkControls();
    renderTemplateMetadata();
    renderSourceMode();
    elements.badge.textContent = elements.ratio.value;
    elements.status.textContent = purpose.status;
    elements.output.value = activePosterPrompt();
    elements.outputLabel.textContent = state.titleLibraryView === "title-mark" ? "AI片名字标固定提示词" : "海报生图固定提示词";
    elements.copy.textContent = state.copied ? "已复制" : "复制提示词";
    const titleMarkStatus = titleMarkValidation();
    const titleRequired = state.titleLibraryView === "title-mark" || elements.textMode.value !== "visual-only";
    const checks = {
      subject: state.titleLibraryView === "title-mark" || elements.subject.value.trim(),
      environment: state.titleLibraryView === "title-mark" || elements.environment.value.trim(),
      lighting: state.titleLibraryView === "title-mark" || elements.lighting.value,
      tone: state.titleLibraryView === "title-mark" || elements.tone.value,
      title: !titleRequired || (state.titleLibraryView === "title-mark"
        ? titleMarkStatus.blocking.length === 0
        : elements.title.value.trim()),
      reference: state.titleLibraryView === "title-mark" || state.sourceMode === "text" || elements.reference.value
    };
    const missing = Object.entries(checks).filter(([, ready]) => !ready).map(([key]) => key);
    elements.checks.forEach((check) => {
      const ready = Boolean(checks[check.dataset.posterCheck]);
      check.classList.toggle("ready", ready);
      check.classList.toggle("missing", !ready);
    });
    elements.copy.disabled = missing.length > 0 || titleMarkStatus.blocking.length > 0;
    elements.titleMarkWarning.textContent = [...titleMarkStatus.blocking, ...titleMarkStatus.advisory].join("；");
    elements.titleMarkWarning.classList.toggle("is-blocking", titleMarkStatus.blocking.length > 0);
    elements.validation.textContent = missing.length
      ? `还需完成 ${missing.length} 项${state.titleLibraryView === "title-mark" ? "字标" : "海报"}信息。`
      : state.titleLibraryView === "title-mark" ? "片名字标信息完整，可以复制生成。" : "海报信息完整，可以复制生成。";
    elements.validation.classList.toggle("ready", missing.length === 0);
    elements.filename.textContent = state.titleLibraryView === "title-mark"
      ? `TITLEMARK_${safeName(elements.title.value || state.englishTitle, "片名")}_${safeName(currentTitleMarkTemplate().label, "字标")}_v001.png`
      : `POSTER_${safeName(elements.title.value, "项目名")}_${safeName(purpose.label, "主视觉")}_${elements.ratio.value.replace(":", "x")}_v001.png`;
    renderPreview();
    renderCompositorControls();
  }

  function clamp(number, minimum, maximum) {
    return Math.min(Math.max(number, minimum), maximum);
  }

  function layoutBounds() {
    const workspaceWidth = elements.workspace.clientWidth || root.innerWidth || 1440;
    const fixedSpace = 28 + 18;
    const centerMinimum = 420;
    return {
      leftMax: Math.max(280, Math.min(430, workspaceWidth - state.layout.rightWidth - centerMinimum - fixedSpace)),
      rightMax: Math.max(420, Math.min(620, workspaceWidth - state.layout.leftWidth - centerMinimum - fixedSpace))
    };
  }

  function applyLayout(nextLayout = state.layout) {
    const left = Number.isFinite(Number(nextLayout.leftWidth)) ? Number(nextLayout.leftWidth) : DEFAULT_LAYOUT.leftWidth;
    const right = Number.isFinite(Number(nextLayout.rightWidth)) ? Number(nextLayout.rightWidth) : DEFAULT_LAYOUT.rightWidth;
    state.layout.leftWidth = clamp(left, 280, 430);
    state.layout.rightWidth = clamp(right, 420, 620);
    const bounds = layoutBounds();
    state.layout.leftWidth = clamp(state.layout.leftWidth, 280, bounds.leftMax);
    state.layout.rightWidth = clamp(state.layout.rightWidth, 420, bounds.rightMax);
    elements.workspace.style.setProperty("--poster-left-width", `${Math.round(state.layout.leftWidth)}px`);
    elements.workspace.style.setProperty("--poster-right-width", `${Math.round(state.layout.rightWidth)}px`);
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.posterResizer;
      const current = side === "left" ? state.layout.leftWidth : state.layout.rightWidth;
      resizer.setAttribute("aria-valuenow", String(Math.round(current)));
      resizer.setAttribute("aria-valuemin", side === "left" ? "280" : "420");
      resizer.setAttribute("aria-valuemax", side === "left" ? String(Math.round(bounds.leftMax)) : String(Math.round(bounds.rightMax)));
    });
  }

  function notifyWorkspaceDirty() {
    root.document.dispatchEvent(new CustomEvent("aigc:workspace-dirty", { detail: { workspace: "poster" } }));
  }

  function releasePreviewUrl(kind) {
    const url = kind === "source" ? sourcePreviewUrl : titlePreviewUrl;
    if (url) root.URL.revokeObjectURL(url);
    if (kind === "source") sourcePreviewUrl = "";
    else titlePreviewUrl = "";
  }

  async function persistCompositorNow() {
    notifyWorkspaceDirty();
    const persist = root.aigcWorkspaceCore?.persistNow;
    if (typeof persist === "function") await persist();
  }

  function bindCompositor(instance) {
    instance.on("change", (nextState) => {
      lastExportSummary = "";
      state.compositor = normalizePosterCompositorState({ ...nextState, sourceAsset: state.compositor.sourceAsset, titleAsset: state.compositor.titleAsset, exportFormat: state.compositor.exportFormat, guidesVisible: state.compositor.guidesVisible, snapEnabled: state.compositor.snapEnabled });
      if (nextState.outputRatio && elements.ratio.value !== nextState.outputRatio) {
        elements.ratio.value = nextState.outputRatio;
        renderRatioButtons();
      }
      renderCompositorControls();
      notifyWorkspaceDirty();
    });
    instance.on("selectionchange", () => renderCompositorControls());
    instance.on("editrequest", ({ id }) => {
      renderCompositorControls();
      const layer = currentCompositorState().layers[id];
      elements.layerStatus.textContent = `正在编辑：${layerName(id, layer)}`;
      elements.layerText.focus({ preventScroll: false });
      elements.layerText.select();
    });
    instance.on("textchange", ({ id, text }) => {
      if (id === "title-cn") elements.title.value = text;
      if (id === "title-en") {
        elements.englishTitle.value = text;
        state.englishTitle = text;
      }
      state.copied = false;
      render();
      notifyWorkspaceDirty();
    });
  }

  async function activateCompositorSource(sourceRecord, sourceUrl, titleRecord = null, titleUrl = "") {
    compositor?.destroy();
    elements.compositorStage.hidden = false;
    elements.monitorCanvas.hidden = true;
    compositor = createPosterCompositor({
      canvasElement: elements.compositorCanvas,
      stageElement: elements.compositorStage,
      state: state.compositor,
      chinese: elements.title.value || "片名",
      english: elements.englishTitle.value || "FILM TITLE"
    });
    bindCompositor(compositor);
    await compositor.setSource({ url: sourceUrl, width: sourceRecord.width, height: sourceRecord.height });
    state.titleLibraryView = "title";
    elements.parameterGroups.forEach((group) => { group.open = group === elements.compositorControls; });
    renderLibraryView();
    renderTitleTemplateLibrary();
    compositor.setOutputRatio(elements.ratio.value);
    if (titleRecord && titleUrl) await compositor.setTitleAsset({ url: titleUrl, width: titleRecord.width, height: titleRecord.height });
    compositor.selectLayer(state.compositor.selectedLayer);
    if (previewMode === "100") compositor.setPreviewScale("100");
    else compositor.resizePreview();
  }

  async function restoreCompositorAssets() {
    const token = ++compositorRestoreToken;
    compositor?.destroy();
    compositor = null;
    releasePreviewUrl("source");
    releasePreviewUrl("title");
    const sourceMeta = state.compositor.sourceAsset;
    if (!sourceMeta) {
      renderCompositorControls();
      return;
    }
    compositorBusy = true;
    renderCompositorControls();
    try {
      const sourceRecord = await posterAssetStore.get(sourceMeta.id);
      if (token !== compositorRestoreToken) return;
      if (!sourceRecord?.blob) {
        renderCompositorControls();
        return;
      }
      const titleRecord = state.compositor.titleAsset ? await posterAssetStore.get(state.compositor.titleAsset.id) : null;
      if (token !== compositorRestoreToken) return;
      sourcePreviewUrl = root.URL.createObjectURL(sourceRecord.blob);
      if (titleRecord?.blob) titlePreviewUrl = root.URL.createObjectURL(titleRecord.blob);
      await activateCompositorSource(sourceRecord, sourcePreviewUrl, titleRecord, titlePreviewUrl);
    } catch (error) {
      elements.sourceStatus.textContent = error.message || "本机海报恢复失败";
    } finally {
      if (token === compositorRestoreToken) {
        compositorBusy = false;
        renderCompositorControls();
      }
    }
  }

  async function replaceSourceFile(file) {
    lastExportSummary = "";
    const oldMeta = state.compositor.sourceAsset;
    const oldTitleMeta = state.compositor.titleAsset;
    const oldSourceUrl = sourcePreviewUrl;
    const oldTitleUrl = titlePreviewUrl;
    let candidate = null;
    let candidateUrl = "";
    compositorBusy = true;
    elements.sourceStatus.textContent = "正在校验并载入海报…";
    renderCompositorControls();
    try {
      const inspection = await posterAssetStore.inspectPosterImage(file, "source");
      candidate = await posterAssetStore.put(file, { kind: "source", name: file.name, ...inspection });
      candidateUrl = root.URL.createObjectURL(file);
      state.compositor.sourceAsset = candidate;
      sourcePreviewUrl = candidateUrl;
      state.titleLibraryView = "title";
      const titleRecord = oldTitleMeta ? await posterAssetStore.get(oldTitleMeta.id) : null;
      await activateCompositorSource(candidate, candidateUrl, titleRecord, oldTitleUrl);
      render();
      await persistCompositorNow();
      if (oldMeta?.id && oldMeta.id !== candidate.id) await posterAssetStore.remove(oldMeta.id);
      if (oldSourceUrl && oldSourceUrl !== candidateUrl) root.URL.revokeObjectURL(oldSourceUrl);
    } catch (error) {
      if (candidate?.id) await posterAssetStore.remove(candidate.id).catch(() => {});
      if (candidateUrl) root.URL.revokeObjectURL(candidateUrl);
      state.compositor.sourceAsset = oldMeta;
      sourcePreviewUrl = oldSourceUrl;
      titlePreviewUrl = oldTitleUrl;
      if (oldMeta && oldSourceUrl) {
        const titleRecord = oldTitleMeta ? await posterAssetStore.get(oldTitleMeta.id).catch(() => null) : null;
        await activateCompositorSource(oldMeta, oldSourceUrl, titleRecord, oldTitleUrl).catch(() => {});
      } else {
        compositor?.destroy();
        compositor = null;
      }
      elements.sourceStatus.textContent = error.message || "海报载入失败，已保留原画面";
    } finally {
      compositorBusy = false;
      renderCompositorControls();
    }
  }

  async function removeSourceAsset() {
    const oldMeta = state.compositor.sourceAsset;
    const oldUrl = sourcePreviewUrl;
    if (!oldMeta) return;
    compositorBusy = true;
    lastExportSummary = "";
    state.compositor.sourceAsset = null;
    compositor?.destroy();
    compositor = null;
    try {
      await persistCompositorNow();
      await posterAssetStore.remove(oldMeta.id);
      if (oldUrl) root.URL.revokeObjectURL(oldUrl);
      sourcePreviewUrl = "";
    } catch (error) {
      state.compositor.sourceAsset = oldMeta;
      sourcePreviewUrl = oldUrl;
      if (oldUrl) {
        const titleRecord = state.compositor.titleAsset ? await posterAssetStore.get(state.compositor.titleAsset.id).catch(() => null) : null;
        await activateCompositorSource(oldMeta, oldUrl, titleRecord, titlePreviewUrl).catch(() => {});
      }
      elements.sourceStatus.textContent = "海报移除失败，已恢复原画面";
    } finally {
      compositorBusy = false;
      render();
    }
  }

  async function replaceTitleAsset(file) {
    const oldMeta = state.compositor.titleAsset;
    const oldUrl = titlePreviewUrl;
    let candidate = null;
    let candidateUrl = "";
    compositorBusy = true;
    renderCompositorControls();
    try {
      const inspection = await posterAssetStore.inspectPosterImage(file, "title");
      candidate = await posterAssetStore.put(file, { kind: "title", name: file.name, ...inspection });
      candidateUrl = root.URL.createObjectURL(file);
      state.compositor.titleAsset = candidate;
      titlePreviewUrl = candidateUrl;
      if (compositor) await compositor.setTitleAsset({ url: candidateUrl, width: candidate.width, height: candidate.height });
      await persistCompositorNow();
      if (oldMeta?.id && oldMeta.id !== candidate.id) await posterAssetStore.remove(oldMeta.id);
      if (oldUrl && oldUrl !== candidateUrl) root.URL.revokeObjectURL(oldUrl);
      if (!candidate.transparent) elements.layerStatus.textContent = "提示：该 PNG 没有检测到透明区域";
    } catch (error) {
      if (candidate?.id) await posterAssetStore.remove(candidate.id).catch(() => {});
      if (candidateUrl) root.URL.revokeObjectURL(candidateUrl);
      state.compositor.titleAsset = oldMeta;
      titlePreviewUrl = oldUrl;
      if (compositor && oldMeta && oldUrl) await compositor.setTitleAsset({ url: oldUrl, width: oldMeta.width, height: oldMeta.height }).catch(() => {});
      elements.layerStatus.textContent = error.message || "透明字标载入失败";
    } finally {
      compositorBusy = false;
      renderCompositorControls();
    }
  }

  async function removeTitleAsset() {
    const oldMeta = state.compositor.titleAsset;
    const oldUrl = titlePreviewUrl;
    if (!oldMeta) return;
    compositorBusy = true;
    state.compositor.titleAsset = null;
    compositor?.removeTitleAsset();
    try {
      await persistCompositorNow();
      await posterAssetStore.remove(oldMeta.id);
      if (oldUrl) root.URL.revokeObjectURL(oldUrl);
      titlePreviewUrl = "";
    } catch (error) {
      state.compositor.titleAsset = oldMeta;
      titlePreviewUrl = oldUrl;
      if (compositor && oldUrl) await compositor.setTitleAsset({ url: oldUrl, width: oldMeta.width, height: oldMeta.height }).catch(() => {});
      elements.layerStatus.textContent = "字标删除失败，已恢复原图层";
    } finally {
      compositorBusy = false;
      renderCompositorControls();
    }
  }

  function selectTemplate(templateId) {
    const template = currentTemplates().find((item) => item.id === templateId);
    if (!template) return;
    state.selectedTemplate = template.id;
    elements.composition.value = template.compositionKey;
    state.copied = false;
    render();
  }

  function selectTitleTemplate(templateId) {
    const template = getTitleTemplate(templateId);
    if (!template) return;
    state.titleTemplate = template.id;
    state.titleMaterial = template.materialOptions[0];
    elements.font.value = template.fontKey;
    const compositorState = currentCompositorState();
    const selectedLayer = compositorState.layers[compositorState.selectedLayer];
    if (compositor && compositorState.sourceAsset && selectedLayer?.kind === "text") {
      applyTypographyToLayer(compositorState.selectedLayer, template.fontKey);
    } else {
      applyCompositorTypography(template.fontKey);
    }
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  }

  function selectTitleMarkTemplate(templateId) {
    const template = getTitleMarkTemplate(templateId);
    if (!template) return;
    state.titleMarkTemplate = template.id;
    state.titleMarkSkeleton = template.skeleton;
    state.titleMarkMethods = template.methods.slice(-3);
    state.titleMarkMaterial = template.material;
    state.titleMarkLighting = template.lighting;
    state.titleMarkBackground = template.background;
    state.titleMarkMetaphor = "";
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  }

  function toggleTitleMarkMethod(id) {
    if (!TITLE_MARK_METHODS[id]) return;
    const next = state.titleMarkMethods.includes(id)
      ? state.titleMarkMethods.filter((item) => item !== id)
      : [...state.titleMarkMethods, id].slice(-3);
    state.titleMarkMethods = next.length ? next : [id];
  }

  function changeLayoutByKeyboard(side, key, largeStep) {
    const step = largeStep ? 24 : 8;
    const direction = key === "ArrowLeft" ? -1 : 1;
    if (side === "left") state.layout.leftWidth += direction * step;
    if (side === "right") state.layout.rightWidth -= direction * step;
    applyLayout();
    notifyWorkspaceDirty();
  }

  function bindColumnResizers() {
    elements.resizers.forEach((resizer) => {
      const side = resizer.dataset.posterResizer;
      resizer.addEventListener("pointerdown", (event) => {
        if (root.innerWidth <= 1180) return;
        const startX = event.clientX;
        const startLayout = { ...state.layout };
        resizer.classList.add("dragging");
        resizer.setPointerCapture(event.pointerId);

        const move = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          if (side === "left") state.layout.leftWidth = startLayout.leftWidth + delta;
          if (side === "right") state.layout.rightWidth = startLayout.rightWidth - delta;
          applyLayout();
        };

        const finish = (finishEvent) => {
          resizer.classList.remove("dragging");
          if (resizer.hasPointerCapture(finishEvent.pointerId)) resizer.releasePointerCapture(finishEvent.pointerId);
          resizer.removeEventListener("pointermove", move);
          resizer.removeEventListener("pointerup", finish);
          resizer.removeEventListener("pointercancel", finish);
          notifyWorkspaceDirty();
        };

        resizer.addEventListener("pointermove", move);
        resizer.addEventListener("pointerup", finish);
        resizer.addEventListener("pointercancel", finish);
      });

      resizer.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        changeLayoutByKeyboard(side, event.key, event.shiftKey);
      });

      resizer.addEventListener("dblclick", () => {
        state.layout = { ...DEFAULT_LAYOUT };
        applyLayout();
        notifyWorkspaceDirty();
      });
    });
  }

  function clearFields() {
    const resetTitleMark = normalizePosterTitleMarkState({});
    elements.purpose.value = "film";
    elements.ratio.value = "2:3";
    elements.genre.value = "drama";
    elements.lighting.value = "genre";
    elements.colorGrade.value = "genre";
    elements.subject.value = "";
    elements.environment.value = "";
    elements.look.value = "";
    elements.reference.value = "character";
    state.sourceMode = "reference";
    state.purposeGroup = "film";
    state.selectedTemplate = "film-portrait-close";
    state.titleLibraryView = "composition";
    state.titleCategory = "all";
    state.titleLanguage = "bilingual";
    state.titleTemplate = DEFAULT_TITLE_TEMPLATE_ID;
    state.englishTitle = "";
    state.titleMaterial = getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID).materialOptions[0];
    Object.assign(state, resetTitleMark);
    elements.focus.value = "face";
    elements.textMode.value = "reserved";
    elements.font.value = "serif";
    elements.titlePosition.value = "bottom";
    elements.textColor.value = "white";
    elements.title.value = "";
    elements.englishTitle.value = "";
    elements.tagline.value = "";
    elements.credits.value = "";
    state.copied = false;
    render();
  }

  function loadExample() {
    elements.purpose.value = "film";
    elements.ratio.value = "2:3";
    elements.genre.value = "suspense";
    elements.lighting.value = "rembrandt";
    elements.colorGrade.value = "warmcool";
    elements.subject.value = "引用已上传女调查员角色参考图；她穿深灰风衣站在被海雾吞没的旧码头，手里握着一只红色儿童救生圈，克制地回头看向镜头";
    elements.environment.value = "1990年代北方港口冬夜，铁锈栈桥、巨大失事客轮暗影、冷白探照灯、浓雾和湿地反光";
    elements.reference.value = "character";
    state.sourceMode = "reference";
    state.purposeGroup = "film";
    state.selectedTemplate = "film-portrait-close";
    state.titleLibraryView = "title-mark";
    state.titleCategory = "crime";
    state.titleLanguage = "bilingual";
    state.titleTemplate = "cn-condensed-crime";
    state.titleMaterial = "flat";
    state.titleMarkCategory = "eastern";
    state.titleMarkTemplate = "eastern-cold-serif";
    state.titleMarkMethods = ["shared-stroke", "long-stroke", "cut"];
    state.titleMarkSkeleton = "serif";
    state.titleMarkMaterial = "gold";
    state.titleMarkLighting = "edge";
    state.titleMarkBackground = "black";
    state.titleMarkOutputMode = "asset";
    state.titleMarkMetaphor = "码头地平线";
    elements.focus.value = "face";
    elements.textMode.value = "reserved";
    elements.font.value = "song";
    elements.titlePosition.value = "bottom";
    elements.textColor.value = "white";
    elements.title.value = "迷雾码头";
    elements.englishTitle.value = "THE SILENT HARBOR";
    state.englishTitle = "THE SILENT HARBOR";
    elements.tagline.value = "真相沉在雾里，所有人都在岸上说谎";
    elements.credits.value = "主演姓名 / 导演姓名 / 冬季上映";
    render();
    elements.composition.value = "portrait-close";
    render();
    applyOutputRatio();
  }

  elements.purpose.addEventListener("change", () => {
    const purpose = purposeProfiles[elements.purpose.value];
    state.purposeGroup = purposeGroupForValue(elements.purpose.value);
    state.selectedTemplate = "";
    elements.ratio.value = purpose.ratio;
    if (elements.purpose.value === "product") {
      elements.genre.value = "commercial";
      elements.reference.value = "product";
      elements.focus.value = "product";
      state.sourceMode = "reference";
    }
    state.copied = false;
    applyOutputRatio();
    render();
  });

  elements.purposeGroupButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.posterPurposeGroup;
      const profile = templateData.purposes[group];
      if (!profile) return;
      state.purposeGroup = group;
      state.selectedTemplate = "";
      elements.purpose.value = profile.canonicalPurpose;
      elements.ratio.value = profile.defaultRatio;
      if (group === "product") {
        elements.genre.value = "commercial";
        elements.reference.value = "product";
        elements.focus.value = "product";
      }
      state.copied = false;
      applyOutputRatio();
      render();
    });
  });

  elements.ratioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.ratio.value = button.dataset.posterRatio;
      state.copied = false;
      applyOutputRatio();
      render();
    });
  });

  elements.templateList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-poster-template-id]");
    if (card) selectTemplate(card.dataset.posterTemplateId);
  });

  elements.templateList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-poster-template-id]");
    if (!card) return;
    event.preventDefault();
    selectTemplate(card.dataset.posterTemplateId);
  });

  elements.libraryViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.posterLibraryView;
      state.titleLibraryView = ["composition", "title", "title-mark"].includes(view) ? view : "composition";
      state.copied = false;
      render();
      notifyWorkspaceDirty();
    });
  });

  elements.titleCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.posterTitleCategory;
      state.titleCategory = TITLE_CATEGORIES[category] ? category : "all";
      render();
      notifyWorkspaceDirty();
    });
  });

  elements.titleLanguageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const language = button.dataset.posterTitleLanguage;
      state.titleLanguage = TITLE_LANGUAGE_MODES[language] ? language : "bilingual";
      elements.titleLanguage.value = state.titleLanguage;
      render();
      notifyWorkspaceDirty();
    });
  });

  elements.titleTemplateList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-poster-title-template-id]");
    if (card) selectTitleTemplate(card.dataset.posterTitleTemplateId);
  });

  elements.titleTemplateList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-poster-title-template-id]");
    if (!card) return;
    event.preventDefault();
    selectTitleTemplate(card.dataset.posterTitleTemplateId);
  });

  elements.titleMarkCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.posterTitleMarkCategory;
      state.titleMarkCategory = TITLE_MARK_CATEGORIES[category] ? category : "all";
      state.copied = false;
      render();
      notifyWorkspaceDirty();
    });
  });

  elements.titleMarkTemplateList.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-poster-title-mark-favorite-id]");
    if (favoriteButton) {
      event.stopPropagation();
      const id = favoriteButton.dataset.posterTitleMarkFavoriteId;
      state.titleMarkFavorites = state.titleMarkFavorites.includes(id)
        ? state.titleMarkFavorites.filter((favoriteId) => favoriteId !== id)
        : [...state.titleMarkFavorites, id];
      render();
      notifyWorkspaceDirty();
      return;
    }
    const card = event.target.closest("[data-poster-title-mark-template-id]");
    if (card) selectTitleMarkTemplate(card.dataset.posterTitleMarkTemplateId);
  });

  elements.titleMarkTemplateList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("[data-poster-title-mark-favorite-id]")) return;
    const card = event.target.closest("[data-poster-title-mark-template-id]");
    if (!card) return;
    event.preventDefault();
    selectTitleMarkTemplate(card.dataset.posterTitleMarkTemplateId);
  });

  elements.titleMarkQuery.addEventListener("input", () => {
    state.titleMarkQuery = elements.titleMarkQuery.value.trimStart().slice(0, 80);
    render();
    notifyWorkspaceDirty();
  });

  elements.titleMarkClearQuery.addEventListener("click", () => {
    state.titleMarkQuery = "";
    render();
    elements.titleMarkQuery.focus();
    notifyWorkspaceDirty();
  });

  elements.titleMarkFavoritesOnly.addEventListener("click", () => {
    state.titleMarkFavoritesOnly = !state.titleMarkFavoritesOnly;
    render();
    notifyWorkspaceDirty();
  });

  elements.titleMarkMethods.addEventListener("click", (event) => {
    const button = event.target.closest("[data-poster-title-mark-method]");
    if (!button) return;
    toggleTitleMarkMethod(button.dataset.posterTitleMarkMethod);
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  });

  elements.titleLanguage.addEventListener("change", () => {
    state.titleLanguage = TITLE_LANGUAGE_MODES[elements.titleLanguage.value] ? elements.titleLanguage.value : "bilingual";
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  });

  elements.englishTitle.addEventListener("input", () => {
    state.englishTitle = elements.englishTitle.value;
    state.copied = false;
    render();
  });

  elements.titleMaterial.addEventListener("change", () => {
    const template = currentTitleTemplate();
    state.titleMaterial = template.materialOptions.includes(elements.titleMaterial.value)
      ? elements.titleMaterial.value
      : template.materialOptions[0];
    render();
    notifyWorkspaceDirty();
  });

  elements.titleMarkCategory.addEventListener("change", () => {
    state.titleMarkCategory = TITLE_MARK_CATEGORIES[elements.titleMarkCategory.value] ? elements.titleMarkCategory.value : "all";
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  });

  [
    [elements.titleMarkSkeleton, "titleMarkSkeleton", TITLE_MARK_SKELETONS],
    [elements.titleMarkMaterial, "titleMarkMaterial", TITLE_MARK_MATERIALS],
    [elements.titleMarkLighting, "titleMarkLighting", TITLE_MARK_LIGHTING],
    [elements.titleMarkBackground, "titleMarkBackground", TITLE_MARK_BACKGROUNDS],
    [elements.titleMarkOutputMode, "titleMarkOutputMode", TITLE_MARK_OUTPUT_MODES]
  ].forEach(([element, stateKey, dictionary]) => {
    element.addEventListener("change", () => {
      if (dictionary[element.value]) state[stateKey] = element.value;
      state.copied = false;
      render();
      notifyWorkspaceDirty();
    });
  });

  elements.titleMarkMetaphor.addEventListener("input", () => {
    state.titleMarkMetaphor = elements.titleMarkMetaphor.value;
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  });

  elements.sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sourceMode = button.dataset.posterSource;
      state.copied = false;
      render();
    });
  });

  [elements.genre, elements.tone, elements.lighting, elements.colorGrade, elements.subject, elements.environment, elements.look, elements.reference, elements.focus, elements.textMode, elements.titlePosition, elements.textColor, elements.title, elements.tagline, elements.credits].forEach((element) => {
    element.addEventListener("input", () => { state.copied = false; render(); });
    element.addEventListener("change", () => { state.copied = false; render(); });
  });

  elements.ratio.addEventListener("change", () => {
    state.copied = false;
    applyOutputRatio();
    render();
    notifyWorkspaceDirty();
  });

  elements.font.addEventListener("change", () => {
    applyCompositorTypography(elements.font.value);
    state.copied = false;
    render();
    notifyWorkspaceDirty();
  });

  elements.composition.addEventListener("change", () => {
    const template = currentTemplates().find((item) => item.compositionKey === elements.composition.value);
    if (template) state.selectedTemplate = template.id;
    state.copied = false;
    render();
  });

  elements.sourceReplace.addEventListener("click", () => elements.sourceUpload.click());
  elements.sourceRemove.addEventListener("click", removeSourceAsset);
  elements.sourceUpload.addEventListener("change", async () => {
    const file = elements.sourceUpload.files?.[0];
    elements.sourceUpload.value = "";
    if (file) await replaceSourceFile(file);
  });
  elements.titleAssetUploadButton.addEventListener("click", () => elements.titleAssetUpload.click());
  elements.titleAssetUpload.addEventListener("change", async () => {
    const file = elements.titleAssetUpload.files?.[0];
    elements.titleAssetUpload.value = "";
    if (file) await replaceTitleAsset(file);
  });
  elements.titleAssetRemove.addEventListener("click", removeTitleAsset);

  elements.layerList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-poster-layer]");
    if (button) {
      compositor?.finishTextEditing();
      state.compositor.selectedLayer = button.dataset.posterLayer;
      compositor?.selectLayer(button.dataset.posterLayer);
      renderCompositorControls();
      notifyWorkspaceDirty();
    }
  });
  elements.layerList.addEventListener("keydown", (event) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    const button = event.target.closest("[data-poster-layer]");
    if (!button || !/^text-/.test(button.dataset.posterLayer || "")) return;
    event.preventDefault();
    const removed = compositor?.removeLayer(button.dataset.posterLayer);
    if (!removed) return;
    renderCompositorControls();
    elements.layerList.querySelector("[aria-selected='true']")?.focus({ preventScroll: true });
    notifyWorkspaceDirty();
  });
  elements.canvasLayerButtons.forEach((button) => button.addEventListener("click", () => {
    compositor?.finishTextEditing();
    const id = button.dataset.posterCanvasLayer;
    state.compositor.selectedLayer = id;
    compositor?.selectLayer(id);
    renderCompositorControls();
    notifyWorkspaceDirty();
  }));
  elements.addText.addEventListener("click", () => {
    const createdId = compositor?.addText(elements.addTextRole.value);
    if (createdId) {
      state.compositor.selectedLayer = createdId;
      compositor?.selectLayer(createdId);
    }
    renderCompositorControls();
    notifyWorkspaceDirty();
  });
  elements.layerEditText.addEventListener("click", () => {
    compositor?.enterTextEditing(currentCompositorState().selectedLayer);
    renderCompositorControls();
  });
  elements.layerLineBreak.addEventListener("click", () => {
    const textarea = elements.layerText;
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : start;
    const nextText = `${textarea.value.slice(0, start)}\n${textarea.value.slice(end)}`;
    textarea.value = nextText;
    compositor?.setLayerText(currentCompositorState().selectedLayer, nextText);
    renderCompositorControls();
    textarea.focus({ preventScroll: false });
    textarea.setSelectionRange(start + 1, start + 1);
  });
  elements.layerText.addEventListener("input", () => {
    compositor?.setLayerText(currentCompositorState().selectedLayer, elements.layerText.value);
  });
  elements.layerDuplicate.addEventListener("click", () => {
    compositor?.duplicateLayer(currentCompositorState().selectedLayer);
    renderCompositorControls();
    notifyWorkspaceDirty();
  });
  elements.layerDelete.addEventListener("click", () => {
    const id = currentCompositorState().selectedLayer;
    const removed = compositor?.removeLayer(id);
    if (!removed) elements.layerStatus.textContent = "中文片名、英文副标请使用隐藏；新增文字层可以删除";
    renderCompositorControls();
    notifyWorkspaceDirty();
  });
  elements.layerVisible.addEventListener("click", () => {
    const compositorState = currentCompositorState();
    const id = compositorState.selectedLayer;
    compositor?.setLayerVisible(id, !compositorState.layers[id].visible);
    renderCompositorControls();
  });
  elements.layerLocked.addEventListener("click", () => {
    const compositorState = currentCompositorState();
    const id = compositorState.selectedLayer;
    compositor?.setLayerLocked(id, !compositorState.layers[id].locked);
    renderCompositorControls();
  });
  elements.layerReset.addEventListener("click", () => {
    compositor?.resetLayer(currentCompositorState().selectedLayer);
    renderCompositorControls();
  });

  function nudgeSelectedLayer(direction) {
    const deltas = { left: [-0.01, 0], right: [0.01, 0], up: [0, -0.01], down: [0, 0.01] };
    const delta = deltas[direction];
    const compositorState = currentCompositorState();
    const layer = compositorState.layers[compositorState.selectedLayer];
    if (!delta || !layer || layer.locked || layer.visible === false) return;
    compositor?.updateLayer(compositorState.selectedLayer, {
      x: clamp(layer.x + delta[0], 0, 1),
      y: clamp(layer.y + delta[1], 0, 1)
    });
    renderCompositorControls();
  }

  elements.layerNudgeButtons.forEach((button) => {
    button.addEventListener("click", () => nudgeSelectedLayer(button.dataset.posterLayerNudge));
  });

  function updateSelectedLayer(patch) {
    const id = currentCompositorState().selectedLayer;
    compositor?.updateLayer(id, patch);
    renderCompositorControls();
  }
  elements.layerSize.addEventListener("input", () => updateSelectedLayer({ widthRatio: Number(elements.layerSize.value) / 100 }));
  elements.layerFontStyle.addEventListener("change", () => {
    applyTypographyToLayer(currentCompositorState().selectedLayer, elements.layerFontStyle.value);
    render();
    notifyWorkspaceDirty();
  });
  elements.layerColor.addEventListener("input", () => updateSelectedLayer({ color: elements.layerColor.value }));
  elements.layerLetterSpacing.addEventListener("input", () => updateSelectedLayer({ letterSpacing: Number(elements.layerLetterSpacing.value) }));
  elements.layerLineHeight.addEventListener("input", () => updateSelectedLayer({ lineHeight: Number(elements.layerLineHeight.value) / 100 }));
  elements.layerAlign.addEventListener("change", () => updateSelectedLayer({ align: elements.layerAlign.value }));
  elements.layerRotation.addEventListener("change", () => updateSelectedLayer({ rotation: Number(elements.layerRotation.value) }));
  elements.layerOpacity.addEventListener("input", () => updateSelectedLayer({ opacity: Number(elements.layerOpacity.value) / 100 }));
  elements.positionButtons.forEach((button) => button.addEventListener("click", () => {
    compositor?.moveLayerToPreset(currentCompositorState().selectedLayer, button.dataset.posterPosition);
    renderCompositorControls();
  }));

  elements.guidesToggle.addEventListener("click", () => {
    state.compositor.guidesVisible = !state.compositor.guidesVisible;
    renderCompositorControls();
    notifyWorkspaceDirty();
  });
  elements.viewFit.addEventListener("click", () => { previewMode = "fit"; compositor?.setPreviewScale("fit"); });
  elements.view100.addEventListener("click", () => { previewMode = "100"; compositor?.setPreviewScale("100"); });
  elements.undo.addEventListener("click", () => { compositor?.undo(); renderCompositorControls(); });
  elements.redo.addEventListener("click", () => { compositor?.redo(); renderCompositorControls(); });
  elements.exportFormat.addEventListener("change", () => {
    state.compositor.exportFormat = elements.exportFormat.value === "jpg" ? "jpg" : "png";
    lastExportSummary = "";
    renderCompositorControls();
    notifyWorkspaceDirty();
  });
  elements.download.addEventListener("click", async () => {
    if (!compositor || !state.compositor.sourceAsset || compositorBusy) return;
    compositorBusy = true;
    renderCompositorControls();
    try {
      const format = state.compositor.exportFormat;
      const blob = await compositor.exportBlob({ format, quality: 0.92 });
      const url = root.URL.createObjectURL(blob);
      const outputSize = compositor.getSourceSize();
      const projectName = document.querySelector("#project-name-input")?.value || "项目";
      const filename = safePosterExportName([projectName, elements.title.value || "片名", `${outputSize.width}x${outputSize.height}`, "v001"], format);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => root.URL.revokeObjectURL(url), 0);
      lastExportSummary = `${filename} · ${(blob.size / 1024 / 1024).toFixed(1)} MB`;
    } catch (error) {
      lastExportSummary = error.message || "海报导出失败";
    } finally {
      compositorBusy = false;
      renderCompositorControls();
    }
  });

  elements.example.addEventListener("click", loadExample);
  elements.clear.addEventListener("click", clearFields);
  elements.copy.addEventListener("click", async () => {
    elements.output.focus();
    elements.output.select();
    try { await navigator.clipboard.writeText(activePosterPrompt()); } catch (error) { document.execCommand("copy"); }
    state.copied = true;
    render();
    setTimeout(() => { state.copied = false; render(); }, 1200);
  });

  root.aigcPosterWorkbench = {
    selectTemplate(templateId) {
      selectTemplate(templateId);
    },
    exportState() {
      return {
        sourceMode: state.sourceMode,
        purposeGroup: state.purposeGroup,
        selectedTemplate: state.selectedTemplate,
        titleLibraryView: state.titleLibraryView,
        titleCategory: state.titleCategory,
        titleLanguage: state.titleLanguage,
        titleTemplate: state.titleTemplate,
        englishTitle: elements.englishTitle.value,
        titleMaterial: elements.titleMaterial.value,
        titleMarkCategory: state.titleMarkCategory,
        titleMarkTemplate: state.titleMarkTemplate,
        titleMarkMethods: [...state.titleMarkMethods],
        titleMarkSkeleton: state.titleMarkSkeleton,
        titleMarkMaterial: state.titleMarkMaterial,
        titleMarkLighting: state.titleMarkLighting,
        titleMarkBackground: state.titleMarkBackground,
        titleMarkOutputMode: state.titleMarkOutputMode,
        titleMarkMetaphor: elements.titleMarkMetaphor.value,
        titleMarkQuery: state.titleMarkQuery,
        titleMarkFavorites: [...state.titleMarkFavorites],
        titleMarkFavoritesOnly: state.titleMarkFavoritesOnly,
        posterCompositor: currentCompositorState(),
        layout: { ...state.layout },
        purpose: elements.purpose.value,
        ratio: elements.ratio.value,
        genre: elements.genre.value,
        tone: elements.tone.value,
        lighting: elements.lighting.value,
        colorGrade: elements.colorGrade.value,
        composition: elements.composition.value,
        subject: elements.subject.value,
        environment: elements.environment.value,
        look: elements.look.value,
        reference: elements.reference.value,
        focus: elements.focus.value,
        textMode: elements.textMode.value,
        font: elements.font.value,
        titlePosition: elements.titlePosition.value,
        textColor: elements.textColor.value,
        title: elements.title.value,
        tagline: elements.tagline.value,
        credits: elements.credits.value
      };
    },
    importState(saved = {}) {
      const legacyTitleTemplates = {
        serif: "en-editorial-serif", condensed: "cn-condensed-crime", bold: "cn-bold-commercial",
        song: "cn-modern-song", calligraphy: "cn-brush-myth", handwritten: "cn-handwritten-life",
        geometric: "en-wide-scifi", horror: "en-gothic-horror", playful: "cn-playful-animation"
      };
      const normalizedTitle = normalizePosterTitleState({
        ...saved,
        titleTemplate: saved.titleTemplate || legacyTitleTemplates[saved.font]
      });
      const normalizedTitleMark = normalizePosterTitleMarkState(saved);
      const fallbackFontStyle = COMPOSITOR_FONT_PRESETS[saved.font]
        ? saved.font
        : (getTitleTemplate(normalizedTitle.titleTemplate)?.fontKey || "serif");
      state.compositor = normalizePosterCompositorState(migratePosterLayerFontStyles(saved.posterCompositor, fallbackFontStyle));
      state.titleLibraryView = saved.titleLibraryView === "title-mark" ? "title-mark" : normalizedTitle.titleLibraryView;
      state.titleCategory = normalizedTitle.titleCategory;
      state.titleLanguage = normalizedTitle.titleLanguage;
      state.titleTemplate = normalizedTitle.titleTemplate;
      state.englishTitle = normalizedTitle.englishTitle;
      state.titleMaterial = normalizedTitle.titleMaterial;
      Object.assign(state, normalizedTitleMark);
      elements.englishTitle.value = normalizedTitle.englishTitle;
      elements.titleMarkMetaphor.value = normalizedTitleMark.titleMarkMetaphor;
      state.sourceMode = saved.sourceMode === "text" ? "text" : "reference";
      state.purposeGroup = templateData.purposes[saved.purposeGroup]
        ? saved.purposeGroup
        : purposeGroupForValue(saved.purpose || "film");
      const savedTemplate = templateData.templates.find((template) => template.id === saved.selectedTemplate)
        || templateData.templates.find((template) => template.compositionKey === saved.composition && template.purposeGroups.includes(state.purposeGroup));
      state.selectedTemplate = savedTemplate ? savedTemplate.id : "";
      if (saved.layout) {
        state.layout = {
          leftWidth: Number(saved.layout.leftWidth) || DEFAULT_LAYOUT.leftWidth,
          rightWidth: Number(saved.layout.rightWidth) || DEFAULT_LAYOUT.rightWidth
        };
      } else {
        state.layout = { ...DEFAULT_LAYOUT };
      }
      ["purpose", "ratio", "genre", "lighting", "colorGrade", "subject", "environment", "look", "reference", "focus", "textMode", "font", "titlePosition", "textColor", "title", "tagline", "credits"].forEach((key) => {
        if (saved[key] !== undefined && elements[key]) elements[key].value = saved[key];
      });
      render();
      if (saved.tone) elements.tone.value = saved.tone;
      if (saved.composition) elements.composition.value = saved.composition;
      render();
      applyLayout();
      restoreCompositorAssets();
    },
    receiveTone(prompt) {
      elements.look.value = prompt || "";
      state.copied = false;
      render();
    },
    receiveCharacter(summary) {
      elements.subject.value = summary || "";
      elements.reference.value = "character";
      state.sourceMode = "reference";
      state.copied = false;
      render();
    },
    receiveProjectContext(context) {
      const prompt = String(context?.prompt || "").trim();
      if (!prompt) return false;
      if (!elements.look.value.includes(prompt)) {
        elements.look.value = [elements.look.value.trim(), prompt].filter(Boolean).join("\n");
      }
      state.copied = false;
      render();
      document.dispatchEvent(new Event("aigc:workspace-dirty"));
      return true;
    }
  };

  bindColumnResizers();
  root.addEventListener("resize", () => {
    applyLayout();
    if (previewMode === "fit") compositor?.resizePreview();
  });
  root.addEventListener("beforeunload", () => {
    compositor?.destroy();
    releasePreviewUrl("source");
    releasePreviewUrl("title");
  });
  applyLayout();
  render();
})(typeof window !== "undefined" ? window : globalThis);
