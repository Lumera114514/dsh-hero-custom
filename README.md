# dsh-hero-custom

在 DeepSeek Harness（DSH）Web GUI 里自定义新对话首页的标题：

把「**探索未至之境 预览版**」改成你想要的文字，还能调整位置、字号、颜色、字体、光效、动态特效——以及标题前的鲸鱼图标（大小 / 颜色 / 动画）。所有设置在 **设置 → 主界面标题** 里直接改，实时预览、自动保存。

## 功能

- **主标题文字**：修改「探索未至之境」
- **徽标文字**：修改 / 隐藏「预览版」徽标（留空即隐藏）
- **字号**：0–96px（0 = 默认 26px）
- **颜色**：任意颜色
- **字体**：手动输入或一键选择（楷体 / 宋体 / 黑体 / 圆体 / 等线 / 无衬线）
- **位置**：X / Y 偏移（-300 ~ 300px）
- **光效**：霓虹辉光（开关 + 颜色 + 半径 + 强度 1–4 层）
- **标题特效**：无 / 流光（渐变流动）/ 呼吸 / 彩虹循环
- **鲸鱼图标**：大小（0 = 默认 24px，等比缩放）、颜色、动画（游动 / 弹跳 / 旋转 / 摇摆 / 脉冲）
- **防闪现**：点击「新建对话」时旧文字不会一闪而过（预隐藏 + 帧级替换）
- **持久化**：设置保存到 `$DSH_HOME/hero-custom.settings.json`，重启不丢

## 安装

```sh
# 从 npm 安装
dsh plugin --profile web add dsh-hero-custom

# 或本地目录
dsh plugin --profile web add ./path/to/dsh-hero-custom
```

装好后**重启 dsh**（`dsh --profile web` / 重启 DSH Desktop），打开 **设置 → 主界面标题**。

## 兼容性

- 客户端主定位使用打包运行时里的哈希类名（`.pXSMma_headlineText` / `.pXSMma_previewBadge` / `.pXSMma_fish`，对应 DSH web 0.1.0-rc.6 运行时），并内置了按原文「探索未至之境 / 预览版」匹配的**兜底逻辑**，DSH 升级后一般仍能工作。
- 免构建：`lib/` 为预构建产物，无 `prepare` 脚本，安装零阻碍。

## 数据与安全

- 设置仅存本机 `$DSH_HOME/hero-custom.settings.json`，不上传任何数据。
- 纯 UI 文案定制，不修改任何官方文件、不影响会话数据。

## License

[MIT](./LICENSE)
