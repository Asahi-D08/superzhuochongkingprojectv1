# 桌面宠物 (Desktop Pet) 设计文档

## 概述

基于 Electron + Vue 3 的桌面宠物应用，通过 AstrBot Open API 实现 AI 聊天功能。应用以透明无边框窗口呈现，始终置顶，支持拖拽。

## 状态机

```
[状态1: 待机/Idle] --右键登录成功--> [状态2: Standby] --Enter发送--> [状态3: Speaking]
     ^                                    ^                              |
     |--登录失败--回到自身                 |--------回复完成-------------|
```

### 状态1: 待机 (Idle)
- **视觉**: 合上的书本（占位图）
- **交互**: 右键点击 → 弹出登录表单（后端地址 + API Key）
- **验证**: GET `/api/v1/im/bots` with `X-API-Key` header
- **成功**: 进入状态2；**失败**: 显示错误，停留

### 状态2: Standby
- **视觉**: 打开的书本 + 悬浮角色（占位图）
- **交互**: 左键点击 → 聊天输入框；右键点击 → 聊天记录面板
- **发送**: Enter 键发送消息，进入状态3

### 状态3: Speaking
- **视觉**: 打开的书本 + 角色 + 输出框（同聊天框位置）
- **交互**: 不可操作
- **功能**: 逐字展示 bot 输出（打字机效果）
- **完成**: 回到状态2

## API 映射

| 功能 | AstrBot 端点 | 认证方式 |
|---|---|---|
| 登录验证 | `GET /api/v1/im/bots` | `X-API-Key` header |
| 聊天 | `WS /api/v1/chat/ws?api_key=<key>` | Query param |
| 历史记录 | 本地 IndexedDB 缓存 | 无需 |

## 技术栈

- **框架**: Electron + electron-vite
- **前端**: Vue 3 (Composition API) + Vite
- **通信**: WebSocket (AstrBot Open API)
- **本地存储**: IndexedDB (idb-keyval)
- **样式**: CSS (透明窗口 + 动画)

## 窗口行为

- 无边框 (frameless)
- 透明背景 (transparent)
- 始终置顶 (alwaysOnTop)
- 可拖拽移动
- 系统托盘（右键退出）

## 资源管理

所有图片资源通过 `assets.config.js` 统一管理路径，后期替换素材只需更新对应文件。

## 项目结构

```
chaojizhuocongdawang/
├── package.json
├── electron.vite.config.js
├── src/
│   ├── main/index.js           # Electron 主进程
│   ├── preload/index.js        # 预加载脚本 (IPC 桥接)
│   └── renderer/               # Vue 3 渲染进程
│       ├── index.html
│       └── src/
│           ├── App.vue
│           ├── main.js
│           ├── assets/         # 占位图片资源
│           ├── components/     # 状态组件 + UI 组件
│           ├── composables/    # useStateMachine, useAstrBotApi, useChatHistory
│           └── config/         # assets.config.js
└── docs/plans/
```

## 错误处理

- **登录失败**: 错误提示 → 停留待机状态
- **WebSocket 断连**: 指数退避自动重连 + UI 提示
- **消息发送失败**: 标记失败 + 允许重发
