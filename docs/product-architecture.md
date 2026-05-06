# 产品架构设计

## 产品定位

超级桌宠大王是一个桌面端 AI 伴随应用。产品目标不是做完整聊天客户端，而是让用户在桌面上通过一个轻量桌宠完成短对话、图片提问、语音输入和语音播报。

当前版本以本地 AstrBot 为核心后端。桌宠只负责桌面交互、前端状态、媒体采集与播放；模型、会话、TTS、STT 和插件能力由 AstrBot 承担。

## 目标用户与场景

- 学生和创作者：需要一个可展示、可二次开发的桌宠作品。
- 本地 AI 用户：已经配置 AstrBot，希望把本地模型能力接入桌面入口。
- 维护者：需要清晰的模块边界，能继续重构语音、皮肤和多模态能力。

主要使用场景：

1. 启动桌宠并连接本地 AstrBot。
2. 通过文字或图片向模型提问。
3. 使用麦克风录音，由 AstrBot STT 转成文字后进入同一聊天链路。
4. 接收流式回复，并通过 AstrBot TTS 播放；浏览器本地 TTS 作为独立适配器保留。
5. 切换皮肤或查看本地聊天历史。

## 系统上下文

```text
User
  |
  v
Electron Desktop Pet
  |-- Renderer: Vue UI, state machine, chat, voice, skins
  |-- Preload: limited IPC bridge
  |-- Main: transparent window, tray, drag/resize
  |
  v
AstrBot Open API
  |-- Chat sessions and WebSocket streaming
  |-- File upload for image attachments
  |-- Voice transcription and speech synthesis
  |
  v
Configured LLM / STT / TTS providers
```

## 运行时架构

### Electron 主进程

`src/main/index.js` 创建透明无边框窗口，控制始终置顶、窗口尺寸、拖拽移动和系统托盘。主进程不处理业务数据，只接收 preload 暴露的安全 IPC 请求。

### Preload 桥接

`src/preload/index.js` 通过 `contextBridge` 暴露有限能力，例如窗口拖拽和窗口尺寸调整。渲染进程不能直接访问 Node.js API，降低 Electron 安全面。

### Vue 渲染进程

`src/renderer/src/App.vue` 是产品编排层，负责组合：

- `useStateMachine()`：桌宠状态流转。
- `useAstrBotApi()`：AstrBot 凭据、连接检测、WebSocket、文件上传。
- `useVoice()`：麦克风录音、WAV 生成、音频播放。
- `createSpeechProvider()`：根据配置选择语音适配器。
- `useChatHistory()`：IndexedDB 本地历史。
- `useSkinManager()`：皮肤注册、切换和持久化。

组件层只负责界面和事件分发，核心逻辑尽量下沉到 composables 和 services。

## 状态机设计

```text
idle
  | LOGIN_SUCCESS
  v
standby
  | SEND_MESSAGE
  v
speaking
  | REPLY_COMPLETE
  v
standby

standby
  | START_LISTENING
  v
listening
  | STOP_LISTENING / CANCEL_LISTENING
  v
standby or speaking
```

- `idle`：未连接 AstrBot，只展示登录入口。
- `standby`：可输入文字、上传图片、录音、查看历史、切换皮肤。
- `listening`：录音中，只允许取消或发送。
- `speaking`：展示模型回复和打字机效果，语音播放失败不影响状态恢复。

## 核心数据流

### 文本与图片聊天

1. `ChatInput` 产出文本和附件。
2. 图片通过 `POST /api/v1/file` 上传，得到 `attachment_id`。
3. `App.vue` 将文本和图片组装为 AstrBot message parts。
4. `useAstrBotApi()` 通过 `/api/v1/chat/ws` 发送消息。
5. WebSocket 流式返回 plain/end/complete 等事件。
6. 回复写入 `useChatHistory()` 并展示在 `MessageOutput`。

### 语音输入

1. `useVoice()` 调用麦克风权限并采集 PCM。
2. `services/audio/wav.js` 编码为 16 kHz 单声道 WAV。
3. `astrbotSpeechProvider` 上传到 `/api/v1/voice/transcriptions`。
4. 转写文本复用普通聊天发送链路。

### 语音输出

1. AstrBot 回复完整文本。
2. `createSpeechProvider()` 在服务地址和 API Key 存在时选择 AstrBot 语音适配器。
3. `astrbotSpeechProvider` 调用 `/api/v1/voice/speech` 获取音频。
4. `useVoice().playAudio()` 播放音频。
5. TTS 失败只记录，不阻断聊天；自动降级到浏览器 TTS 需要后续在编排层补充。

## 模块边界

| 模块 | 责任 | 不应承担 |
|---|---|---|
| `App.vue` | 业务编排和跨模块事件 | 具体 API payload 细节、音频编码 |
| `components/` | UI 展示和用户事件 | 直接访问 AstrBot 或 IndexedDB |
| `composables/` | 可复用状态与副作用 | 皮肤视觉实现 |
| `services/audio/` | 音频格式处理 | 网络请求 |
| `services/speechProviders/` | TTS/STT 供应商适配 | Vue 状态管理 |
| `skins/` | 桌宠视觉表现 | 登录、聊天、语音业务逻辑 |

## AstrBot 集成

桌宠只依赖 AstrBot Open API，不直接调用模型供应商：

- `GET /api/v1/chat/sessions`：登录后做聊天权限检测。
- `WS /api/v1/chat/ws`：发送消息并接收流式回复。
- `POST /api/v1/file`：上传图片附件。
- `POST /api/v1/voice/transcriptions`：语音转文本。
- `POST /api/v1/voice/speech`：文本转语音。

认证使用 Open API Key。REST 请求通过 `X-API-Key` 头传递，WebSocket 通过 `api_key` query 参数传递。文档和代码不得包含真实 Key。

## 扩展设计

### 新增皮肤

每个皮肤是独立目录，导出 `{ id, name, component }`。组件只接收 `state` prop，根据桌宠状态渲染视觉。新增皮肤后在 `src/renderer/src/skins/registry.js` 注册。

### 新增语音供应商

新增 provider 应实现统一接口：

```js
{
  id,
  label,
  canSpeak,
  canTranscribe,
  transcribe(audioBlob),
  synthesize(text),
  speak(text, { playAudio })
}
```

选择逻辑放在 `speechProviderFactory.js`，不要把供应商代码写进 `App.vue` 或 `useAstrBotApi.js`。

## 非功能要求

- 安全：渲染进程不暴露 Node.js 能力；不提交 API Key；避免扩大 preload API。
- 可维护性：业务逻辑和 UI 分离，新增供应商或皮肤不影响聊天主链路。
- 容错：聊天连接失败要给出中文错误；TTS/STT 失败不应导致 WebSocket 断开。
- 测试：网络 payload、WAV 编码、provider 选择、连接错误提示应有 Vitest 覆盖。

## 已知演进方向

- 在登录 UI 中展示 AstrBot 语音能力检测结果。
- 将录音采集从 `ScriptProcessorNode` 迁移到 `AudioWorklet`。
- 为语音播放增加取消、队列和音量控制。
- 增加端到端测试，覆盖本地 AstrBot 连接、流式聊天、语音输入输出。
- 将皮肤元数据扩展为包含尺寸、锚点和交互热区。
