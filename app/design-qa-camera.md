# 15秒运镜方案 A 视觉验收

验收日期：2026-07-15

## 对照基准

- 选定设计稿：`design-references/camera-option-a.png`
- 正式页面截图：`output/playwright/camera-option-a/implementation-c05-full-list-1440x1024.png`
- 并排对照：`output/playwright/camera-option-a/design-qa-side-by-side.png`
- 正式页面：`http://127.0.0.1:8766/index.html?fresh=camera-option-a-final`

## 结果

- 1440 x 1024：三栏比例为 270 / 786 / 360，无横向溢出。
- 1024 x 900：工作台按监看、案例库、生成器纵向排列，无横向溢出。
- 390 x 844：时间刻度保持横向六段，案例、调度地图和生成器依次排列，无横向溢出。
- 案例列表独立滚动，监看画面和三轨时间轴固定在视觉中心，右侧表单独立滚动。
- C05 可生成三条 0-15 秒轨道；C07 可展开空间调度地图。
- 正式结构、内容校验、版本保存和复制状态随表单实时更新。
- 浏览器控制台：0 errors，0 warnings。

## 保留差异

- 设计稿中的静态示例字段替换为正式产品的完整业务字段，右侧信息量更高。
- 正式页面保留项目中心、全站搜索和五个现有工作台入口。
- 列表使用本地已有影视参考资产，避免网络依赖。
