# 本地场次智能分析设计

## 目标

让创作者确认剧本拆场后，可在每个场次看到一份基于原文的本地分析草稿，并一键把可信的内容写入空白制作字段，快速得到可编辑的视频提示词起点。

## 用户流程

1. 用户上传、粘贴或新建剧本，确认场次草稿。
2. 用户打开任意场次，在“剧本分析草稿”中查看人物、情绪、动作、台词、关键物件和导演建议。
3. 用户点击“写入空白字段”。系统只填充当前为空的场次字段和第一条镜头的空字段。
4. 用户继续手动调整影调、光线、景别、运镜与表演；既有项目母版、场次覆盖和锁定资产始终不被改写。
5. 最终提示词和“发送到 15 秒运镜”使用写入后的场次信息。

## 范围与边界

- 使用纯本地规则，不调用网络、模型 API 或上传剧本内容。
- 只提取可从文本直接观察到的内容：中文角色名、显式情绪词、可见动作词、台词、常见关键物件。
- 导演建议仅提供克制的默认表演、景别与运镜起点，不自动写入色彩或光线，避免污染项目视觉圣经。
- “写入空白字段”不得覆盖：已有角色、情绪、动作、台词、场景、时间、影调覆盖、镜头卡覆盖、资产锁定和已保存版本。
- 无可用候选时，面板显示“原文中未识别到可直接写入的制作信息”，而不是伪造人物或情节。

## 组件与数据

### `scene-assistant-data.js`

新增 `buildSceneAssistantDraft(scene)`：输入场次对象，输出：

- `characters: string[]`
- `emotion: string`
- `action: string`
- `dialogue: string`
- `props: string[]`
- `references: { performance, framing, movement }`
- `summary: string`

现有 `extractSceneCandidates(scene)` 升级为可识别叙事行内的“角色对某人说：台词”结构，并扩充日常动作词。所有字符串长度受限，候选去重。

### `project-scenes.js`

新增一个非持久的分析草稿渲染器和 `apply-scene-analysis` 操作：

- 只在当前场次的 `storyBeat`、`setting` 或 `title` 有文本时显示。
- 显示“人物 / 情绪 / 动作 / 台词 / 关键物 / 导演建议”。
- 写入时对每个字段使用“已有值优先”。
- 更新 `scene.assistant`，并让既有场次持久化、可生成检查和右侧提示词自然刷新。

## 写入规则

| 目标字段 | 条件 | 草稿来源 |
| --- | --- | --- |
| `scene.characters` | 当前为空 | `draft.characters` |
| `scene.emotion` | 当前为空 | `draft.emotion` |
| `scene.action` | 当前为空 | `draft.action` |
| `scene.videoCard.performance` | 当前为空 | `draft.references.performance.prompt` |
| `scene.videoCard.dialogue` | 当前为空 | `draft.dialogue` |
| `scene.videoCard.props` | 当前为空 | `draft.props.join('、')` |
| `shot.framing` | 当前为空 | `draft.references.framing.prompt` |
| `shot.movement` | 当前为空 | `draft.references.movement.prompt` |

## 验收标准

- 输入“阿岚抱着旧相机穿过人行天桥，听见手机震动后停下脚步。”能识别阿岚、抱着/穿过/听见、旧相机/手机。
- 输入“阿岚把照片放在柜台上，对店员说：这张照片不是我拍的。她强忍不安，慢慢抬头。”能识别阿岚、照片、台词与不安。
- 一键写入不会覆盖用户已有的角色、影调、表演、动作或镜头卡内容。
- 写入后场次提示词和 15 秒运镜交接都包含新增的角色、情绪、动作或台词信息。
- 无网络依赖；现有 `prompt-generator.test.js` 全量通过；浏览器真实剧本流程通过且临时数据被清理。
