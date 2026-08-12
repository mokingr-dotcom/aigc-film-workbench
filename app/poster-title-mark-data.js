(function initPosterTitleMarkData(root) {
  const TITLE_MARK_CATEGORIES = {
    eastern: "东方书法",
    commercial: "现代商业",
    crime: "悬疑犯罪",
    scifi: "科幻未来",
    retro: "年代复古",
    epic: "战争史诗",
    literary: "文艺手写",
    romance: "爱情青春",
    comedy: "喜剧活力",
    horror: "恐怖惊悚",
    fantasy: "奇幻动画",
    minimal: "极简概念"
  };

  const TITLE_MARK_SKELETONS = {
    serif: { label: "创意衬线", rule: "以可读中文衬线骨架重新设计字面，横竖粗细关系明确，关键笔画完整" },
    sans: { label: "粗黑", rule: "使用稳定粗黑骨架，字腔开放，缩小后仍清楚，不依赖描边维持识别" },
    handwritten: { label: "手写", rule: "保留真实书写方向、笔压、连笔和停顿，字形自然但不潦草" },
    stone: { label: "碑刻", rule: "使用低重心碑刻骨架和清楚刀刻转折，结构方峻而不僵硬" },
    geometric: { label: "几何", rule: "使用精确几何结构和受控切角，比例统一，不做随机断笔" }
  };

  const TITLE_MARK_METHODS = {
    "shared-stroke": { label: "笔画共用", rule: "只让相邻汉字共用一处非关键笔画，共用关系清楚且不产生错字" },
    "long-stroke": { label: "长线穿插", rule: "延展一处横画或收笔形成统一视觉动线，长线不遮挡关键字形" },
    cut: { label: "局部断笔", rule: "仅在不影响识别的位置加入逻辑断笔，所有断口方向保持统一" },
    "negative-space": { label: "负形嵌图", rule: "把一个剧情意象嵌入字腔或留白，图形只出现一次并服从可读性" },
    ligature: { label: "连笔拖尾", rule: "用一处自然连笔或拖尾连接文字节奏，避免每个字都出现装饰尾巴" },
    offset: { label: "错位切割", rule: "局部错位必须服从统一轴线并保持完整字形，不制造乱码式破碎" }
  };

  const TITLE_MARK_MATERIALS = {
    flat: { label: "平面墨色", rule: "干净平面色，边缘清楚，无立体挤压，只靠字形与明暗建立层级" },
    ink: { label: "墨迹飞白", rule: "真实墨迹与少量飞白集中在次要笔画，主体结构保持完整" },
    stone: { label: "石刻拓印", rule: "低反差石刻、拓印和风化颗粒，破损不吞掉关键笔画" },
    metal: { label: "哑光金属", rule: "低反光银灰或冷铁金属，细窄高光，暗部保留字形" },
    gold: { label: "暗金蚀刻", rule: "低亮度暗金箔或蚀刻表面，磨损克制，不使用廉价黄金渐变" },
    print: { label: "旧印刷", rule: "轻微套印偏差、油墨浓淡和纸纤维，仍保持专业电影印刷完成度" },
    lacquer: { label: "漆色套印", rule: "使用两种以内的高纯度漆色或复古套印色块，边界清楚" },
    glow: { label: "微光字缘", rule: "只在字缘加入极窄光线，光晕不超过笔画宽度，不做霓虹灯牌" },
    organic: { label: "生物纹理", rule: "植物、鳞片或矿物纹理只融入少量局部，轮廓仍清楚可读" }
  };

  const TITLE_MARK_LIGHTING = {
    flat: { label: "平面无高光", rule: "字标采用均匀平面受光，不出现立体投影和环境反射" },
    edge: { label: "窄边逆光", rule: "字缘使用极窄轮廓光，方向与目标海报主光一致，光晕克制" },
    side: { label: "侧向擦光", rule: "低角度侧光掠过字面纹理，高光细窄，暗面不死黑" },
    top: { label: "顶部雕刻光", rule: "柔和顶侧光强调浅浮雕和刻痕，投影距离短且方向统一" },
    neon: { label: "潮湿霓虹反射", rule: "只使用两种以内低饱和有色光，保留中性字面，不让光色淹没笔画" },
    starlight: { label: "星点微光", rule: "少量星点高光附着在笔画节点，主体文字保持稳定明度" }
  };

  const TITLE_MARK_BACKGROUNDS = {
    black: { label: "黑色纯底", rule: "黑色纯净背景，与字标清楚分离" },
    white: { label: "白色纯底", rule: "白色纯净背景，保留自然边缘与细节" },
    neutral: { label: "中性纯色底", rule: "使用与字标形成明确反差的单一中性纯色背景" },
    transparent: { label: "透明背景", rule: "透明背景或可无损抠取的纯净隔离背景，边缘无杂色污染" }
  };

  const TITLE_MARK_OUTPUT_MODES = {
    asset: { label: "独立字标资产", rule: "只生成字标资产，不出现人物、场景或完整海报" },
    composite: { label: "海报合成描述", rule: "补充字标在海报中的尺寸、位置、安全区和主光关系" }
  };

  const TITLE_MARK_TEMPLATES = [
    {
      id: "eastern-cold-serif", label: "东方冷峻衬线", category: "eastern", sampleTitle: "迷雾码头", sampleEnglish: "MIST HARBOR",
      genreHints: ["悬疑", "东方都市", "剧情"], skeleton: "serif", methods: ["shared-stroke", "long-stroke", "cut"],
      metaphorRule: "将一条细长横画处理为雾中码头地平线，只出现一次", material: "gold", lighting: "edge",
      hierarchyRule: "英文副标为中文高度的18%至22%，宽字距并与中文基线对齐", background: "black",
      promptRule: "字面重心低稳，衬线锐利但不过度古典，以一条贯穿长线统一整个片名", negativeRule: "不要仙侠游戏字标，不要满版金色，不要把所有横画都延长", previewClass: "title-mark-eastern-cold"
    },
    {
      id: "eastern-cursive", label: "行草叙事字标", category: "eastern", sampleTitle: "长夜将明", sampleEnglish: "DAWN AFTER NIGHT",
      genreHints: ["武侠", "历史", "人物传记"], skeleton: "handwritten", methods: ["ligature", "long-stroke"],
      metaphorRule: "让最后一笔形成由暗到明的叙事方向，不加入第二个图形", material: "ink", lighting: "flat",
      hierarchyRule: "中文书写为唯一视觉主体，英文缩小至16%至20%并保持中性", background: "white",
      promptRule: "书写方向明确，起收笔自然，飞白集中在一处长笔画，整体仍像专业电影字标", negativeRule: "不要不可辨认狂草，不要廉价毛笔滤镜，不要每个字不同斜率", previewClass: "title-mark-eastern-cursive"
    },
    {
      id: "eastern-stone-epic", label: "碑刻史诗字标", category: "epic", sampleTitle: "山河故人", sampleEnglish: "THE LAND REMEMBERS",
      genreHints: ["历史", "史诗", "战争"], skeleton: "stone", methods: ["shared-stroke", "negative-space"],
      metaphorRule: "在一个字腔中嵌入远山负形，轮廓简洁且不影响识别", material: "stone", lighting: "top",
      hierarchyRule: "中文形成纪念碑式主块，英文作为底部横向基座，占中文高度约18%", background: "black",
      promptRule: "刀刻转折方峻，低位重心建立历史重量，风化只存在于表面", negativeRule: "不要厚重游戏Logo，不要火焰包字，不要严重崩裂", previewClass: "title-mark-eastern-stone"
    },
    {
      id: "eastern-seal-symbol", label: "篆隶符号字标", category: "eastern", sampleTitle: "无名之印", sampleEnglish: "THE NAMELESS SEAL",
      genreHints: ["历史", "谍战", "东方奇案"], skeleton: "stone", methods: ["negative-space", "shared-stroke"],
      metaphorRule: "以单一方印轮廓组织字标负形，不额外添加印章文字", material: "lacquer", lighting: "flat",
      hierarchyRule: "中文可组成方形符号，英文沿下边缘平直排列并保持小尺寸", background: "neutral",
      promptRule: "篆隶结构经过现代化简化，方圆关系清楚，既有东方符号感又能快速阅读", negativeRule: "不要伪造官印，不要生僻篆字替换片名，不要红色印章堆叠", previewClass: "title-mark-eastern-seal"
    },
    {
      id: "crime-cut-sans", label: "悬疑切割黑体", category: "crime", sampleTitle: "无声证词", sampleEnglish: "SILENT EVIDENCE",
      genreHints: ["悬疑", "犯罪", "惊悚"], skeleton: "sans", methods: ["cut", "offset"],
      metaphorRule: "用一道统一斜切暗示证词被截断，不加入血迹或武器图形", material: "flat", lighting: "flat",
      hierarchyRule: "中文高窄主标占主要重量，英文像证据编号一样缩小并左对齐", background: "black",
      promptRule: "高窄字面与统一切口制造心理压力，切割后所有关键笔画仍完整", negativeRule: "不要滴血字，不要恐怖游戏字体，不要随机裂纹和碎片飞散", previewClass: "title-mark-crime-cut"
    },
    {
      id: "crime-archive-type", label: "档案证据铅字", category: "crime", sampleTitle: "失踪档案", sampleEnglish: "THE MISSING FILE",
      genreHints: ["刑侦", "谍战", "纪录"], skeleton: "serif", methods: ["offset", "negative-space"],
      metaphorRule: "在一个字腔中保留档案编号式负形，编号不替代片名文字", material: "print", lighting: "flat",
      hierarchyRule: "片名、英文和一个档案编号按编辑网格排列，最多两种字重", background: "white",
      promptRule: "旧铅字和轻微套印偏差营造证据触感，整体秩序保持当代电影完成度", negativeRule: "不要伪造官方文件，不要随机公章，不要严重脏污和乱码编号", previewClass: "title-mark-crime-archive"
    },
    {
      id: "crime-psychological-rift", label: "心理裂隙字标", category: "crime", sampleTitle: "裂隙之中", sampleEnglish: "BETWEEN THE CRACKS",
      genreHints: ["心理", "悬疑", "惊悚"], skeleton: "serif", methods: ["cut", "negative-space"],
      metaphorRule: "让一条细窄负形裂隙穿过非关键区域，裂隙只出现一次", material: "stone", lighting: "side",
      hierarchyRule: "中文保持稳定两行，英文以细小大写放在裂隙方向的终点", background: "black",
      promptRule: "恐惧来自稳定字形中的单一异常，不依靠夸张破坏或污迹", negativeRule: "不要满字裂纹，不要破碎到无法识别，不要鬼脸和血液纹理", previewClass: "title-mark-crime-rift"
    },
    {
      id: "crime-neon-night", label: "霓虹夜案字标", category: "crime", sampleTitle: "夜色追凶", sampleEnglish: "HUNT IN THE NIGHT",
      genreHints: ["都市犯罪", "黑色电影", "追踪"], skeleton: "sans", methods: ["long-stroke", "cut"],
      metaphorRule: "一处长线模拟湿地反射，不绘制具体城市或车辆", material: "glow", lighting: "neon",
      hierarchyRule: "中文窄体主标为一级，英文以宽字距小型大写贴近下方", background: "black",
      promptRule: "冷青与暗红只作为极窄字缘光，字面保留中性深色和清楚轮廓", negativeRule: "不要蓝紫霓虹铺满文字，不要夜店招牌，不要多色光污染", previewClass: "title-mark-crime-neon"
    },
    {
      id: "scifi-geometric-metal", label: "几何金属字标", category: "scifi", sampleTitle: "深空回声", sampleEnglish: "ECHOES BEYOND",
      genreHints: ["硬科幻", "太空", "未来"], skeleton: "geometric", methods: ["cut", "long-stroke"],
      metaphorRule: "一条长横画形成深空地平线，切口对应统一坐标角度", material: "metal", lighting: "edge",
      hierarchyRule: "英文可横向扩展，中文译名缩小至20%并与主轴对齐", background: "black",
      promptRule: "扩展几何字面、精确切角和宽字距建立巨大空间尺度", negativeRule: "不要廉价赛博朋克字体，不要复杂HUD，不要随机缺笔", previewClass: "title-mark-scifi-metal"
    },
    {
      id: "scifi-horizon-wide", label: "地平线宽体字标", category: "scifi", sampleTitle: "越过边界", sampleEnglish: "BEYOND THE LINE",
      genreHints: ["未来", "探索", "灾难"], skeleton: "geometric", methods: ["shared-stroke", "long-stroke"],
      metaphorRule: "共用横画形成唯一空间轴线，轴线不穿过字腔核心", material: "flat", lighting: "flat",
      hierarchyRule: "主标题横跨宽画幅，第二语言保持18%至22%并严格沿同一基线", background: "neutral",
      promptRule: "字面水平延展、上下高度统一，依靠比例和留白而非特效表达未来感", negativeRule: "不要飞船剪影塞进每个字，不要无意义技术符号，不要透视变形", previewClass: "title-mark-scifi-horizon"
    },
    {
      id: "scifi-broken-future", label: "断笔未来字标", category: "scifi", sampleTitle: "零号协议", sampleEnglish: "PROTOCOL ZERO",
      genreHints: ["人工智能", "科技惊悚", "近未来"], skeleton: "geometric", methods: ["cut", "offset"],
      metaphorRule: "用单一坐标切口暗示系统中断，不加入电路板装饰", material: "metal", lighting: "side",
      hierarchyRule: "中文或英文只允许一个成为主标，另一语言作为小型系统标签", background: "black",
      promptRule: "断笔遵循统一模块网格，切口数量少，字形仍能在缩略图中识别", negativeRule: "不要乱码ASCII，不要全字断裂，不要软件界面和代码背景", previewClass: "title-mark-scifi-broken"
    },
    {
      id: "scifi-deep-glow", label: "深空微光字标", category: "scifi", sampleTitle: "星海静默", sampleEnglish: "SILENCE OF STARS",
      genreHints: ["深空", "哲思", "科幻剧情"], skeleton: "serif", methods: ["negative-space", "long-stroke"],
      metaphorRule: "在单个字腔中保留极简星图负形，星点不超过三处", material: "glow", lighting: "starlight",
      hierarchyRule: "中文主标保持安静尺度，英文细小宽字距置于下方，不争夺星点焦点", background: "black",
      promptRule: "细窄微光沿字缘呼吸，大片黑色留白承载深空尺度", negativeRule: "不要彩色星云填字，不要强烈霓虹，不要密集星星装饰", previewClass: "title-mark-scifi-glow"
    },
    {
      id: "period-dark-gold", label: "暗金浮雕史诗", category: "epic", sampleTitle: "帝国余晖", sampleEnglish: "TWILIGHT OF EMPIRE",
      genreHints: ["史诗", "宫廷", "历史"], skeleton: "stone", methods: ["shared-stroke", "long-stroke"],
      metaphorRule: "一条下沉长线形成纪念碑基座，不加入王冠或徽章", material: "gold", lighting: "top",
      hierarchyRule: "中文纪念碑式居中，英文作为底部基座，占中文高度约17%", background: "black",
      promptRule: "浅浮雕与暗金蚀刻表达权力重量，明暗克制，结构端正", negativeRule: "不要金色渐变和强反光，不要欧式游戏徽章，不要厚重3D挤压", previewClass: "title-mark-period-gold"
    },
    {
      id: "period-war-stamp", label: "战争钢印字标", category: "epic", sampleTitle: "烽火来信", sampleEnglish: "LETTERS FROM WAR",
      genreHints: ["战争", "历史", "谍战"], skeleton: "sans", methods: ["offset", "cut"],
      metaphorRule: "统一压痕方向暗示钢印和战地文件，不嵌入武器图形", material: "metal", lighting: "side",
      hierarchyRule: "中文粗体主标稳定居中，英文像军需编号一样小型左对齐", background: "neutral",
      promptRule: "钢印压痕、灰尘和低饱和金属只存在于表面，主轮廓坚实", negativeRule: "不要军事游戏Logo，不要弹孔遍布，不要黄黑警戒线", previewClass: "title-mark-period-war"
    },
    {
      id: "period-cinema-sign", label: "复古电影招牌", category: "retro", sampleTitle: "黄金戏院", sampleEnglish: "THE GOLDEN CINEMA",
      genreHints: ["年代", "喜剧", "音乐"], skeleton: "serif", methods: ["ligature", "long-stroke"],
      metaphorRule: "以一处弧线组织旧影院招牌轮廓，不添加灯泡边框", material: "lacquer", lighting: "flat",
      hierarchyRule: "中文和英文共享同一年代字重，演员名等信息使用中性小字平衡", background: "neutral",
      promptRule: "锁定单一1960至1980年代展示字语言，套印色不超过两种", negativeRule: "不要混合多个年代，不要综艺卡通描边，不要星芒和灯泡堆叠", previewClass: "title-mark-period-sign"
    },
    {
      id: "period-newspaper-print", label: "报刊年代套印", category: "retro", sampleTitle: "昨日头条", sampleEnglish: "YESTERDAY'S HEADLINE",
      genreHints: ["年代剧情", "新闻", "传记"], skeleton: "serif", methods: ["offset", "shared-stroke"],
      metaphorRule: "以一个报纸栏线负形组织片名，不生成真实报纸正文", material: "print", lighting: "flat",
      hierarchyRule: "标题、日期和英文按报刊编辑网格排列，主次通过字重而不是特效区分", background: "white",
      promptRule: "旧报纸标题骨架与双色轻微套印结合，保留清楚当代阅读层级", negativeRule: "不要伪造新闻内容，不要密集小字，不要严重泛黄和污渍", previewClass: "title-mark-period-news"
    },
    {
      id: "literary-life-hand", label: "生活流手写", category: "literary", sampleTitle: "走在回家的路上", sampleEnglish: "THE WAY HOME",
      genreHints: ["生活", "爱情", "家庭"], skeleton: "handwritten", methods: ["ligature", "long-stroke"],
      metaphorRule: "让最后一笔自然延伸为回家路径，不加入房屋或爱心图形", material: "flat", lighting: "flat",
      hierarchyRule: "中文以中等尺寸保留呼吸，英文只作为安静伴随层级", background: "white",
      promptRule: "线条均匀流畅，收笔略有拖尾，字间关系自然，像真实创作者手写", negativeRule: "不要网红签名字体，不要儿童涂鸦，不要每个字大小失控", previewClass: "title-mark-literary-hand"
    },
    {
      id: "literary-auteur-serif", label: "作者电影衬线", category: "literary", sampleTitle: "微光之下", sampleEnglish: "BENEATH THE LIGHT",
      genreHints: ["作者电影", "现实", "爱情"], skeleton: "serif", methods: ["shared-stroke"],
      metaphorRule: "只用一个字腔中的微小光点表达主题，不加入具象插画", material: "print", lighting: "flat",
      hierarchyRule: "中文与英文按编辑网格排列，英文为中文高度约20%，留出完整呼吸行", background: "white",
      promptRule: "高反差衬线、克制字重和精确对齐建立文化感，造字动作保持极少", negativeRule: "不要婚礼请柬字体，不要金色花饰，不要过细到无法输出", previewClass: "title-mark-literary-auteur"
    },
    {
      id: "literary-poetic-line", label: "诗性长线字标", category: "literary", sampleTitle: "风从海上来", sampleEnglish: "WIND FROM THE SEA",
      genreHints: ["诗意剧情", "纪录", "旅行"], skeleton: "handwritten", methods: ["long-stroke", "ligature"],
      metaphorRule: "让一处长线形成海风方向，线条保持抽象而不绘制海浪", material: "ink", lighting: "flat",
      hierarchyRule: "中文主标可分两行，英文细小并沿长线末端对齐", background: "white",
      promptRule: "细线、宽松字距和一处长笔画形成呼吸，整体安静但有明确节奏", negativeRule: "不要每个字都拖尾，不要海浪插画包围文字，不要过度倾斜", previewClass: "title-mark-literary-poetic"
    },
    {
      id: "literary-negative-minimal", label: "极简负形字标", category: "minimal", sampleTitle: "空房间", sampleEnglish: "THE EMPTY ROOM",
      genreHints: ["社会", "实验", "心理"], skeleton: "sans", methods: ["negative-space", "cut"],
      metaphorRule: "在一个字腔中形成房间般矩形负形，不绘制家具或人物", material: "flat", lighting: "flat",
      hierarchyRule: "主标题成为唯一图形主体，其余文字极小并退到边缘信息层", background: "neutral",
      promptRule: "通过字腔、尺度和局部裁切制造概念，裁切不超过单字约15%", negativeRule: "不要把所有文字都放大，不要裁掉关键笔画，不要随机透视", previewClass: "title-mark-literary-negative"
    },
    {
      id: "fantasy-starlight-serif", label: "星轨梦幻衬线", category: "fantasy", sampleTitle: "萤火星河", sampleEnglish: "STARLIT DREAMING",
      genreHints: ["奇幻", "爱情", "梦境"], skeleton: "serif", methods: ["shared-stroke", "long-stroke"],
      metaphorRule: "一条飘逸曲线连接相邻汉字并形成星轨，星点不超过三处", material: "glow", lighting: "starlight",
      hierarchyRule: "中文装饰衬线为主，英文优雅小型衬线置于下方并保持宽字距", background: "black",
      promptRule: "笔画精致、曲线衔接流畅，星光只强调节点，不破坏主字形", negativeRule: "不要满屏星星和光斑，不要仙侠手游Logo，不要过曝发光字", previewClass: "title-mark-fantasy-star"
    },
    {
      id: "fantasy-eastern-myth", label: "东方神话笔势", category: "fantasy", sampleTitle: "云海神谕", sampleEnglish: "ORACLE OF CLOUDS",
      genreHints: ["东方奇幻", "神话", "动画"], skeleton: "handwritten", methods: ["ligature", "negative-space"],
      metaphorRule: "在一个字腔中融入云水负形，书写主线仍保持完整", material: "gold", lighting: "side",
      hierarchyRule: "中文书写占主要重量，英文作为小型印记，不与笔势竞争", background: "black",
      promptRule: "书写动势与云水负形统一，墨金材质克制，轮廓适合院线动画海报", negativeRule: "不要不可读狂草，不要龙凤图腾堆叠，不要金色火焰", previewClass: "title-mark-fantasy-myth"
    },
    {
      id: "fantasy-handdrawn-rhythm", label: "手绘动画节奏字", category: "comedy", sampleTitle: "快乐再出发", sampleEnglish: "JOY RESTARTS",
      genreHints: ["动画", "家庭", "喜剧"], skeleton: "sans", methods: ["offset", "ligature"],
      metaphorRule: "用一处弧线装饰连接字组并形成向前节奏，不添加表情贴纸", material: "lacquer", lighting: "flat",
      hierarchyRule: "中文允许两级大小变化，英文缩小至22%至26%，全字标颜色不超过两种", background: "black",
      promptRule: "手绘块面粗黑带有受控大小节奏，切割和装饰线服务欢快动势", negativeRule: "不要儿童PPT字效，不要彩虹渐变，不要每字不同字体", previewClass: "title-mark-fantasy-rhythm"
    },
    {
      id: "fantasy-organic-texture", label: "生物纹理奇幻字", category: "fantasy", sampleTitle: "森林低语", sampleEnglish: "WHISPERS OF THE WOODS",
      genreHints: ["生态奇幻", "冒险", "动画"], skeleton: "serif", methods: ["negative-space", "shared-stroke"],
      metaphorRule: "只在一个字腔中嵌入叶片或鳞片负形，不绘制完整生物", material: "organic", lighting: "edge",
      hierarchyRule: "中文稳定居中，英文以细小衬线放在下方，保持自然博物志气质", background: "neutral",
      promptRule: "植物、鳞片或矿物纹理只占少量笔画，边缘轮廓光把字标与背景分离", negativeRule: "不要植物爬满所有字，不要怪兽头像，不要多种材质混合", previewClass: "title-mark-fantasy-organic"
    },
    {
      id: "eastern-ink-negative", label: "水墨留白字标", category: "eastern", sampleTitle: "一江春水", sampleEnglish: "RIVER OF SPRING",
      genreHints: ["东方剧情", "诗意", "纪录"], skeleton: "serif", methods: ["long-stroke", "negative-space"],
      metaphorRule: "让一处横画化为江面留白，墨色只在收笔处自然晕开", material: "ink", lighting: "flat",
      hierarchyRule: "中文主标占主要重量，英文以18%高度沿留白边缘安静排列", background: "white",
      promptRule: "细宋骨架与可读书写节奏结合，水墨浓淡集中在一处，大片留白保持现代电影感", negativeRule: "不要满字泼墨，不要山水插画包围标题，不要不可读草书", previewClass: "title-mark-eastern-ink"
    },
    {
      id: "commercial-bold-keyart", label: "现代粗黑主视觉", category: "commercial", sampleTitle: "正面交锋", sampleEnglish: "FACE TO FACE",
      genreHints: ["商业剧情", "动作", "都市"], skeleton: "sans", methods: ["cut", "shared-stroke"],
      metaphorRule: "用一处垂直切口形成正面对抗轴线，不加入武器或人物剪影", material: "flat", lighting: "flat",
      hierarchyRule: "中文宽体粗黑为一级，英文压缩至中文高度22%并严格左对齐", background: "neutral",
      promptRule: "宽大字面、开放字腔和稳定重心保证手机缩略图识别，切角只出现一次", negativeRule: "不要综艺描边，不要立体爆炸字，不要每个字不同大小", previewClass: "title-mark-commercial-bold"
    },
    {
      id: "commercial-urban-condensed", label: "都市高窄标题", category: "commercial", sampleTitle: "城市脉搏", sampleEnglish: "CITY PULSE",
      genreHints: ["都市", "职场", "犯罪"], skeleton: "sans", methods: ["long-stroke", "offset"],
      metaphorRule: "一条细竖线连接字组并暗示城市天际线，只出现一次", material: "metal", lighting: "edge",
      hierarchyRule: "中文高窄主标纵向集中，英文宽字距小型大写形成横向基座", background: "black",
      promptRule: "高窄无衬线与精确网格建立都市速度，字面紧凑但字腔保持清楚", negativeRule: "不要楼房塞进每个字，不要赛博朋克HUD，不要强烈蓝紫霓虹", previewClass: "title-mark-commercial-condensed"
    },
    {
      id: "commercial-fashion-editorial", label: "时尚编辑字标", category: "commercial", sampleTitle: "她的时代", sampleEnglish: "HER ERA",
      genreHints: ["时尚", "人物", "爱情"], skeleton: "serif", methods: ["shared-stroke", "long-stroke"],
      metaphorRule: "延长一处纤细衬线形成杂志编辑轴，不增加花卉或首饰图形", material: "gold", lighting: "side",
      hierarchyRule: "中文高反差衬线保持宽松字距，英文以20%高度对齐中心轴", background: "white",
      promptRule: "高反差衬线、精确留白和克制暗金营造高级编辑感，装饰动作保持极少", negativeRule: "不要婚礼请柬风，不要奢侈品Logo仿制，不要满版金色", previewClass: "title-mark-commercial-fashion"
    },
    {
      id: "commercial-geometric-brand", label: "品牌几何字标", category: "commercial", sampleTitle: "新物种", sampleEnglish: "NEW SPECIES",
      genreHints: ["品牌", "科技", "商业"], skeleton: "geometric", methods: ["negative-space", "cut"],
      metaphorRule: "只在一个字腔中嵌入圆形识别负形，保持字形完整", material: "flat", lighting: "flat",
      hierarchyRule: "中英文共享同一几何网格，第二语言缩小至主标高度20%", background: "neutral",
      promptRule: "模块比例统一、切角精确、轮廓简洁，形成可用于主视觉的原创识别系统", negativeRule: "不要直接模仿品牌Logo，不要渐变科技球，不要无意义图标堆叠", previewClass: "title-mark-commercial-geometric"
    },
    {
      id: "retro-film-subtitle", label: "胶片字幕字标", category: "retro", sampleTitle: "银幕往事", sampleEnglish: "MEMORIES ON FILM",
      genreHints: ["电影史", "传记", "年代"], skeleton: "serif", methods: ["offset"],
      metaphorRule: "以轻微单向套印偏移暗示胶片放映，不绘制胶片齿孔", material: "print", lighting: "flat",
      hierarchyRule: "中文标题保持经典字幕比例，英文像片头字幕一样小型居中", background: "black",
      promptRule: "暖白字面、轻微颗粒与经典电影字幕比例构成真实放映质感", negativeRule: "不要复古滤镜覆盖文字，不要胶片边框，不要严重抖动重影", previewClass: "title-mark-retro-film"
    },
    {
      id: "retro-cinema-neon", label: "霓虹戏院字标", category: "retro", sampleTitle: "午夜场", sampleEnglish: "MIDNIGHT SHOW",
      genreHints: ["年代", "歌舞", "都市"], skeleton: "serif", methods: ["ligature", "long-stroke"],
      metaphorRule: "用一处弧线组织旧戏院招牌节奏，不添加灯泡边框", material: "glow", lighting: "neon",
      hierarchyRule: "中文展示字居中，英文沿弧线下方平直排列并保持小尺寸", background: "black",
      promptRule: "中世纪现代展示字与克制暖色微光结合，管线节奏清楚但字面仍完整", negativeRule: "不要夜店招牌，不要多色霓虹，不要灯泡和星芒堆叠", previewClass: "title-mark-retro-neon"
    },
    {
      id: "epic-field-telegram", label: "战地电报字标", category: "epic", sampleTitle: "最后电文", sampleEnglish: "THE LAST SIGNAL",
      genreHints: ["战争", "谍战", "历史"], skeleton: "sans", methods: ["offset", "cut"],
      metaphorRule: "用一处缺墨断点暗示电报中断，不加入摩斯码背景", material: "print", lighting: "flat",
      hierarchyRule: "中文等宽铅字为一级，英文与编号形成小型档案层级", background: "white",
      promptRule: "等宽铅字、局部缺墨和档案网格表达战时紧迫，主体字形保持完整", negativeRule: "不要伪造军事公文，不要密集代码，不要弹孔和血迹", previewClass: "title-mark-epic-telegram"
    },
    {
      id: "literary-pencil-diary", label: "铅笔日记字标", category: "literary", sampleTitle: "夏日手记", sampleEnglish: "SUMMER NOTES",
      genreHints: ["青春", "纪录", "成长"], skeleton: "handwritten", methods: ["ligature", "long-stroke"],
      metaphorRule: "让最后一笔自然延伸为日记下划线，不绘制纸张或铅笔", material: "print", lighting: "flat",
      hierarchyRule: "中文保留真实书写尺度，英文以18%高度贴近下划线末端", background: "white",
      promptRule: "铅笔压力、轻微擦痕和真实停顿集中在笔画内部，整体安静可读", negativeRule: "不要儿童涂鸦，不要网红手账贴纸，不要满字擦除", previewClass: "title-mark-literary-pencil"
    },
    {
      id: "romance-youth-hand", label: "清透青春手写", category: "romance", sampleTitle: "风吹过夏天", sampleEnglish: "WHEN SUMMER BLOWS",
      genreHints: ["青春", "校园", "爱情"], skeleton: "handwritten", methods: ["ligature", "long-stroke"],
      metaphorRule: "让一处收笔轻微上扬形成夏日风向，不加入爱心图形", material: "flat", lighting: "flat",
      hierarchyRule: "中文手写为一级，英文小型无衬线置于下方并保持清透间距", background: "white",
      promptRule: "圆润可读手写、自然上扬节奏和明亮平面色构成真实青春电影气质", negativeRule: "不要偶像剧粉色描边，不要爱心和花朵堆叠，不要幼儿字体", previewClass: "title-mark-romance-youth"
    },
    {
      id: "romance-urban-serif", label: "都市爱情衬线", category: "romance", sampleTitle: "相遇之后", sampleEnglish: "AFTER WE MET",
      genreHints: ["都市爱情", "剧情", "女性"], skeleton: "serif", methods: ["shared-stroke"],
      metaphorRule: "让相邻文字共用一处细衬线暗示关系连接，不加入人物剪影", material: "gold", lighting: "edge",
      hierarchyRule: "中文优雅衬线为主体，英文以20%高度宽字距居中伴随", background: "black",
      promptRule: "纤细衬线、克制浅金和错落中英层级建立成熟都市爱情感", negativeRule: "不要婚礼字体，不要玫瑰金渐变，不要蝴蝶结和钻石装饰", previewClass: "title-mark-romance-serif"
    },
    {
      id: "romance-letter-ink", label: "怀旧情书字标", category: "romance", sampleTitle: "未寄出的信", sampleEnglish: "THE UNSENT LETTER",
      genreHints: ["怀旧", "爱情", "年代"], skeleton: "handwritten", methods: ["ligature", "negative-space"],
      metaphorRule: "在一个字腔中保留邮戳圆弧负形，不生成真实地址或邮票", material: "ink", lighting: "flat",
      hierarchyRule: "中文钢笔书写保持自然倾斜，英文小型衬线像落款一样靠右", background: "white",
      promptRule: "钢笔墨色浓淡、信纸压痕感和自然连笔表达克制怀旧情绪", negativeRule: "不要伪造地址和邮戳文字，不要信纸插画，不要过度泛黄", previewClass: "title-mark-romance-letter"
    },
    {
      id: "romance-summer-film", label: "夏日胶片字标", category: "romance", sampleTitle: "晴天见", sampleEnglish: "SEE YOU IN SUNLIGHT",
      genreHints: ["夏日", "青春", "轻喜"], skeleton: "sans", methods: ["offset", "long-stroke"],
      metaphorRule: "一处短横画形成日光曝光边缘，不绘制太阳或云朵", material: "lacquer", lighting: "flat",
      hierarchyRule: "中文圆体主标占主要重量，英文小型大写沿下方左对齐", background: "neutral",
      promptRule: "开放圆体、轻微双色套印和日光褪色感形成轻松胶片气质", negativeRule: "不要彩虹渐变，不要贴纸表情，不要过度漏光", previewClass: "title-mark-romance-summer"
    },
    {
      id: "comedy-offset-bold", label: "粗黑错位喜剧字", category: "comedy", sampleTitle: "计划之外", sampleEnglish: "OFF THE PLAN",
      genreHints: ["喜剧", "公路", "家庭"], skeleton: "sans", methods: ["offset", "cut"],
      metaphorRule: "只让一个字块轻微错位暗示意外，不加入表情或道具", material: "flat", lighting: "flat",
      hierarchyRule: "中文粗黑主标保持稳定，英文缩小至24%并沿错位轴线对齐", background: "neutral",
      promptRule: "稳定粗黑中的单一错位制造幽默，大小节奏受控且缩略图清楚", negativeRule: "不要综艺爆炸字，不要每字旋转，不要贴纸和表情包", previewClass: "title-mark-comedy-offset"
    },
    {
      id: "comedy-retro-display", label: "复古活力展示字", category: "comedy", sampleTitle: "今天开张", sampleEnglish: "OPEN TODAY",
      genreHints: ["喜剧", "年代", "音乐"], skeleton: "serif", methods: ["ligature", "long-stroke"],
      metaphorRule: "用一处受控弧线形成开张招牌节奏，不添加星芒和气泡", material: "lacquer", lighting: "flat",
      hierarchyRule: "中文展示字可轻微弧形排列，英文保持平直小型基座", background: "white",
      promptRule: "单一复古展示骨架与两色套印构成活力，弧形节奏不破坏阅读", negativeRule: "不要混合多个年代字体，不要综艺贴纸，不要灯泡描边", previewClass: "title-mark-comedy-retro"
    },
    {
      id: "comedy-soft-rounded", label: "轻喜圆体字标", category: "comedy", sampleTitle: "好事成双", sampleEnglish: "DOUBLE LUCK",
      genreHints: ["轻喜", "家庭", "爱情"], skeleton: "sans", methods: ["shared-stroke", "ligature"],
      metaphorRule: "让两个相邻字共享一处圆角连接，隐喻只出现一次", material: "flat", lighting: "flat",
      hierarchyRule: "中文圆体为一级，英文以22%高度居中，颜色不超过两种", background: "neutral",
      promptRule: "开放字腔、圆角笔画和轻微弹性形成亲和感，结构仍像专业电影字标", negativeRule: "不要儿童园字体，不要彩虹渐变，不要糖果高光和气泡", previewClass: "title-mark-comedy-rounded"
    },
    {
      id: "horror-gothic-serif", label: "哥特冷峻衬线", category: "horror", sampleTitle: "长夜未醒", sampleEnglish: "THE NIGHT ENDURES",
      genreHints: ["哥特", "恐怖", "宗教"], skeleton: "serif", methods: ["long-stroke", "cut"],
      metaphorRule: "一处尖锐收笔形成教堂般垂直感，不绘制十字架或鬼脸", material: "metal", lighting: "edge",
      hierarchyRule: "中文窄长衬线为主，英文小型大写保持庄重宽字距", background: "black",
      promptRule: "窄长衬线、尖锐收笔和冷灰金属构成压迫，背光只分离轮廓", negativeRule: "不要滴血字，不要骷髅和鬼脸，不要重金属乐队Logo", previewClass: "title-mark-horror-gothic"
    },
    {
      id: "horror-ritual-carving", label: "仪式刻痕字标", category: "horror", sampleTitle: "禁忌仪式", sampleEnglish: "FORBIDDEN RITE",
      genreHints: ["民俗", "惊悚", "仪式"], skeleton: "stone", methods: ["negative-space", "cut"],
      metaphorRule: "在一个字腔中嵌入抽象仪式圆环，不生成具体宗教符号", material: "stone", lighting: "side",
      hierarchyRule: "中文石刻主标稳定居中，英文像碑文一样小型排列", background: "black",
      promptRule: "石刻骨架、单一符号负形和暗红擦光制造仪式感，恐惧来自秩序", negativeRule: "不要血迹和手印，不要真实宗教符号，不要满字裂纹", previewClass: "title-mark-horror-ritual"
    },
    {
      id: "horror-blurred-echo", label: "模糊残影字标", category: "horror", sampleTitle: "身后有人", sampleEnglish: "SOMEONE BEHIND",
      genreHints: ["心理", "惊悚", "都市"], skeleton: "sans", methods: ["offset"],
      metaphorRule: "只生成一个单向残影层暗示身后存在，主体字形必须完整", material: "print", lighting: "flat",
      hierarchyRule: "中文主体保持清晰，英文退为小型中性层级，不参与残影", background: "black",
      promptRule: "完整主字形与一次单向低透明残影形成心理异常，低照度冷白克制", negativeRule: "不要多重重影，不要故障乱码，不要鬼脸藏在字里", previewClass: "title-mark-horror-blur"
    },
    {
      id: "horror-sickly-fluorescent", label: "病态荧光字标", category: "horror", sampleTitle: "白色病房", sampleEnglish: "THE WHITE WARD",
      genreHints: ["身体恐怖", "医疗", "惊悚"], skeleton: "sans", methods: ["cut", "long-stroke"],
      metaphorRule: "一处横画形成荧光灯管般冷光，不绘制医疗器械", material: "glow", lighting: "neon",
      hierarchyRule: "中文高窄主标为一级，英文像病历标签一样小型左对齐", background: "neutral",
      promptRule: "灰绿荧光、完整高窄黑体和局部闪烁感构成病态洁净空间", negativeRule: "不要滴血字，不要全图绿光，不要乱码病历和器官图形", previewClass: "title-mark-horror-fluorescent"
    },
    {
      id: "fantasy-storybook-serif", label: "绘本童话字标", category: "fantasy", sampleTitle: "月亮邮局", sampleEnglish: "THE MOON POST",
      genreHints: ["童话", "家庭", "动画"], skeleton: "serif", methods: ["ligature", "negative-space"],
      metaphorRule: "在一个字腔中嵌入月牙负形，只保留一个童话意象", material: "print", lighting: "flat",
      hierarchyRule: "中文手绘衬线为主，英文小型衬线沿下方弧线轻微排列", background: "white",
      promptRule: "手绘衬线、纸面颗粒和柔和两色构成院线绘本气质，细节克制", negativeRule: "不要儿童贴纸，不要彩虹渐变，不要星月装饰遍布所有字", previewClass: "title-mark-fantasy-storybook"
    },
    {
      id: "minimal-swiss-grid", label: "瑞士网格字标", category: "minimal", sampleTitle: "临界点", sampleEnglish: "CRITICAL POINT",
      genreHints: ["社会", "概念", "纪录"], skeleton: "sans", methods: ["offset", "cut"],
      metaphorRule: "用一处红色坐标点标记临界位置，不加入第二个图形", material: "flat", lighting: "flat",
      hierarchyRule: "中英文遵循严格网格，以尺度和字重区分，不依赖装饰", background: "white",
      promptRule: "中性无衬线、严格网格、黑白主色和一点电影红建立理性概念感", negativeRule: "不要信息海报小字堆叠，不要多色几何块，不要随机裁切", previewClass: "title-mark-minimal-swiss"
    },
    {
      id: "minimal-single-line", label: "单线概念字标", category: "minimal", sampleTitle: "一线之间", sampleEnglish: "BETWEEN ONE LINE",
      genreHints: ["实验", "艺术", "心理"], skeleton: "geometric", methods: ["ligature", "shared-stroke"],
      metaphorRule: "使用一条连续线连接相邻文字，连接不穿过关键字腔", material: "flat", lighting: "flat",
      hierarchyRule: "中文单线主标保持中等尺度，英文退为18%高度的中性伴随层", background: "neutral",
      promptRule: "连续单线、有限连接和大片留白形成概念，线宽统一且字形完整", negativeRule: "不要迷宫化笔画，不要每个字连成乱码，不要纹理和发光", previewClass: "title-mark-minimal-line"
    },
    {
      id: "minimal-cropped-space", label: "裁切空间字标", category: "minimal", sampleTitle: "边界之外", sampleEnglish: "OUTSIDE THE FRAME",
      genreHints: ["概念", "科幻", "社会"], skeleton: "sans", methods: ["cut", "negative-space"],
      metaphorRule: "让单个字的边缘与虚拟画框相交，裁切面积不超过15%", material: "flat", lighting: "flat",
      hierarchyRule: "中文主标成为唯一图形焦点，英文缩小并沿裁切边界对齐", background: "white",
      promptRule: "完整字形基础上的局部裁切与负形空间制造张力，整体保持极简", negativeRule: "不要裁掉关键笔画，不要所有文字出框，不要透视变形", previewClass: "title-mark-minimal-crop"
    }
  ];

  const DEFAULT_TITLE_MARK_TEMPLATE_ID = "eastern-cold-serif";

  function getTitleMarkTemplate(id) {
    return TITLE_MARK_TEMPLATES.find((item) => item.id === id) || null;
  }

  function buildTitleMarkSearchText(template) {
    if (!template) return "";
    return [
      template.label,
      template.sampleTitle,
      template.sampleEnglish,
      TITLE_MARK_CATEGORIES[template.category],
      ...(template.genreHints || []),
      TITLE_MARK_SKELETONS[template.skeleton]?.label,
      TITLE_MARK_MATERIALS[template.material]?.label,
      ...(template.methods || []).flatMap((id) => [id, TITLE_MARK_METHODS[id]?.label])
    ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
  }

  function filterTitleMarkTemplates({ category = "all", query = "", favorites = [], favoritesOnly = false } = {}) {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase("zh-CN");
    const favoriteSet = new Set(Array.isArray(favorites) ? favorites : []);
    return TITLE_MARK_TEMPLATES.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (favoritesOnly && !favoriteSet.has(item.id)) return false;
      return !normalizedQuery || buildTitleMarkSearchText(item).includes(normalizedQuery);
    });
  }

  function normalizePosterTitleMarkState(saved = {}) {
    const template = getTitleMarkTemplate(saved.titleMarkTemplate) || getTitleMarkTemplate(DEFAULT_TITLE_MARK_TEMPLATE_ID);
    const legacyCategories = { period: "retro" };
    const requestedCategory = legacyCategories[saved.titleMarkCategory] || saved.titleMarkCategory;
    const methods = [...new Set(Array.isArray(saved.titleMarkMethods) ? saved.titleMarkMethods : template.methods)]
      .filter((id) => TITLE_MARK_METHODS[id])
      .slice(-3);
    const titleMarkFavorites = [...new Set(Array.isArray(saved.titleMarkFavorites) ? saved.titleMarkFavorites : [])]
      .filter((id) => getTitleMarkTemplate(id));
    return {
      titleMarkCategory: TITLE_MARK_CATEGORIES[requestedCategory] ? requestedCategory : "all",
      titleMarkTemplate: template.id,
      titleMarkMethods: methods.length ? methods : template.methods.slice(0, 3),
      titleMarkSkeleton: TITLE_MARK_SKELETONS[saved.titleMarkSkeleton] ? saved.titleMarkSkeleton : template.skeleton,
      titleMarkMaterial: TITLE_MARK_MATERIALS[saved.titleMarkMaterial] ? saved.titleMarkMaterial : template.material,
      titleMarkLighting: TITLE_MARK_LIGHTING[saved.titleMarkLighting] ? saved.titleMarkLighting : template.lighting,
      titleMarkBackground: TITLE_MARK_BACKGROUNDS[saved.titleMarkBackground] ? saved.titleMarkBackground : template.background,
      titleMarkOutputMode: TITLE_MARK_OUTPUT_MODES[saved.titleMarkOutputMode] ? saved.titleMarkOutputMode : "asset",
      titleMarkMetaphor: typeof saved.titleMarkMetaphor === "string" ? saved.titleMarkMetaphor : "",
      titleMarkQuery: typeof saved.titleMarkQuery === "string" ? saved.titleMarkQuery.trim().slice(0, 80) : "",
      titleMarkFavorites,
      titleMarkFavoritesOnly: saved.titleMarkFavoritesOnly === true
    };
  }

  const api = {
    TITLE_MARK_CATEGORIES,
    TITLE_MARK_SKELETONS,
    TITLE_MARK_METHODS,
    TITLE_MARK_MATERIALS,
    TITLE_MARK_LIGHTING,
    TITLE_MARK_BACKGROUNDS,
    TITLE_MARK_OUTPUT_MODES,
    TITLE_MARK_TEMPLATES,
    DEFAULT_TITLE_MARK_TEMPLATE_ID,
    getTitleMarkTemplate,
    buildTitleMarkSearchText,
    filterTitleMarkTemplates,
    normalizePosterTitleMarkState
  };

  root.aigcPosterTitleMarkData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
