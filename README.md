# 超级桌宠大王

超级桌宠大王是一款基于 Electron + Vue 3 的桌面宠物应用。它以透明、无边框、始终置顶的小窗口运行在桌面上，通过本地或远程 AstrBot Open API 提供流式聊天、图片输入、语音输入和语音输出能力。

当前项目重点是把学生作品整理成可维护的产品原型：保留原有桌宠视觉样式，把聊天、语音、皮肤、窗口控制和本地数据拆成清晰模块，方便后续继续扩展。

## 核心能力

- 桌面宠物窗口：透明背景、无边框、始终置顶、可拖拽移动。
- AstrBot 聊天：通过 WebSocket 连接 `/api/v1/chat/ws`，支持流式回复。
- 多模态输入：图片上传到 AstrBot 文件接口后随消息发送。
- 语音输入输出：录音生成 WAV，通过 AstrBot 语音接口进行 STT；回复文本通过 AstrBot TTS 播放，并保留浏览器本地 TTS 适配器用于后续降级策略。
- 皮肤系统：视觉皮肤与交互层分离，支持运行时切换和本地持久化。
- 本地历史：聊天记录保存在 IndexedDB 中。

## 快速开始

### 前置条件

- Node.js 18 或更高版本
- npm
- 运行中的 AstrBot 实例
- AstrBot Open API Key，至少需要聊天能力；语音和文件功能需要对应后端能力已配置

本地 AstrBot 默认地址通常是：

```bash
http://localhost:6185
```

不要把 API Key、后台账号或本地 token 写入仓库。

### 安装与运行

```bash
npm install
npm run dev
```

启动后，右键点击桌宠，输入 AstrBot 服务地址和 API Key 登录。登录成功后即可发送文字、上传图片或使用语音输入。

## 常用命令

```bash
npm run dev        # 启动 Electron/Vite 开发模式
npm test -- --run  # 运行 Vitest 单元测试
npm run build      # 构建 main、preload、renderer 到 out/
npm run preview    # 预览生产构建
```

## 项目结构

```text
src/
├── main/                         # Electron 主进程：窗口、托盘、IPC
├── preload/                      # 安全暴露给渲染进程的桥接 API
└── renderer/src/
    ├── App.vue                   # 应用编排入口
    ├── components/               # 登录、聊天、历史、输出、皮肤切换
    ├── composables/              # 状态机、AstrBot API、语音、本地历史
    ├── services/
    │   ├── audio/                # WAV 编码与音频工具
    │   └── speechProviders/      # AstrBot、浏览器、MiMo 语音适配器
    └── skins/                    # 可插拔皮肤与素材
```

## 架构文档

GitBook 入口已经按仓库根目录配置：

- [产品架构设计](docs/product-architecture.md)
- [GitBook 托管说明](docs/gitbook-hosting.md)
- [贡献者指南](AGENTS.md)

GitBook 同步使用 `.gitbook.yaml` 和 `SUMMARY.md`。绑定 GitBook 空间后，选择 GitHub -> GitBook 初始同步，后续推送到 `main` 会同步文档内容。

## 开发约定

- Vue 组件使用 Composition API。
- 组件文件使用 PascalCase，例如 `ChatInput.vue`。
- composable 使用 `useXxx.js` 命名。
- 皮肤目录使用 kebab-case，例如 `book-character-2`。
- UI 文案和用户可见错误默认使用中文。
- 修改语音、聊天、文件上传或状态机时，需要补充或更新 `*.test.js`。

## 许可证

ISC
