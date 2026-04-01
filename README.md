# 超级桌宠大王 (Desktop Pet)

基于 Electron + Vue 3 的桌面宠物应用，通过 [AstrBot](https://github.com/Soulter/AstrBot) Open API 实现 AI 聊天功能。

透明无边框窗口，始终置顶，可拖拽移动。支持可插拔皮肤系统。

## 预览

应用启动后显示在屏幕右下角，右键登录 AstrBot 后即可开始聊天。

## 前置条件

- [Node.js](https://nodejs.org/) >= 18
- 运行中的 [AstrBot](https://github.com/Soulter/AstrBot) 实例（需要后端地址和 API Key）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev
```

## 使用方法

1. 启动后右键点击书本图标 → 输入 AstrBot 后端地址和 API Key → 登录
2. 登录成功后在输入框输入消息，按 Enter 发送
3. 右键点击 → 查看聊天记录 / 切换皮肤

## 构建

```bash
npm run build
```

构建产物输出到 `out/` 目录。

## 皮肤系统

应用采用可插拔皮肤架构，视觉渲染与交互逻辑完全分离。

### 添加自定义皮肤

1. 在 `src/renderer/src/skins/` 下创建新文件夹（如 `my-skin/`）
2. 编写一个 Vue 组件，接收 `state` prop（`'idle'` / `'standby'` / `'speaking'`），渲染对应视觉效果
3. 创建 `index.js` 导出皮肤定义：

```js
import MySkin from './MySkin.vue'

export default {
  id: 'my-skin',
  name: '我的皮肤',
  component: MySkin
}
```

4. 在 `src/renderer/src/skins/registry.js` 中导入并注册

运行时可通过右键菜单"切换皮肤"选择。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron |
| 构建工具 | electron-vite + Vite |
| 前端 | Vue 3 (Composition API) |
| AI 通信 | AstrBot Open API (REST + WebSocket) |
| 本地存储 | IndexedDB (idb-keyval) |

## 项目结构

```
src/
├── main/index.js              # Electron 主进程
├── preload/index.js           # IPC 桥接
└── renderer/src/
    ├── App.vue                # 应用入口，组合皮肤 + 交互层
    ├── skins/                 # 可插拔皮肤
    │   ├── registry.js        # 皮肤注册与管理
    │   └── book-character/    # 默认皮肤
    ├── components/            # UI 组件
    │   ├── InteractionLayer   # 交互层（登录/聊天/输出）
    │   ├── SkinSwitcher       # 皮肤切换面板
    │   ├── LoginForm          # 登录表单
    │   ├── ChatInput          # 聊天输入
    │   ├── ChatHistory        # 聊天记录
    │   └── MessageOutput      # 消息输出（打字机效果）
    └── composables/           # 状态管理
        ├── useStateMachine    # 状态机 (Idle → Standby → Speaking)
        ├── useAstrBotApi      # AstrBot API 客户端
        └── useChatHistory     # 聊天记录持久化
```

## 许可证

ISC
