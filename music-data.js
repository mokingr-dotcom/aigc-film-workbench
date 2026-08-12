(function initMusicData(root) {
  const MUSIC_PURPOSES = {
    film: "电影", series: "剧集", short: "短片", documentary: "纪录片",
    advertising: "广告", promo: "宣传片", trailer: "预告片", animation: "动画",
    game: "游戏", social: "自媒体", ambient_music: "氛围音乐"
  };

  const MUSIC_GENRES = {
    drama: "剧情", suspense: "悬疑", crime: "犯罪", scifi: "科幻", war: "战争",
    action: "动作", romance: "爱情", comedy: "喜剧", horror: "恐怖", history: "历史",
    nature: "自然", humanities: "人文", corporate: "企业", public_service: "公益"
  };

  const MUSIC_VOCABULARIES = {
    orchestral: "管弦", strings: "弦乐", piano: "钢琴", electronic: "电子",
    ambient: "氛围", ethnic: "民族器乐", jazz: "爵士", rock: "摇滚",
    minimal: "极简", texture: "声响纹理", hybrid: "混合配器"
  };

  const MUSIC_SCHEMA_VERSION = 2;
  const MUSIC_VERSION_LIMIT = 12;
  const DURATION_MODES = { preset: "常用时长", custom: "自定义时长", natural: "自然完整结束" };
  const DURATION_PRESETS = [15, 30, 60, 90, 120, 180, 300];
  const MUSIC_TARGETS = {
    generic: "通用影视音乐模型",
    suno: "Suno",
    udio: "Udio",
    stable_audio: "Stable Audio",
    lyria: "Lyria"
  };
  const PROMPT_DENSITIES = { concise: "简洁", detailed: "详细" };
  const ORCHESTRATION_LAYERS = ["lead", "support", "rhythmBass", "textureSpace", "exclude"];

  const MUSIC_DICTIONARY = {
    cinematic_score: { zh: "电影配乐", en: "cinematic film score" },
    orchestral_score: { zh: "管弦配乐", en: "cinematic orchestral score" },
    ambient_score: { zh: "氛围配乐", en: "cinematic ambient score" },
    electronic_score: { zh: "电子配乐", en: "cinematic electronic score" },
    hybrid_score: { zh: "混合配乐", en: "hybrid cinematic score" },
    contemporary: { zh: "当代", en: "contemporary" },
    timeless: { zh: "无明确年代", en: "timeless" },
    vintage_1970s: { zh: "1970年代", en: "1970s-inspired" },
    vintage_1980s: { zh: "1980年代", en: "1980s-inspired" },
    neutral: { zh: "中性文化语汇", en: "culturally neutral" },
    eastern: { zh: "东方音乐语汇", en: "East Asian musical language" },
    regional: { zh: "地域音乐语汇", en: "regional musical language" },
    restrained: { zh: "克制", en: "restrained" },
    intimate: { zh: "亲密", en: "intimate" },
    tense: { zh: "紧张", en: "tense" },
    melancholic: { zh: "忧郁", en: "melancholic" },
    hopeful: { zh: "希望", en: "hopeful" },
    majestic: { zh: "庄严宏大", en: "majestic" },
    playful: { zh: "灵动轻快", en: "playful" },
    low: { zh: "低强度", en: "low intensity" },
    medium: { zh: "中等强度", en: "medium intensity" },
    high: { zh: "高强度", en: "high intensity" },
    slow: { zh: "慢速", en: "slow tempo" },
    moderate: { zh: "中速", en: "moderate tempo" },
    fast: { zh: "快速", en: "fast tempo" },
    no_pulse: { zh: "无明显节拍", en: "without an obvious pulse" },
    flowing: { zh: "流动节奏", en: "flowing rhythm" },
    steady_pulse: { zh: "稳定脉冲", en: "steady pulse" },
    syncopated: { zh: "切分节奏", en: "syncopated rhythm" },
    driving: { zh: "推进节奏", en: "driving rhythm" },
    explosive: { zh: "爆发节奏", en: "explosive rhythmic energy" },
    piano: { zh: "钢琴", en: "piano" },
    felt_piano: { zh: "毡音钢琴", en: "felt piano" },
    string_ensemble: { zh: "弦乐群", en: "string ensemble" },
    soft_cello: { zh: "柔和大提琴", en: "soft cello" },
    low_strings: { zh: "低音弦乐", en: "low strings" },
    french_horn: { zh: "圆号", en: "French horn" },
    low_brass: { zh: "低音铜管", en: "low brass" },
    soft_synth_pad: { zh: "柔和合成器铺底", en: "soft synthesizer pads" },
    analog_synth: { zh: "模拟合成器", en: "analog synthesizer" },
    woodwinds: { zh: "木管", en: "woodwinds" },
    plucked_strings: { zh: "拨弦乐器", en: "plucked strings" },
    regional_plucked_strings: { zh: "地域弹拨乐器", en: "regional plucked strings" },
    bamboo_flute: { zh: "竹笛与箫类气息", en: "breathy bamboo flute" },
    cinematic_percussion: { zh: "电影打击乐", en: "cinematic percussion" },
    light_percussion: { zh: "轻打击乐", en: "light percussion" },
    subtle_low_pulse: { zh: "克制低频脉冲", en: "subtle low-frequency pulse" },
    low_pulse: { zh: "低频脉冲", en: "low pulse" },
    sub_bass_drone: { zh: "次低频持续音", en: "sub-bass drone" },
    natural_room: { zh: "自然空间混响", en: "natural room ambience" },
    spacious_reverb: { zh: "宽阔空间混响", en: "spacious reverb" },
    long_reverb_tail: { zh: "长混响尾音", en: "long reverb tail" },
    granular_texture: { zh: "颗粒声音纹理", en: "granular sound texture" },
    environmental_ambience: { zh: "环境氛围", en: "environmental ambience" },
    breathing_texture: { zh: "呼吸感纹理", en: "breathing sound texture" },
    dense_midrange: { zh: "密集中频配器", en: "dense midrange instrumentation" },
    digital_distortion: { zh: "数字失真", en: "digital distortion" }
  };

  const INSTRUMENT_REGIONS = {
    all: "全部地域",
    universal: "通用",
    western_orchestra: "西方管弦",
    china: "中国",
    east_asia: "东亚",
    south_asia: "南亚",
    middle_east: "中东",
    africa: "非洲",
    latin_america: "拉丁美洲"
  };

  const INSTRUMENT_FAMILIES = {
    all: "全部类型",
    keyboard: "键盘",
    bowed: "拉弦",
    plucked: "拨弦",
    woodwind: "木管与吹奏",
    brass: "铜管",
    percussion: "打击乐",
    electronic_texture: "电子与声音纹理"
  };

  const instrumentSeeds = [
    ["piano", "钢琴", "piano", "universal", "keyboard", ["lead", "support", "exclude"]],
    ["felt_piano", "毡音钢琴", "felt piano", "universal", "keyboard", ["lead", "support", "exclude"]],
    ["violin", "小提琴", "violin", "western_orchestra", "bowed", ["lead", "support", "exclude"]],
    ["viola", "中提琴", "viola", "western_orchestra", "bowed", ["lead", "support", "exclude"]],
    ["cello", "大提琴", "cello", "western_orchestra", "bowed", ["lead", "support", "exclude"]],
    ["double_bass", "低音提琴", "double bass", "western_orchestra", "bowed", ["lead", "support", "rhythmBass", "exclude"]],
    ["string_ensemble", "弦乐群", "string ensemble", "western_orchestra", "bowed", ["lead", "support", "exclude"]],
    ["soft_cello", "柔和大提琴", "soft cello", "western_orchestra", "bowed", ["lead", "support"]],
    ["low_strings", "低音弦乐", "low strings", "western_orchestra", "bowed", ["lead", "support", "rhythmBass", "exclude"]],
    ["harp", "竖琴", "harp", "western_orchestra", "plucked", ["lead", "support", "exclude"]],
    ["classical_guitar", "古典吉他", "classical guitar", "universal", "plucked", ["lead", "support", "exclude"]],
    ["acoustic_guitar", "原声吉他", "acoustic guitar", "universal", "plucked", ["lead", "support", "rhythmBass", "exclude"]],
    ["electric_guitar", "电吉他", "electric guitar", "universal", "plucked", ["lead", "support", "rhythmBass", "textureSpace", "exclude"]],
    ["plucked_strings", "拨弦乐器", "plucked strings", "universal", "plucked", ["lead", "support", "exclude"]],
    ["flute", "长笛", "flute", "western_orchestra", "woodwind", ["lead", "support", "exclude"]],
    ["clarinet", "单簧管", "clarinet", "western_orchestra", "woodwind", ["lead", "support", "exclude"]],
    ["oboe", "双簧管", "oboe", "western_orchestra", "woodwind", ["lead", "support", "exclude"]],
    ["bassoon", "巴松", "bassoon", "western_orchestra", "woodwind", ["lead", "support", "exclude"]],
    ["woodwinds", "木管组", "woodwind ensemble", "western_orchestra", "woodwind", ["lead", "support", "exclude"]],
    ["french_horn", "圆号", "French horn", "western_orchestra", "brass", ["lead", "support", "exclude"]],
    ["trumpet", "小号", "trumpet", "western_orchestra", "brass", ["lead", "support", "exclude"]],
    ["trombone", "长号", "trombone", "western_orchestra", "brass", ["lead", "support", "exclude"]],
    ["tuba", "大号", "tuba", "western_orchestra", "brass", ["lead", "support", "rhythmBass", "exclude"]],
    ["low_brass", "低音铜管", "low brass", "western_orchestra", "brass", ["lead", "support", "rhythmBass", "exclude"]],
    ["cinematic_percussion", "电影打击乐", "cinematic percussion", "universal", "percussion", ["rhythmBass", "support", "exclude"]],
    ["light_percussion", "轻打击乐", "light percussion", "universal", "percussion", ["rhythmBass", "support", "exclude"]],
    ["erhu", "二胡", "erhu", "china", "bowed", ["lead", "support", "exclude"]],
    ["dizi", "笛子", "dizi bamboo flute", "china", "woodwind", ["lead", "support", "exclude"]],
    ["xiao", "箫", "xiao vertical bamboo flute", "china", "woodwind", ["lead", "support", "textureSpace", "exclude"]],
    ["pipa", "琵琶", "pipa", "china", "plucked", ["lead", "support", "rhythmBass", "exclude"]],
    ["guzheng", "古筝", "guzheng", "china", "plucked", ["lead", "support", "exclude"]],
    ["guqin", "古琴", "guqin", "china", "plucked", ["lead", "support", "textureSpace", "exclude"]],
    ["suona", "唢呐", "suona", "china", "woodwind", ["lead", "support", "exclude"]],
    ["sheng", "笙", "sheng mouth organ", "china", "woodwind", ["lead", "support", "textureSpace", "exclude"]],
    ["shakuhachi", "尺八", "shakuhachi", "east_asia", "woodwind", ["lead", "support", "textureSpace", "exclude"]],
    ["koto", "日本筝", "koto", "east_asia", "plucked", ["lead", "support", "exclude"]],
    ["shamisen", "三味线", "shamisen", "east_asia", "plucked", ["lead", "support", "rhythmBass", "exclude"]],
    ["taiko", "太鼓", "taiko drums", "east_asia", "percussion", ["rhythmBass", "support", "exclude"]],
    ["sitar", "西塔琴", "sitar", "south_asia", "plucked", ["lead", "support", "textureSpace", "exclude"]],
    ["sarangi", "萨朗吉", "sarangi", "south_asia", "bowed", ["lead", "support", "exclude"]],
    ["tabla", "塔布拉鼓", "tabla", "south_asia", "percussion", ["rhythmBass", "support", "exclude"]],
    ["bansuri", "班苏里笛", "bansuri flute", "south_asia", "woodwind", ["lead", "support", "textureSpace", "exclude"]],
    ["oud", "乌德琴", "oud", "middle_east", "plucked", ["lead", "support", "exclude"]],
    ["ney", "奈伊笛", "ney flute", "middle_east", "woodwind", ["lead", "support", "textureSpace", "exclude"]],
    ["darbuka", "达布卡鼓", "darbuka", "middle_east", "percussion", ["rhythmBass", "support", "exclude"]],
    ["kora", "科拉琴", "kora", "africa", "plucked", ["lead", "support", "exclude"]],
    ["mbira", "拇指琴", "mbira", "africa", "plucked", ["lead", "support", "rhythmBass", "exclude"]],
    ["djembe", "非洲鼓", "djembe", "africa", "percussion", ["rhythmBass", "support", "exclude"]],
    ["charango", "查朗戈", "charango", "latin_america", "plucked", ["lead", "support", "rhythmBass", "exclude"]],
    ["bandoneon", "班多钮手风琴", "bandoneon", "latin_america", "keyboard", ["lead", "support", "exclude"]],
    ["congas", "康加鼓", "congas", "latin_america", "percussion", ["rhythmBass", "support", "exclude"]],
    ["soft_synth_pad", "柔和合成器铺底", "soft synthesizer pads", "universal", "electronic_texture", ["support", "textureSpace", "exclude"]],
    ["analog_synth", "模拟合成器", "analog synthesizer", "universal", "electronic_texture", ["lead", "support", "rhythmBass", "textureSpace", "exclude"]],
    ["subtle_low_pulse", "克制低频脉冲", "subtle low-frequency pulse", "universal", "electronic_texture", ["rhythmBass", "textureSpace", "exclude"]],
    ["low_pulse", "低频脉冲", "low pulse", "universal", "electronic_texture", ["rhythmBass", "textureSpace", "exclude"]],
    ["sub_bass_drone", "次低频持续音", "sub-bass drone", "universal", "electronic_texture", ["rhythmBass", "textureSpace", "exclude"]],
    ["granular_texture", "颗粒声音纹理", "granular sound texture", "universal", "electronic_texture", ["textureSpace", "support", "exclude"]],
    ["environmental_ambience", "环境氛围", "environmental ambience", "universal", "electronic_texture", ["textureSpace", "support", "exclude"]],
    ["breathing_texture", "呼吸感纹理", "breathing sound texture", "universal", "electronic_texture", ["textureSpace", "support", "exclude"]],
    ["natural_room", "自然空间混响", "natural room ambience", "universal", "electronic_texture", ["textureSpace", "exclude"]],
    ["spacious_reverb", "宽阔空间混响", "spacious reverb", "universal", "electronic_texture", ["textureSpace", "exclude"]],
    ["long_reverb_tail", "长混响尾音", "long reverb tail", "universal", "electronic_texture", ["textureSpace", "exclude"]],
    ["dense_midrange", "密集中频配器", "dense midrange instrumentation", "universal", "electronic_texture", ["exclude"]],
    ["digital_distortion", "数字失真", "digital distortion", "universal", "electronic_texture", ["textureSpace", "exclude"]]
  ];

  instrumentSeeds.forEach(([id, zh, en]) => {
    MUSIC_DICTIONARY[id] = { zh, en };
  });

  const MUSIC_INSTRUMENTS = instrumentSeeds.map(([id, zh, en, region, family, layers]) => ({ id, zh, en, region, family, layers: [...layers] }));

  function filterMusicInstruments({ region = "all", family = "all", query = "" } = {}) {
    const needle = String(query).trim().toLowerCase();
    return MUSIC_INSTRUMENTS.filter((item) => (
      (region === "all" || item.region === region) &&
      (family === "all" || item.family === family) &&
      (!needle || `${item.zh} ${item.en}`.toLowerCase().includes(needle))
    ));
  }

  const INSTRUMENT_PRESETS = {
    "piano-strings": { name: "钢琴与弦乐", lead: ["piano", "string_ensemble"], support: ["soft_cello"], rhythmBass: [], textureSpace: ["natural_room"] },
    "orchestra-electronic": { name: "管弦与电子纹理", lead: ["string_ensemble", "french_horn"], support: ["soft_synth_pad"], rhythmBass: ["subtle_low_pulse"], textureSpace: ["granular_texture"] },
    "ethnic-ambient": { name: "民族器乐与环境氛围", lead: ["regional_plucked_strings"], support: ["bamboo_flute"], rhythmBass: [], textureSpace: ["environmental_ambience"] },
    "low-strings-texture": { name: "低频弦乐与声音纹理", lead: ["low_strings"], support: [], rhythmBass: ["sub_bass_drone"], textureSpace: ["breathing_texture"] },
    "minimal-piano-space": { name: "极简钢琴与空间混响", lead: ["felt_piano"], support: [], rhythmBass: [], textureSpace: ["long_reverb_tail"] },
    "brass-percussion-hybrid": { name: "铜管、打击乐与混合管弦", lead: ["french_horn", "low_brass"], support: ["string_ensemble"], rhythmBass: ["cinematic_percussion"], textureSpace: [] },
    "synth-pulse-granular": { name: "合成器、低频脉冲与颗粒音色", lead: ["analog_synth"], support: [], rhythmBass: ["low_pulse"], textureSpace: ["granular_texture"] },
    "woodwind-plucked-light": { name: "木管、拨弦与轻打击乐", lead: ["woodwinds", "plucked_strings"], support: [], rhythmBass: ["light_percussion"], textureSpace: ["natural_room"] }
  };

  const DEFAULT_MUSIC_STATE = Object.freeze({
    schemaVersion: MUSIC_SCHEMA_VERSION,
    targetModel: "generic",
    promptDensity: "concise",
    templateId: "",
    purpose: "film",
    genre: "drama",
    vocabulary: "strings",
    duration: 15,
    durationMode: "preset",
    customDurationMinutes: 0,
    customDurationSeconds: 15,
    bpm: 72,
    meter: "4/4",
    tonality: "minor",
    emotionStart: "克制、留白",
    emotionEnd: "情绪轻微抬升后留有余韵",
    leadInstrument: "低音弦乐",
    supportInstruments: "钢琴单音、柔和环境纹理",
    excludedInstruments: "",
    dynamics: "pp 起步，缓慢渐强至 mp",
    picture: "",
    editRhythm: "克制的镜头节奏，不强制卡点",
    dialogueMode: "none",
    ending: "保留自然尾音",
    extraRestrictions: "",
    favoriteTemplateIds: [],
    versions: [],
    sceneZh: "",
    sceneEn: "",
    subjectState: "",
    narrativeGoal: "",
    keyBeat: "",
    primaryGenre: "cinematic_score",
    secondaryGenre: "",
    era: "contemporary",
    culturalLanguage: "neutral",
    coreEmotion: "restrained",
    intensity: "low",
    emotionArc: { opening: "restrained", development: "gradual_rise", climax: "", ending: "lingering" },
    orchestrationPreset: "piano-strings",
    orchestration: { lead: ["piano", "string_ensemble"], support: ["soft_cello"], rhythmBass: [], textureSpace: ["natural_room"], exclude: [] },
    tempoFeel: "slow",
    rhythmFeel: "flowing",
    structure: { opening: "建立氛围", development: "发展情绪", climax: "", ending: "形成落点并保留余韵" },
    advancedOpen: false,
    production: { dynamics: "wide", mixDensity: "sparse", spaceWidth: "wide", reverb: "natural", recording: "cinematic" },
    soundRelationship: { dialogueMode: "none", editRhythm: "not_forced", keySyncPoint: "" },
    timeline: [
      { start: 0, end: 5, task: "建立氛围", texture: "低频持续音与稀疏钢琴", dynamic: "pp" },
      { start: 5, end: 12, task: "发展情绪", texture: "弦乐缓慢进入", dynamic: "p 至 mp" },
      { start: 12, end: 15, task: "形成落点", texture: "保留主动机并减少声部", dynamic: "mp 回落至 p" }
    ],
    layout: { leftWidth: 400, rightWidth: 490 }
  });

  const templateSeeds = [
    ["film-intimate-drama", "film", "drama", "strings", "内敛剧情·人物余韵", "人物做出克制决定后的静默时刻", "平静中有未说出的遗憾", "大提琴、中低音弦乐、稀疏钢琴", 30, 66],
    ["film-psychological-suspense", "film", "suspense", "texture", "心理悬疑·潜伏压力", "人物意识到危险却无法立即离开", "低水平不安持续累积，高潮仍保持压抑", "低频弦乐、呼吸感纹理、少量钢琴单音", 15, 58],
    ["film-crime-investigation", "film", "crime", "hybrid", "犯罪调查·冷静推进", "夜间搜证、监视与线索拼合", "理性、冷峻、危险逐步逼近", "脉冲合成器、低音弦乐、克制打击乐", 30, 82],
    ["film-epic-war", "film", "war", "orchestral", "史诗战争·沉重前行", "大规模行军与战场前夜", "悲壮、肃穆，不粉饰战争", "圆号、低弦、定音鼓、男声乐团音色但无哼唱", 60, 72],
    ["film-scifi-future", "film", "scifi", "electronic", "科幻未来·未知尺度", "人类首次面对巨大未知结构", "敬畏、疏离、缓慢扩张", "颗粒合成器、低频无人声谐振、金属纹理", 45, 54],
    ["film-romantic-emotion", "film", "romance", "piano", "爱情情绪·克制靠近", "两人重逢却没有立即表白", "温暖与犹疑并存，最后轻微释然", "柔和钢琴、室内乐弦组、轻微空间氛围", 30, 68],
    ["film-horror-lurking", "film", "horror", "texture", "恐怖潜伏·空间威胁", "空屋中的人物感知到不可见威胁", "极低强度恐惧逐渐收紧", "弓擦金属、低频房间声、不规则木质脉冲", 15, 46],
    ["film-light-comedy", "film", "comedy", "jazz", "轻喜剧·错位节奏", "人物连续遭遇日常尴尬与误会", "轻快、机敏，不夸张滑稽", "拨弦低音、刷奏鼓、单簧管短句", 30, 112],
    ["series-family-drama", "series", "drama", "piano", "家庭剧·生活温度", "餐桌、归家与亲情矛盾的日常场面", "真实、温暖，带少量心酸", "钢琴、木吉他、柔和弦乐", 45, 74],
    ["series-period-intrigue", "series", "history", "ethnic", "历史权谋·暗流", "宫廷或府邸中的试探、对话与利益交换", "克制、威严、暗含杀机", "筝低音、箫、大提琴、少量堂鼓", 45, 64],
    ["series-urban-emotion", "series", "romance", "minimal", "都市情感·夜归", "城市夜晚的独处、通话与情感决定", "现代、疏离，最后保留希望", "电钢琴、柔和合成器、简约电子节拍", 30, 86],
    ["short-poetic-minimal", "short", "drama", "minimal", "诗意短片·呼吸留白", "自然空间中的人物记忆与微小动作", "安静、透明、略带怀念", "单音钢琴、空气纹理、微弱弦乐泛音", 30, 52],
    ["short-social-reality", "short", "drama", "strings", "现实短片·沉默观察", "劳动、通勤、家庭压力与社会现实", "客观、克制，不煞情", "大提琴长音、低频环境底噪、极少钢琴", 45, 60],
    ["short-experimental-texture", "short", "scifi", "texture", "实验影像·材质异变", "抽象物件、身体局部与空间变形", "不稳定、陌生、不预测", "颗粒噪声、弹性金属、反向钢琴纹理", 20, 70],
    ["documentary-nature", "documentary", "nature", "orchestral", "自然纪录·广阔生命", "山川、海洋、迁徙与季节变化", "敬畏、开阔，不过度英雄化", "弦乐、木管、圆号、轻柔打击乐", 60, 76],
    ["documentary-humanities", "documentary", "humanities", "ethnic", "人文纪录·时间纹理", "手艺、乡土、日常仪式与文化记忆", "温厚、尊重、有时间感", "地域弹拨乐器、尺八或箫类气息、低弦", 60, 68],
    ["documentary-social-reality", "documentary", "drama", "minimal", "社会现实·冷静记录", "社会问题、调查、访谈与现场观察", "理性、不评判、保持张力", "低频持续音、稀疏钢琴、微弱电子脉冲", 60, 58],
    ["documentary-biography", "documentary", "history", "piano", "人物传记·回望与转折", "人生阶段、历史照片与关键决定", "怀念、尊重，在转折处增加力量", "钢琴、大提琴、室内乐弦组", 60, 70],
    ["documentary-technology", "documentary", "scifi", "electronic", "科技探索·理性奇观", "实验室、工程结构、数据可视化与未来应用", "清晰、好奇、逐步展开", "模块合成器、马林巴、简洁电子节拍", 45, 92],
    ["advertising-luxury", "advertising", "corporate", "minimal", "高端品牌·克制质感", "奢侈品、香水、珠宝与高端服务主视觉", "冷静、精准、有稀缺感", "现代钢琴、低频弦乐、极简金属点音", 30, 72],
    ["advertising-technology", "advertising", "scifi", "electronic", "科技广告·精准驱动", "手机、智能设备、软件与创新功能演示", "利落、智能、持续向前", "清洁合成器、数字打击乐、短促马林巴", 30, 108],
    ["advertising-automotive", "advertising", "action", "hybrid", "汽车广告·动力与路感", "车身细节、道路驾驶、加速与制动", "稳定、有控制的力量递进", "混合打击乐、低音合成器、弦乐脉冲", 45, 116],
    ["advertising-fashion", "advertising", "drama", "electronic", "时尚美妆·态度节拍", "秀场、妆容、服饰细节与人物步伐", "冷艳、自信、节奏鲜明", "干净电子鼓、合成低音、精简弦乐短句", 30, 124],
    ["advertising-food", "advertising", "comedy", "jazz", "食品生活·温暖鲜活", "食材、烹饪、分享与家庭生活", "轻松、可口、亲近", "木吉他、轻打击乐、马林巴、拨弦低音", 30, 104],
    ["advertising-charity", "advertising", "public_service", "piano", "公益广告·真诚关怀", "真实人物、社会关怀与行动号召", "克制的共情逐步转为希望", "钢琴、温暖弦乐、很轻的木质打击乐", 45, 70],
    ["promo-city", "promo", "corporate", "orchestral", "城市形象·秩序生长", "城市航拍、交通、产业、市民与夜景", "现代、开放、稳步抬升", "弦乐、圆号、电子脉冲、稳定打击乐", 60, 96],
    ["promo-tourism", "promo", "nature", "ethnic", "文旅宣传·山水人文", "风景、非遗、市井、节庆与旅行体验", "清新、广阔、具地域温度", "地域乐器、弦乐、柔和打击乐、自然纹理", 60, 88],
    ["promo-corporate", "promo", "corporate", "hybrid", "企业品牌·可信进取", "团队、制造、服务、创新与成果展示", "稳健、专业、逐步增强", "钢琴动机、弦乐、电子节拍、轻铜管", 60, 102],
    ["promo-launch", "promo", "scifi", "electronic", "科技发布·倒计揭示", "产品发布、功能展开、数据与舞台揭示", "精确、克制蓄力、揭示时明亮", "模块合成器、数字打击乐、弦乐升势", 45, 120],
    ["promo-sports", "promo", "action", "hybrid", "体育激励·节奏爆发", "训练、竞技、团队合作与决胜瞬间", "坚韧、专注、最后释放", "混合鼓组、低音合成器、铜管短句、弦乐脉冲", 45, 132],
    ["promo-public-service", "promo", "public_service", "orchestral", "公益宣传·共同行动", "公共服务、志愿者、社区与集体行动", "真诚、可信、由个人扩展至群体", "钢琴、弦乐、木管、克制打击乐", 60, 84],
    ["trailer-suspense", "trailer", "suspense", "texture", "悬念预告·逐层收紧", "线索闪回、问题提出与黑场悬停", "由安静不安推向突然中断", "低频脉冲、弦乐滑音、金属冲击、时钟纹理", 60, 72],
    ["trailer-action-rise", "trailer", "action", "hybrid", "动作预告·三段递进", "任务建立、危机扩大、动作蒙太奇与片名落点", "节奏逐段加密，高潮后硬停", "混合鼓组、铜管、弦乐跑动、电子低音", 60, 126],
    ["trailer-emotional", "trailer", "drama", "orchestral", "情绪预告·记忆抬升", "关系片段、人生转折与情感高潮", "从私密回忆抬升至克制希望", "钢琴、独奏大提琴、弦乐群、轻铜管", 60, 76],
    ["trailer-epic-countdown", "trailer", "war", "orchestral", "史诗预告·倒计落点", "宏大世界揭示、冲突升级与上映信息", "庄严、压迫、分段释放", "低弦、圆号、定音鼓、金属冲击、无人声乐团音色", 90, 80],
    ["animation-fantasy", "animation", "scifi", "orchestral", "奇幻动画·世界初见", "角色首次进入魔法森林、天空城或奇幻国度", "好奇、轻盈、逐步开阔", "木管、竖琴、弦乐、钟琴、柔和圆号", 45, 96],
    ["animation-child-comedy", "animation", "comedy", "jazz", "童趣动画·轻快冒险", "可爱角色追逐、误会和小型冒险", "明快、灵动，保持叙事节奏", "单簧管、长笛、拨弦、木琴、轻打击乐", 30, 124],
    ["animation-eastern", "animation", "history", "ethnic", "东方动画·山水叙事", "东方山水、传说、修行与家国情感", "雅致、悠远，转折处具有力量", "箫、琵琶、古琴、低弦、堂鼓", 60, 72],
    ["game-exploration", "game", "scifi", "ambient", "世界探索·可循环氛围", "玩家进入新区域并持续自由探索", "好奇、沉浸，无强制高潮", "氛围合成器、柔和弦乐、地域音色点缀", 90, 64],
    ["game-combat", "game", "action", "hybrid", "战斗关卡·循环压力", "中高强度战斗、阶段转换与胜利落点", "持续紧张，保留动态空间", "混合鼓组、低音合成器、铜管、弦乐节奏组", 90, 136],
    ["game-future-electronic", "game", "scifi", "electronic", "未来游戏·机械脉冲", "赛博城市、机械设施、高速穿行与系统潜入", "冷峻、精密、稳定驱动", "序列合成器、工业打击乐、低频脉冲、金属噪声", 60, 128],
    ["social-hook", "social", "comedy", "electronic", "自媒体开场·快速吸引", "前三秒提出问题或展示强视觉信息", "立即、清晰、不喧宾夺主", "短促合成器、简洁鼓点、亮色马林巴", 15, 118],
    ["social-dialogue-bed", "social", "humanities", "minimal", "口播垫乐·人声避让", "解说、访谈、知识分享与密集口播", "稳定、亲和、不抢语义", "低密度电钢琴、轻打击乐、柔和低频", 60, 88],
    ["social-product-demo", "social", "corporate", "electronic", "产品演示·清晰节点", "商品功能、开箱、前后对比与使用步骤", "轻快、清晰、具有信息组织感", "清洁电子节拍、拨弦合成器、轻巧打击乐", 30, 110]
  ];

  const MUSIC_TEMPLATES = templateSeeds.map(([id, purpose, genre, vocabulary, name, scene, emotion, instruments, duration, bpm]) => ({
    id, purpose, genre, vocabulary, name, scene, emotion, instruments, duration, bpm,
    sceneEn: `A cinematic ${genre} scene designed for ${purpose} storytelling`,
    rhythm: bpm < 70 ? "缓慢留白" : bpm < 105 ? "稳定推进" : "鲜明驱动",
    production: vocabulary === "electronic" || vocabulary === "texture" ? "现代声音设计" : "自然电影录音"
  }));

  MUSIC_TEMPLATES.push(
    { id: "ambient-environmental-space", purpose: "ambient_music", genre: "humanities", vocabulary: "ambient", name: "环境空间·缓慢呼吸", scene: "空旷建筑、走廊与无人空间中的缓慢时间流动", sceneEn: "A slowly breathing atmosphere inside an empty architectural space", emotion: "安静、疏离、具有空间纵深", instruments: "环境底噪、柔和持续音、自然混响", duration: 180, bpm: 52, rhythm: "无明显节拍", production: "宽阔空间与自然长尾" },
    { id: "ambient-nature-meditation", purpose: "ambient_music", genre: "nature", vocabulary: "ambient", name: "自然冥想·晨雾水汽", scene: "清晨山林、溪流、雾气与缓慢变化的自然光", sceneEn: "A meditative dawn atmosphere with forest mist, water and slowly changing natural light", emotion: "平静、清澈、轻微治愈", instruments: "呼吸感竹笛、空气纹理、柔和泛音", duration: 300, bpm: 48, rhythm: "自由呼吸", production: "自然环境融合与低密度录音" },
    { id: "ambient-city-night", purpose: "ambient_music", genre: "drama", vocabulary: "electronic", name: "城市夜景·霓虹独行", scene: "深夜城市、车流反光、独行人物与潮湿街道", sceneEn: "A solitary late-night city walk through wet streets and reflected neon traffic", emotion: "现代、孤独、克制而不绝望", instruments: "电钢琴、模拟合成器、低频城市脉冲", duration: 180, bpm: 68, rhythm: "缓慢稳定脉冲", production: "干净电子质感与城市空间" },
    { id: "ambient-deep-space", purpose: "ambient_music", genre: "scifi", vocabulary: "texture", name: "科幻深空·未知尺度", scene: "飞船穿越深空并接近巨大未知天体结构", sceneEn: "A spacecraft crossing deep space toward an immense unknown celestial structure", emotion: "敬畏、辽阔、冷静的不确定", instruments: "次低频持续音、颗粒纹理、遥远金属共振", duration: 300, bpm: 42, rhythm: "无节拍缓慢扩张", production: "超宽空间与深低频声音设计" },
    { id: "ambient-suspense-bed", purpose: "ambient_music", genre: "suspense", vocabulary: "texture", name: "悬疑底床·潜伏压力", scene: "人物在安静室内逐渐察觉不可见的危险正在靠近", sceneEn: "A quiet interior where an unseen threat gradually moves closer to the character", emotion: "低水平紧张、持续收紧、不提前爆发", instruments: "低音弦乐、呼吸纹理、克制低频脉冲", duration: 120, bpm: 54, rhythm: "稀疏不规则脉冲", production: "低照度般的声音密度与中频避让" },
    { id: "ambient-eastern-landscape", purpose: "ambient_music", genre: "history", vocabulary: "ethnic", name: "东方山水·留白远意", scene: "云雾山水、舟行江面与人物静观天地", sceneEn: "An East Asian landscape of misty mountains, a lone boat and quiet contemplation", emotion: "悠远、含蓄、具有东方留白", instruments: "箫、古琴、低密度弦乐与自然风声", duration: 300, bpm: 50, rhythm: "散板与自由呼吸", production: "自然空间、远近层次与低反差录音" },
    { id: "ambient-warm-interior", purpose: "ambient_music", genre: "drama", vocabulary: "minimal", name: "温暖室内·生活余温", scene: "傍晚室内、灯光、家人留下的生活痕迹与静默等待", sceneEn: "A warm evening interior filled with domestic traces, lamplight and quiet waiting", emotion: "亲密、温暖、略带怀念", instruments: "毡音钢琴、柔和大提琴、自然房间混响", duration: 180, bpm: 60, rhythm: "缓慢流动", production: "温暖自然录音与近距离空间" },
    { id: "ambient-industrial-machine", purpose: "ambient_music", genre: "corporate", vocabulary: "texture", name: "工业机械·秩序脉动", scene: "大型机械、自动化产线与金属结构持续运行", sceneEn: "Large machinery, automated production lines and metallic structures operating in steady order", emotion: "冷静、精密、具有持续驱动力", instruments: "金属纹理、模块合成器、机械低频脉冲", duration: 180, bpm: 84, rhythm: "稳定机械脉冲", production: "工业声响采样与现代声音设计" }
  );

  const textFields = [
    "templateId", "meter", "tonality", "emotionStart", "emotionEnd", "leadInstrument",
    "supportInstruments", "excludedInstruments", "dynamics", "picture", "editRhythm",
    "dialogueMode", "ending", "extraRestrictions"
  ];

  function cloneDefaultState() {
    return {
      ...DEFAULT_MUSIC_STATE,
      favoriteTemplateIds: [...DEFAULT_MUSIC_STATE.favoriteTemplateIds],
      emotionArc: { ...DEFAULT_MUSIC_STATE.emotionArc },
      orchestration: Object.fromEntries(ORCHESTRATION_LAYERS.map((layer) => [layer, [...DEFAULT_MUSIC_STATE.orchestration[layer]]])),
      structure: { ...DEFAULT_MUSIC_STATE.structure },
      production: { ...DEFAULT_MUSIC_STATE.production },
      soundRelationship: { ...DEFAULT_MUSIC_STATE.soundRelationship },
      timeline: DEFAULT_MUSIC_STATE.timeline.map((segment) => ({ ...segment })),
      layout: { ...DEFAULT_MUSIC_STATE.layout }
    };
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isValidTimeline(timeline, duration) {
    return Array.isArray(timeline) && timeline.length > 0 && timeline.every((segment) => (
      segment && typeof segment === "object" && !Array.isArray(segment) &&
      Number.isFinite(segment.start) && Number.isFinite(segment.end) &&
      segment.start >= 0 && segment.end > segment.start && segment.end <= duration &&
      (!hasOwn(segment, "task") || typeof segment.task === "string") &&
      (!hasOwn(segment, "texture") || typeof segment.texture === "string") &&
      (!hasOwn(segment, "dynamic") || typeof segment.dynamic === "string")
    ));
  }

  function unique(values) {
    return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
  }

  function durationSecondsFromParts(minutes, seconds) {
    const safeMinutes = Number.isFinite(Number(minutes)) ? Math.max(0, Math.floor(Number(minutes))) : 0;
    const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds))) : 0;
    return Math.max(5, Math.min(3600, safeMinutes * 60 + safeSeconds));
  }

  function durationPartsFromSeconds(duration) {
    const total = Math.max(5, Math.min(3600, Math.floor(Number(duration) || 5)));
    return { minutes: Math.floor(total / 60), seconds: total % 60 };
  }

  function dictionaryIdsFromLegacyText(value) {
    const text = String(value || "");
    const matches = [
      ["钢琴", "piano"], ["大提琴", "soft_cello"], ["低音弦", "low_strings"], ["弦", "string_ensemble"],
      ["圆号", "french_horn"], ["铜管", "low_brass"], ["合成", "analog_synth"], ["木管", "woodwinds"],
      ["拨弦", "plucked_strings"], ["竹笛", "bamboo_flute"], ["箫", "bamboo_flute"], ["打击", "light_percussion"],
      ["低频", "subtle_low_pulse"], ["脉冲", "low_pulse"], ["颗粒", "granular_texture"],
      ["环境", "environmental_ambience"], ["混响", "spacious_reverb"], ["纹理", "breathing_texture"]
    ];
    return unique(matches.filter(([needle]) => text.includes(needle)).map(([, id]) => id));
  }

  function migrateLegacyMusicState(input) {
    const legacy = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const timeline = Array.isArray(legacy.timeline) ? legacy.timeline : [];
    const lead = dictionaryIdsFromLegacyText(legacy.leadInstrument);
    const support = dictionaryIdsFromLegacyText(legacy.supportInstruments);
    const excluded = dictionaryIdsFromLegacyText(legacy.excludedInstruments);
    return {
      schemaVersion: MUSIC_SCHEMA_VERSION,
      sceneZh: typeof legacy.picture === "string" ? legacy.picture : "",
      coreEmotion: String(legacy.emotionStart || legacy.emotionEnd || "").includes("恐") ? "tense" : "restrained",
      orchestration: {
        lead: lead.length ? lead : [...DEFAULT_MUSIC_STATE.orchestration.lead],
        support,
        rhythmBass: support.filter((id) => ["low_pulse", "subtle_low_pulse", "light_percussion", "cinematic_percussion"].includes(id)),
        textureSpace: unique([...support, ...dictionaryIdsFromLegacyText(legacy.dynamics)]).filter((id) => ["granular_texture", "environmental_ambience", "spacious_reverb", "breathing_texture", "natural_room", "long_reverb_tail"].includes(id)),
        exclude: excluded
      },
      structure: {
        opening: typeof timeline[0]?.task === "string" ? timeline[0].task : DEFAULT_MUSIC_STATE.structure.opening,
        development: typeof timeline[1]?.task === "string" ? timeline[1].task : DEFAULT_MUSIC_STATE.structure.development,
        climax: "",
        ending: typeof timeline.at(-1)?.task === "string" ? timeline.at(-1).task : (typeof legacy.ending === "string" ? legacy.ending : DEFAULT_MUSIC_STATE.structure.ending)
      },
      soundRelationship: {
        dialogueMode: ["none", "light", "dense", "narration"].includes(legacy.dialogueMode) ? legacy.dialogueMode : "none",
        editRhythm: typeof legacy.editRhythm === "string" && legacy.editRhythm ? legacy.editRhythm : "not_forced",
        keySyncPoint: ""
      }
    };
  }

  function normalizeDictionaryArray(value, fallback = []) {
    if (!Array.isArray(value)) return [...fallback];
    return unique(value.filter((id) => MUSIC_DICTIONARY[id]));
  }

  function normalizeNestedText(source, fallback, keys) {
    const result = { ...fallback };
    if (!source || typeof source !== "object" || Array.isArray(source)) return result;
    keys.forEach((key) => {
      if (typeof source[key] === "string") result[key] = source[key];
    });
    return result;
  }

  function normalizeMusicVersion(version, index) {
    const raw = version && typeof version === "object" && !Array.isArray(version) ? version : {};
    const musicState = raw.musicState && typeof raw.musicState === "object" && !Array.isArray(raw.musicState)
      ? { ...raw.musicState, versions: [] }
      : null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `music-version-${index + 1}`,
      number: Number.isInteger(raw.number) && raw.number > 0 ? raw.number : index + 1,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `配乐方案 V${index + 1}`,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
      targetModel: MUSIC_TARGETS[raw.targetModel] ? raw.targetModel : "generic",
      prompt: typeof raw.prompt === "string" ? raw.prompt : "",
      musicState
    };
  }

  function normalizeMusicState(input) {
    const state = cloneDefaultState();
    if (!input || typeof input !== "object" || Array.isArray(input)) return state;
    const isVersionTwo = input.schemaVersion === MUSIC_SCHEMA_VERSION || ["targetModel", "sceneZh", "orchestration", "structure", "durationMode"].some((key) => hasOwn(input, key));
    const source = isVersionTwo ? input : { ...input, ...migrateLegacyMusicState(input) };
    state.schemaVersion = MUSIC_SCHEMA_VERSION;

    [
      ["purpose", MUSIC_PURPOSES],
      ["genre", MUSIC_GENRES],
      ["vocabulary", MUSIC_VOCABULARIES]
    ].forEach(([key, catalog]) => {
      if (typeof source[key] === "string" && catalog[source[key]]) state[key] = source[key];
    });

    if (Number.isFinite(source.duration) && source.duration > 0) state.duration = source.duration;
    if (DURATION_MODES[source.durationMode]) state.durationMode = source.durationMode;
    const sourceParts = durationPartsFromSeconds(state.duration);
    state.customDurationMinutes = Number.isFinite(Number(source.customDurationMinutes)) ? Math.max(0, Math.floor(Number(source.customDurationMinutes))) : sourceParts.minutes;
    state.customDurationSeconds = Number.isFinite(Number(source.customDurationSeconds)) ? Math.max(0, Math.floor(Number(source.customDurationSeconds))) : sourceParts.seconds;
    if (state.durationMode === "custom") {
      state.duration = durationSecondsFromParts(state.customDurationMinutes, state.customDurationSeconds);
      const normalizedParts = durationPartsFromSeconds(state.duration);
      state.customDurationMinutes = normalizedParts.minutes;
      state.customDurationSeconds = normalizedParts.seconds;
    }
    if (source.bpm === "") state.bpm = "";
    else if (Number.isFinite(source.bpm) && source.bpm >= 30 && source.bpm <= 240) state.bpm = source.bpm;
    textFields.forEach((key) => {
      if (typeof source[key] === "string") state[key] = source[key];
    });

    if (MUSIC_TARGETS[source.targetModel]) state.targetModel = source.targetModel;
    if (PROMPT_DENSITIES[source.promptDensity]) state.promptDensity = source.promptDensity;
    ["sceneZh", "sceneEn", "subjectState", "narrativeGoal", "keyBeat", "primaryGenre", "secondaryGenre", "era", "culturalLanguage", "coreEmotion", "intensity", "orchestrationPreset", "tempoFeel", "rhythmFeel"].forEach((key) => {
      if (typeof source[key] === "string") state[key] = source[key];
    });
    if (Array.isArray(source.favoriteTemplateIds)) state.favoriteTemplateIds = unique(source.favoriteTemplateIds.filter((id) => MUSIC_TEMPLATES.some((template) => template.id === id)));
    if (Array.isArray(source.versions)) {
      state.versions = source.versions.map(normalizeMusicVersion).filter((version) => version.musicState).slice(0, MUSIC_VERSION_LIMIT);
    }
    if (typeof source.advancedOpen === "boolean") state.advancedOpen = source.advancedOpen;
    state.emotionArc = normalizeNestedText(source.emotionArc, state.emotionArc, ["opening", "development", "climax", "ending"]);
    state.structure = normalizeNestedText(source.structure, state.structure, ["opening", "development", "climax", "ending"]);
    state.production = normalizeNestedText(source.production, state.production, ["dynamics", "mixDensity", "spaceWidth", "reverb", "recording"]);
    state.soundRelationship = normalizeNestedText(source.soundRelationship, state.soundRelationship, ["dialogueMode", "editRhythm", "keySyncPoint"]);
    if (source.orchestration && typeof source.orchestration === "object" && !Array.isArray(source.orchestration)) {
      ORCHESTRATION_LAYERS.forEach((layer) => {
        state.orchestration[layer] = normalizeDictionaryArray(source.orchestration[layer], state.orchestration[layer]);
      });
    }

    if (!state.sceneZh && typeof state.picture === "string") state.sceneZh = state.picture;
    if (!state.picture && state.sceneZh) state.picture = state.sceneZh;
    state.dialogueMode = state.soundRelationship.dialogueMode;

    if (source.layout && typeof source.layout === "object" && !Array.isArray(source.layout)) {
      const isHistoricalDefault = source.layout.leftWidth === 320 && source.layout.rightWidth === 500;
      if (!isHistoricalDefault && Number.isFinite(source.layout.leftWidth) && source.layout.leftWidth >= 240 && source.layout.leftWidth <= 520) {
        state.layout.leftWidth = source.layout.leftWidth;
      }
      if (!isHistoricalDefault && Number.isFinite(source.layout.rightWidth) && source.layout.rightWidth >= 320 && source.layout.rightWidth <= 620) {
        state.layout.rightWidth = source.layout.rightWidth;
      }
    }

    if (isValidTimeline(source.timeline, state.duration)) {
      state.timeline = source.timeline.map((segment, index) => ({
        start: segment.start,
        end: segment.end,
        task: typeof segment.task === "string" ? segment.task : (DEFAULT_MUSIC_STATE.timeline[index] || {}).task || "",
        texture: typeof segment.texture === "string" ? segment.texture : (DEFAULT_MUSIC_STATE.timeline[index] || {}).texture || "",
        dynamic: typeof segment.dynamic === "string" ? segment.dynamic : (DEFAULT_MUSIC_STATE.timeline[index] || {}).dynamic || ""
      }));
    } else {
      state.timeline = scaleMusicTimeline(DEFAULT_MUSIC_STATE.timeline, DEFAULT_MUSIC_STATE.duration, state.duration);
    }

    return state;
  }

  function applyInstrumentPreset(input, presetId) {
    const state = normalizeMusicState(input);
    const preset = INSTRUMENT_PRESETS[presetId];
    if (!preset) return state;
    const orchestration = { ...state.orchestration };
    ORCHESTRATION_LAYERS.forEach((layer) => {
      orchestration[layer] = unique([...(orchestration[layer] || []), ...(preset[layer] || [])]);
    });
    return { ...state, orchestrationPreset: presetId, orchestration };
  }

  function toggleInstrument(input, layer, instrumentId) {
    const state = normalizeMusicState(input);
    if (!ORCHESTRATION_LAYERS.includes(layer) || !MUSIC_DICTIONARY[instrumentId]) return state;
    const current = state.orchestration[layer];
    const next = current.includes(instrumentId) ? current.filter((id) => id !== instrumentId) : [...current, instrumentId];
    return { ...state, orchestration: { ...state.orchestration, [layer]: unique(next) } };
  }

  function analyzeMusicConflicts(input) {
    const state = normalizeMusicState(input);
    const warnings = [];
    const allInstruments = ORCHESTRATION_LAYERS.flatMap((layer) => state.orchestration[layer]);
    if (["intimate", "restrained"].includes(state.coreEmotion) && allInstruments.includes("cinematic_percussion")) {
      warnings.push("当前亲密或极简方向与大型电影打击乐反差较大，可考虑降低打击乐权重。");
    }
    if (state.rhythmFeel === "no_pulse" && state.soundRelationship.editRhythm === "hard_sync") {
      warnings.push("无明显节拍与强制卡点同时存在，模型可能难以兼顾。");
    }
    if (["dense", "narration"].includes(state.soundRelationship.dialogueMode) && allInstruments.includes("dense_midrange")) {
      warnings.push("密集对白与密集中频配器可能互相遮挡，建议减少中频占用。");
    }
    if (state.production.recording === "warm_natural" && allInstruments.includes("digital_distortion")) {
      warnings.push("温暖自然录音与高度数字失真方向冲突，可降低其中一项权重。");
    }
    return warnings;
  }

  function scaleMusicTimeline(timeline, previousDuration, nextDuration) {
    const ratio = nextDuration / previousDuration;
    return timeline.map((segment, index) => ({
      ...segment,
      start: index === 0 ? 0 : Math.round(segment.start * ratio * 10) / 10,
      end: index === timeline.length - 1 ? nextDuration : Math.round(segment.end * ratio * 10) / 10
    }));
  }

  function validateMusicState(input) {
    const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const state = normalizeMusicState(raw);
    const errors = [];
    const isVersionTwo = raw.schemaVersion === MUSIC_SCHEMA_VERSION || ["targetModel", "sceneZh", "orchestration", "structure"].some((key) => hasOwn(raw, key));

    if (isVersionTwo) {
      if (!MUSIC_PURPOSES[state.purpose]) errors.push("请选择配乐用途。");
      if (!state.sceneZh.trim() && !state.narrativeGoal.trim() && !state.templateId) errors.push("请填写画面场景或选择一个配乐案例。");
      if (!MUSIC_DICTIONARY[state.coreEmotion]) errors.push("请选择核心情绪。");
      if (!state.orchestration.lead.length) errors.push("请至少选择一个主奏乐器。");
      if (!Number.isFinite(state.duration) || state.duration <= 0) errors.push("时长必须大于 0 秒。");
      if (raw.bpm !== "" && raw.bpm !== undefined && raw.bpm !== null && (!Number.isFinite(raw.bpm) || raw.bpm < 30 || raw.bpm > 240)) {
        errors.push("BPM 必须留空或填写 30–240 之间的数值。");
      }
      return { valid: errors.length === 0, errors, warnings: analyzeMusicConflicts(state) };
    }

    const duration = raw.duration;
    const bpm = raw.bpm;
    const timeline = raw.timeline;
    const durationValid = Number.isFinite(duration) && duration > 0;
    const bpmValid = Number.isFinite(bpm) && bpm >= 30 && bpm <= 240;
    const timelineHasNumericBounds = Array.isArray(timeline) && timeline.length > 0 && timeline.every((segment) => (
      segment && typeof segment === "object" && !Array.isArray(segment) &&
      Number.isFinite(segment.start) && Number.isFinite(segment.end)
    ));

    if (!MUSIC_PURPOSES[raw.purpose]) errors.push("请选择配乐用途。");
    if (!durationValid) errors.push("时长必须大于 0 秒。");
    if (!bpmValid) errors.push("BPM 必须在 30–240 之间。");
    if (!state.emotionStart.trim() && !state.emotionEnd.trim()) errors.push("请填写情绪走向。");
    if (!state.leadInstrument.trim()) errors.push("请至少填写一个主要配器。");
    if (!timelineHasNumericBounds) {
      errors.push("时间轴包含无效的开始或结束时间。");
    } else {
      timeline.forEach((segment, index) => {
        if (segment.start < 0 || segment.end <= segment.start) errors.push(`第 ${index + 1} 段时间范围无效。`);
        if (durationValid && segment.end > duration) errors.push(`第 ${index + 1} 段时间超出总时长。`);
        if (index > 0 && segment.start < timeline[index - 1].end) errors.push(`第 ${index + 1} 段时间与上一段交叉。`);
        if (index > 0 && segment.start > timeline[index - 1].end) errors.push(`第 ${index + 1} 段时间与上一段之间存在空档。`);
      });
      if (durationValid && (timeline[0]?.start !== 0 || timeline.at(-1)?.end !== duration)) {
        errors.push("时间轴必须完整覆盖总时长。");
      }
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  function formatTime(value) {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  function dialogueLabel(mode) {
    return ({ none: "无对白", light: "少量对白", dense: "密集对白", narration: "旁白" })[mode] || "无对白";
  }

  function composeMusicPrompt(input) {
    const state = normalizeMusicState(input);
    const restrictions = ["纯音乐", "无演唱", "无歌词", "无人声哼唱", "无旁白"];
    const addRestriction = (value) => {
      const line = value.trim();
      if (line && !restrictions.includes(line)) restrictions.push(line);
    };

    if (state.dialogueMode === "dense" || state.dialogueMode === "narration") {
      addRestriction("避让人声主要频段，减少中频占用与配器密度");
    }
    if (state.excludedInstruments) addRestriction(`不使用：${state.excludedInstruments}`);
    state.extraRestrictions.split(/\r?\n/).forEach((restriction) => {
      const line = restriction.trim();
      if (line) addRestriction(`进一步避免：${line}`);
    });

    return [
      "【用途与叙事任务】",
      `用途：${MUSIC_PURPOSES[state.purpose]}；叙事类型：${MUSIC_GENRES[state.genre]}；音乐语汇：${MUSIC_VOCABULARIES[state.vocabulary]}。`,
      state.picture ? `画面任务：${state.picture}。` : "画面任务：围绕当前叙事推进，不喧宾夺主。",
      "【音乐参数】",
      `总时长：${state.duration}秒；${state.bpm} BPM；${state.meter}；${state.tonality}。`,
      "【情绪与动态】",
      `从“${state.emotionStart}”发展至“${state.emotionEnd}”；动态：${state.dynamics}。`,
      "【配器设计】",
      `主奏：${state.leadInstrument}；辅助声部：${state.supportInstruments || "保持简洁的辅助声部"}。`,
      "【分段时间轴】",
      ...state.timeline.map((segment) => `${formatTime(segment.start)}–${formatTime(segment.end)}秒：${segment.task}；${segment.texture}；${segment.dynamic}。`),
      "【画面与声音关系】",
      `剪辑关系：${state.editRhythm}。对白关系：${state.dialogueMode === "narration"
        ? "成片画面含有旁白，配乐避让人声主要频段；生成的音乐本身不含旁白人声。"
        : `${dialogueLabel(state.dialogueMode)}${state.dialogueMode === "dense" ? "，避让人声主要频段。" : "。"}`}`,
      "【结尾】",
      state.ending,
      "【限定词】",
      ...restrictions
    ].join("\n");
  }

  const api = {
    MUSIC_SCHEMA_VERSION,
    MUSIC_VERSION_LIMIT,
    DURATION_MODES,
    DURATION_PRESETS,
    durationSecondsFromParts,
    durationPartsFromSeconds,
    MUSIC_PURPOSES,
    MUSIC_GENRES,
    MUSIC_VOCABULARIES,
    MUSIC_TARGETS,
    PROMPT_DENSITIES,
    INSTRUMENT_REGIONS,
    INSTRUMENT_FAMILIES,
    MUSIC_INSTRUMENTS,
    filterMusicInstruments,
    ORCHESTRATION_LAYERS,
    MUSIC_DICTIONARY,
    INSTRUMENT_PRESETS,
    MUSIC_TEMPLATES,
    DEFAULT_MUSIC_STATE,
    migrateLegacyMusicState,
    normalizeMusicState,
    applyInstrumentPreset,
    toggleInstrument,
    analyzeMusicConflicts,
    validateMusicState,
    scaleMusicTimeline,
    composeMusicPrompt
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.aigcMusicData = api;
})(typeof window !== "undefined" ? window : globalThis);
