(function initPosterTitleTemplateData(root) {
  const TITLE_CATEGORIES = {
    modern: "现代",
    eastern: "历史东方",
    crime: "悬疑犯罪",
    scifi: "科幻",
    literary: "文艺",
    playful: "喜剧动画"
  };

  const TITLE_LANGUAGE_MODES = {
    cn: "中文主标题",
    en: "英文主标题",
    bilingual: "中英双语"
  };

  const TITLE_MATERIALS = {
    flat: { label: "平面墨色", rule: "标题使用干净平面色，不做立体挤压，只以字重和反差建立层级" },
    ink: { label: "墨迹飞白", rule: "保留克制墨迹、飞白和纸张吸墨边缘，笔画主体必须完整可读" },
    stone: { label: "石刻拓印", rule: "呈现轻微石刻、拓印和风化颗粒，不让破损吞掉关键笔画" },
    metal: { label: "克制金属", rule: "使用低反光金属或银灰蚀刻质感，高光细窄、暗部保留字形" },
    print: { label: "旧印刷", rule: "加入轻微套印偏差、油墨浓淡和纸纤维，不做严重脏污或无法辨认的残字" },
    emboss: { label: "压印浮雕", rule: "使用浅压印或低起伏浮雕，光向与海报主光一致，避免厚重三维塑料字" },
    gold: { label: "暗金箔", rule: "使用低亮度暗金箔和细微磨损，避免廉价黄金渐变与过曝反光" },
    glow: { label: "微光字", rule: "只在字缘加入极窄冷光或暖光，光晕不超过笔画宽度，不做霓虹灯牌效果" },
    lacquer: { label: "漆色套印", rule: "采用高纯度漆色或复古套印色块，边缘清楚，颜色数量不超过两种" }
  };

  const allLanguages = ["cn", "en", "bilingual"];

  const TITLE_TEMPLATES = [
    {
      id: "cn-modern-song", label: "新宋体作者电影", category: "literary", languageModes: allLanguages,
      genreHints: ["文艺", "现实", "爱情"], references: ["《好东西》(2024)", "《走走停停》(2024)", "《爱情神话》(2021)"],
      fontKey: "song", cnRule: "高对比新宋体，横画纤细、竖画稳重，转角清楚，字面端庄但不复古", enRule: "现代高反差衬线，小型大写或标题式大小写，英文字符间距宽于中文",
      hierarchyRule: "中文主标题为一级，英文伴随标题为中文高度的18%至24%，宣传语保持安静的三级层级", layoutRule: "标题放入稳定留白区并与人物视线形成平衡，基线严格对齐，不遮挡脸部和关键物件",
      materialOptions: ["flat", "print"], promptRule: "采用编辑式作者电影标题系统，以克制字重、舒展留白和精确对齐建立高级感", negativeRule: "不要默认办公宋体，不要随机花体，不要中英文字重冲突，不要装饰压过内容", previewClass: "title-preview-modern-song"
    },
    {
      id: "cn-stone-epic", label: "魏碑石刻史诗", category: "eastern", languageModes: allLanguages,
      genreHints: ["历史", "史诗", "战争"], references: ["《封神第一部》(2023)", "《九龙城寨之围城》(2024)", "《长安三万里》(2023)"],
      fontKey: "calligraphy", cnRule: "方峻魏碑骨架，重心低稳，横竖转折带刀刻感，关键笔画保持完整", enRule: "古典碑铭衬线大写，字距舒展，线脚厚重但不使用西式奇幻游戏字体",
      hierarchyRule: "中文片名形成纪念碑式主块，英文缩小至16%至22%并作为横向基座", layoutRule: "适合底部居中或纵向侧排，标题轮廓必须与建筑、山体或人物剪影清楚分离",
      materialOptions: ["stone", "gold", "emboss"], promptRule: "以碑刻结构和克制风化建立历史重量，材质服务于字形而非制造夸张特效", negativeRule: "不要游戏Logo，不要厚重3D挤压，不要火焰包字，不要破损到无法阅读", previewClass: "title-preview-stone-epic"
    },
    {
      id: "cn-brush-myth", label: "行草神话笔势", category: "eastern", languageModes: allLanguages,
      genreHints: ["神话", "武侠", "东方动画"], references: ["《哪吒之魔童闹海》(2025)", "《白蛇：浮生》(2024)", "《影》(2018)"],
      fontKey: "calligraphy", cnRule: "可读行草，起收笔方向明确，飞白集中在少数长笔画，整体重心稳定", enRule: "克制人文无衬线或细衬线，避免与中文书法争夺视觉焦点",
      hierarchyRule: "中文书法标题占主要视觉重量，英文只作小尺寸印记，宣传语沿书写方向形成次级节奏", layoutRule: "书法笔势顺应人物动作、风、云或水流方向，任何长笔画不得穿过人物眼睛",
      materialOptions: ["ink", "gold", "flat"], promptRule: "把真实书写节奏转化为构图动势，保留汉字可读性和东方留白，不模拟具体电影字标", negativeRule: "不要不可辨认狂草，不要廉价毛笔滤镜，不要每个字不同风格，不要英文书法化", previewClass: "title-preview-brush-myth"
    },
    {
      id: "cn-bold-commercial", label: "现代粗黑商业标题", category: "modern", languageModes: allLanguages,
      genreHints: ["商业剧情", "喜剧", "现实"], references: ["《热辣滚烫》(2024)", "《抓娃娃》(2024)", "《第二十条》(2024)"],
      fontKey: "bold", cnRule: "宽体粗黑，字腔开放，字面饱满，缩小后仍能快速识别", enRule: "粗体几何无衬线，字宽与中文视觉重量匹配，避免英文过细",
      hierarchyRule: "主标题可占画面宽度55%至80%，副标题压缩到25%至32%，日期和演职员信息保持小型网格", layoutRule: "适合顶部、底部或留白区块，标题形成单一强焦点，不与人物脸重叠",
      materialOptions: ["flat", "lacquer"], promptRule: "以强字面、清楚层级和移动端缩略图识别为核心，保持商业感但不做促销广告排版", negativeRule: "不要综艺字效，不要多层描边，不要爆炸贴纸，不要阴影和渐变同时堆叠", previewClass: "title-preview-bold-commercial"
    },
    {
      id: "cn-condensed-crime", label: "窄黑悬疑标题", category: "crime", languageModes: allLanguages,
      genreHints: ["悬疑", "犯罪", "惊悚"], references: ["《默杀》(2024)", "《消失的她》(2023)", "《涉过愤怒的海》(2023)"],
      fontKey: "condensed", cnRule: "高窄黑体，字面纵向压缩，笔画硬朗，形成克制压迫感", enRule: "超窄工业无衬线大写，紧凑字距，保持字母内部空间可辨",
      hierarchyRule: "标题形成一条高密度竖向或横向带，英文和日期作为冷静编号层级", layoutRule: "优先放在暗部、门缝、建筑竖线或人物之间的负空间，不穿过面部",
      materialOptions: ["flat", "print", "metal"], promptRule: "使用高窄字面和受控间距制造心理压力，标题像证据标签而不是动作片Logo", negativeRule: "不要滴血字，不要随机裂纹，不要恐怖游戏字体，不要把所有文字压成无法阅读的细线", previewClass: "title-preview-condensed-crime"
    },
    {
      id: "cn-archive-type", label: "档案铅字", category: "crime", languageModes: allLanguages,
      genreHints: ["谍战", "历史", "纪录"], references: ["《解密》(2024)", "《南京照相馆》(2025)", "《奥本海默》(2023)"],
      fontKey: "serif", cnRule: "旧报刊铅字或档案宋体，轻微油墨浓淡差异，字面仍保持方正", enRule: "打字机字形、档案编号体或等宽大写，字符基线严格统一",
      hierarchyRule: "片名、档案编号、日期和地点形成可读的信息层级，最多使用两种字重", layoutRule: "沿照片边缘、文件标签或负空间网格排列，允许轻微错版但不旋转散落",
      materialOptions: ["print", "flat"], promptRule: "让标题具有真实历史档案和旧印刷触感，同时维持当代电影海报的信息秩序", negativeRule: "不要随机公章，不要伪造官方文件，不要严重脏污，不要乱码编号，不要文字散落", previewClass: "title-preview-archive-type"
    },
    {
      id: "cn-handwritten-life", label: "生活流手写", category: "literary", languageModes: allLanguages,
      genreHints: ["生活", "爱情", "纪录"], references: ["《走走停停》(2024)", "《好东西》(2024)", "《过往人生》(2023)"],
      fontKey: "handwritten", cnRule: "克制真实手写，笔压自然，字形略有差异但不幼稚，保留呼吸和停顿", enRule: "轻字重人文无衬线或简洁手写体，英文只承担陪伴层级",
      hierarchyRule: "标题不追求巨大体量，以中等尺寸和宽松行距融入画面情绪，宣传语更轻", layoutRule: "适合人物身旁、窗边、墙面或天空留白，保持书写方向自然且不倾斜漂浮",
      materialOptions: ["flat", "ink"], promptRule: "使用有人味的真实书写节奏表达亲密和日常，避免过度设计感", negativeRule: "不要儿童涂鸦，不要网红签名字体，不要爱心星星装饰，不要每个字大小失控", previewClass: "title-preview-handwritten-life"
    },
    {
      id: "cn-playful-animation", label: "动画节奏字", category: "playful", languageModes: allLanguages,
      genreHints: ["动画", "家庭", "喜剧"], references: ["《雄狮少年2》(2024)", "《机器人之梦》(2023)", "《头脑特工队2》(2024)"],
      fontKey: "playful", cnRule: "圆角粗体或手绘块面字，大小有节奏变化，字腔完整，轮廓适合缩略图", enRule: "友好几何粗体，圆角和中文一致，字符不使用无意义弹跳",
      hierarchyRule: "主标题可有两级大小变化，英文缩小为20%至28%，颜色不超过两种", layoutRule: "标题可与角色动作形成轻微互动，但不得遮住眼睛、手部和关键表情",
      materialOptions: ["flat", "lacquer", "emboss"], promptRule: "以清楚轮廓、节奏变化和有限色块建立动画识别，保持专业院线海报完成度", negativeRule: "不要儿童PPT字效，不要彩虹渐变，不要每字不同字体，不要贴纸装饰堆满画面", previewClass: "title-preview-playful-animation"
    },
    {
      id: "en-wide-scifi", label: "几何宽体科幻", category: "scifi", languageModes: allLanguages,
      genreHints: ["科幻", "太空", "未来"], references: ["《沙丘2》(2024)", "《AI创世者》(2023)", "《编号17》(2025)"],
      fontKey: "geometric", cnRule: "现代黑体水平延展，少量切角只出现在非关键笔画，结构精确", enRule: "扩展几何大写，宽字距，横向笔画形成远景和地平线感",
      hierarchyRule: "英文主标题可横跨画面，中文译名缩小至18%至24%并与英文基线对齐", layoutRule: "优先沿地平线、建筑轴线或巨大留白横向展开，保持未来空间尺度",
      materialOptions: ["metal", "flat", "glow"], promptRule: "用宽体几何结构和精确间距建立宏大未来感，装饰切角必须少而有逻辑", negativeRule: "不要廉价赛博朋克字体，不要随机断笔，不要蓝紫霓虹污染，不要复杂HUD包围标题", previewClass: "title-preview-wide-scifi"
    },
    {
      id: "en-industrial-condensed", label: "工业窄体惊悚", category: "crime", languageModes: allLanguages,
      genreHints: ["惊悚", "战争", "动作"], references: ["《内战》(2024)", "《某种物质》(2024)", "《疯狂的麦克斯：狂暴女神》(2024)"],
      fontKey: "condensed", cnRule: "高窄工业黑体，竖画强硬，文字块像警示标识但不使用安全标志", enRule: "超窄粗体大写，字距紧密，形成机械压力和高能量节奏",
      hierarchyRule: "英文标题承担最大视觉重量，中文译名和日期作为规整小字层", layoutRule: "标题可沿画面边缘或中央轴压缩排列，必须避开人物主要动作路径",
      materialOptions: ["flat", "metal", "print"], promptRule: "使用工业化窄体和明确层级制造紧迫感，不依赖爆炸、火焰或廉价特效", negativeRule: "不要军事游戏Logo，不要黄黑警戒线堆叠，不要过度磨损，不要文字完全贴边", previewClass: "title-preview-industrial-condensed"
    },
    {
      id: "en-editorial-serif", label: "新古典编辑衬线", category: "literary", languageModes: allLanguages,
      genreHints: ["传记", "艺术", "时代剧情"], references: ["《可怜的东西》(2023)", "《粗野派》(2024)", "《普瑞希拉》(2023)"],
      fontKey: "serif", cnRule: "细宋或新宋体，标题尺寸克制，竖向结构精确，留白具有杂志编辑感", enRule: "高反差古典衬线，锐利线脚，标题式大小写或优雅大写",
      hierarchyRule: "主标题与演员名按编辑网格排列，英中文之间保持一整行呼吸空间", layoutRule: "可居中对称或严格左对齐，避免随意贴图，标题区背景必须稳定",
      materialOptions: ["flat", "emboss", "gold"], promptRule: "以高反差衬线、编辑网格和克制尺度表达文化、权力与时代质感", negativeRule: "不要婚礼请柬字体，不要过度花饰，不要金色渐变，不要衬线细到消失", previewClass: "title-preview-editorial-serif"
    },
    {
      id: "en-swiss-minimal", label: "瑞士无衬线留白", category: "modern", languageModes: allLanguages,
      genreHints: ["现实", "艺术", "社会"], references: ["《利益区域》(2023)", "《坠落的审判》(2023)", "《完美的日子》(2023)"],
      fontKey: "bold", cnRule: "中性现代黑体，字重适中，严格遵循网格和左对齐", enRule: "中性无衬线，小型大写或常规字重，间距经过精确控制",
      hierarchyRule: "标题、作者和日期使用统一网格，不通过巨大字号制造焦点，而通过位置和留白建立层级", layoutRule: "大面积留白中左对齐或边缘对齐，所有文本共享清楚基线和安全边距",
      materialOptions: ["flat"], promptRule: "采用瑞士国际主义网格和中性无衬线，以秩序、留白和位置表达作者态度", negativeRule: "不要模板化居中排版，不要装饰线框，不要无意义英文，不要把极简做成信息缺失", previewClass: "title-preview-swiss-minimal"
    },
    {
      id: "en-gothic-horror", label: "哥特恐怖衬线", category: "crime", languageModes: allLanguages,
      genreHints: ["恐怖", "宗教", "哥特"], references: ["《诺斯费拉图》(2024)", "《第一凶兆》(2024)", "《长腿怪》(2024)"],
      fontKey: "horror", cnRule: "尖锐宋体骨架，少量笔画拉长，黑白关系清楚，避免汉字结构被西式化", enRule: "高窄哥特衬线或古旧罗马体，字符带轻微印刷衰变但完整可读",
      hierarchyRule: "主标题保持单行或稳定两行，副标题缩小并增加字距，恐怖感来自比例而非破坏", layoutRule: "适合顶部、底部或中央暗区，拉长笔画不能触碰人物五官和宗教符号",
      materialOptions: ["print", "stone", "flat"], promptRule: "以古老衬线、狭长比例和受控印刷衰变建立不安感，保持严肃电影气质", negativeRule: "不要滴血，不要鬼脸字，不要随机尖刺，不要严重残缺，不要万圣节派对字体", previewClass: "title-preview-gothic-horror"
    },
    {
      id: "en-retro-display", label: "复古年代展示字", category: "modern", languageModes: allLanguages,
      genreHints: ["年代", "音乐", "喜剧"], references: ["《玛克辛》(2024)", "《法兰西特派》(2021)", "《小行星城》(2023)"],
      fontKey: "serif", cnRule: "年代感美术字，结构参考旧招牌和印刷广告，保留清楚现代可读性", enRule: "1960至1980年代展示字体，可选圆润衬线、宽体无衬线或电影招牌结构",
      hierarchyRule: "主标题具有强轮廓，英文与中文形成同年代字重关系，日期和演员名使用中性小字平衡", layoutRule: "适合居中招牌式、顶部弧线式或底部横向块，不同时使用多种年代语言",
      materialOptions: ["print", "lacquer", "flat"], promptRule: "用单一明确年代的展示字体和套印色建立复古身份，排版仍符合当代电影海报层级", negativeRule: "不要混合多个年代，不要廉价复古滤镜，不要卡通描边，不要过多装饰星芒", previewClass: "title-preview-retro-display"
    },
    {
      id: "en-pop-maximal", label: "流行高饱和大标题", category: "playful", languageModes: allLanguages,
      genreHints: ["流行", "歌舞", "青春"], references: ["《芭比》(2023)", "《挑战者》(2024)", "《艾米莉亚·佩雷斯》(2024)"],
      fontKey: "bold", cnRule: "宽体圆角粗黑或锐利流行黑体，字面完整，色块边界干净", enRule: "超粗展示无衬线，单词轮廓强，允许一处高饱和强调色",
      hierarchyRule: "主标题大胆放大，中文和英文只允许一个成为一级，另一语言缩小至20%至28%", layoutRule: "标题与主体分区清楚，可压入大色块但不能覆盖人物表情和商品识别区",
      materialOptions: ["lacquer", "flat", "emboss"], promptRule: "以大字面、强色块和单一流行语汇建立即时识别，同时维持专业网格", negativeRule: "不要多彩渐变，不要气泡贴纸堆叠，不要综艺包装，不要中英文同时巨大", previewClass: "title-preview-pop-maximal"
    },
    {
      id: "en-type-as-image", label: "文字即图形", category: "modern", languageModes: allLanguages,
      genreHints: ["概念", "实验", "惊悚"], references: ["《某种物质》(2024)", "《瞬息全宇宙》(2022)", "《塔尔》(2022)"],
      fontKey: "bold", cnRule: "超大黑体或宋黑混合结构，汉字负形参与画面，但关键字必须完整可辨", enRule: "超大粗体大写，允许局部越界和裁切，以字腔作为构图窗口",
      hierarchyRule: "只允许主标题成为图形主体，其余文字极小并退到边缘信息层", layoutRule: "标题可占画面40%至75%，裁切不超过单个字面约15%，主体与字腔形成明确前后关系",
      materialOptions: ["flat", "lacquer", "metal"], promptRule: "把标题当作主构图形状，用尺度、负形和局部裁切制造概念冲击，仍保证片名识别", negativeRule: "不要把所有文字都放大，不要裁掉关键笔画，不要随机透视变形，不要文字与人物无序穿插", previewClass: "title-preview-type-as-image"
    }
  ];

  const DEFAULT_TITLE_TEMPLATE_ID = "cn-modern-song";

  function getTitleTemplate(id) {
    return TITLE_TEMPLATES.find((template) => template.id === id) || null;
  }

  function filterTitleTemplates(options = {}) {
    const category = TITLE_CATEGORIES[options.category] ? options.category : "all";
    const language = TITLE_LANGUAGE_MODES[options.language] ? options.language : "all";
    return TITLE_TEMPLATES.filter((template) => {
      const categoryMatches = category === "all" || template.category === category;
      const languageMatches = language === "all" || template.languageModes.includes(language);
      return categoryMatches && languageMatches;
    });
  }

  function normalizePosterTitleState(saved = {}) {
    const titleTemplate = getTitleTemplate(saved.titleTemplate) || getTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID);
    const titleMaterial = titleTemplate.materialOptions.includes(saved.titleMaterial)
      ? saved.titleMaterial
      : titleTemplate.materialOptions[0];
    return {
      titleLibraryView: saved.titleLibraryView === "title" ? "title" : "composition",
      titleCategory: TITLE_CATEGORIES[saved.titleCategory] ? saved.titleCategory : "all",
      titleLanguage: TITLE_LANGUAGE_MODES[saved.titleLanguage] ? saved.titleLanguage : "bilingual",
      titleTemplate: titleTemplate.id,
      englishTitle: typeof saved.englishTitle === "string" ? saved.englishTitle : "",
      titleMaterial
    };
  }

  const api = {
    TITLE_CATEGORIES,
    TITLE_LANGUAGE_MODES,
    TITLE_MATERIALS,
    TITLE_TEMPLATES,
    DEFAULT_TITLE_TEMPLATE_ID,
    getTitleTemplate,
    filterTitleTemplates,
    normalizePosterTitleState
  };

  root.aigcPosterTitleTemplateData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
