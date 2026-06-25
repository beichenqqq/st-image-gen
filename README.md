# AI 插图生成 - SillyTavern 拓展

在酒馆消息中检测 <image>image###prompt###</image> 标签并自动调用 AI 生成插图。

## 安装方法

打开酒馆 -> 拓展 -> 安装拓展，输入此仓库的 Git URL。

## 支持的引擎

- **NovelAI 3/4** - 只需填写 API Key
- **Stable Diffusion (A1111/Forge)** - 填写 API 地址
- **ComfyUI** - 填写 API 地址 + Workflow JSON

## 使用方法

1. 安装后刷新酒馆页面
2. 右下角会出现一个紫色浮动按钮 ???
3. 点击按钮打开设置面板，配置 API Key 或后端地址
4. 之后 AI 回复中的 <image>image###tags###</image> 会自动生成图片
5. 你现有的油猴插图世界书.json 继续用即可

## 兼容性

与现有的油猴插件世界书格式完全兼容，不需要修改任何角色卡或世界书配置。
