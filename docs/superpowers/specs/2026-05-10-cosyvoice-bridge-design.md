# CosyVoice 流式语音桥接设计

## 1. 背景与目标

桌宠 App（Electron + Vue 3）跑在 Windows，AstrBot 通过 WebSocket 将 LLM 回复以小段
`{type:'plain', streaming:true, data:'…'}` 推送到客户端。回复文本里会出现 `<情绪>`
形式的中文情绪标签（例如 `<高兴>` `<悲伤>` `<惊讶>`），需要在播放时影响音色。

CosyVoice3（Fun-CosyVoice3-0.5B）部署在另一台 Linux 机器，已 enroll 1421 个 zero-shot
说话人到 `spk2info.pt`，可以按 `spk_id` 直接合成。

目标：把 LLM 输出文本流接到 CosyVoice，在桌宠端流式播放，**首句出声 ≤ 1 秒**，标签
按情绪改变语气，两台机器在同一 LAN 下连通即可。

非目标：本期不实现公网穿透、并发计费、跨房间多端口同步、说话人在线注册。

## 2. 总体架构

```
Windows PC                                       Linux PC（GPU）
┌──────────────────────────────┐                ┌──────────────────────────────┐
│ Electron App                  │                │ cosyvoice_tts_server         │
│                               │                │ (FastAPI + WebSocket)        │
│ AstrBot WS  ──┐               │                │                              │
│   onMessage   │ stream chunks │   ws://lan-ip  │ /ws/tts                      │
│   onEnd       ↓               │  text frames   │   ├─ EmotionParser           │
│ cosyvoiceSpeechProvider ──────┼───────────────►│   ├─ SentenceBuffer          │
│                               │                │   ├─ TTSEngine (CosyVoice3)  │
│ AudioPlayQueue ◄──────────────┼─── wav frames ─┤   └─ WAV encoder             │
└──────────────────────────────┘                │ 单例模型常驻显存              │
                                                  └──────────────────────────────┘
```

## 3. 协议（WebSocket `ws://<lan-ip>:8765/ws/tts`）

### 3.1 客户端 → 服务端

第一帧：握手 / 配置（一次）
```jsonc
{
  "type": "begin",
  "spk": "0000040.wav_0000000000_0000171840",
  "language": "ja",
  "format": "wav",
  "sample_rate": 24000,
  "client_id": "pet-<uuid>"
}
```

后续帧：文本块（多次） / 结束 / 控制
```jsonc
{"type":"text","data":"<高兴>今天天气真好"}
{"type":"text","data":"，我们出去玩吧。"}
{"type":"end"}
{"type":"abort"}     // 用户打断
{"type":"ping"}      // 心跳
```

### 3.2 服务端 → 客户端

每句先发 `meta` JSON 帧，紧跟一个 WAV 二进制帧：
```jsonc
{"type":"meta","sentence_index":0,"text":"今天天气真好。","emotion":"高兴","sample_rate":24000,"format":"wav","duration_ms":1800}
<binary frame: wav bytes>
{"type":"meta","sentence_index":1,"text":"我们出去玩吧。","emotion":"高兴",...}
<binary frame: wav bytes>
{"type":"end"}
{"type":"aborted"}    // 收到 abort 后回应
{"type":"pong"}
{"type":"error","message":"..."}
```

序列约束：
- `begin` 必须先于任何 `text`
- `meta` 与其对应的 binary 帧必须连续，期间不会插入其他帧
- 服务端无并发同 session 合成；同 client_id 第二次 `begin` 视为新会话，旧会话 abort

## 4. 服务端

### 4.1 模块结构

```
cosyvoice_tts_server/
├── server.py              # FastAPI app + /ws/tts endpoint
├── parser.py              # EmotionParser, SentenceBuffer
├── engine.py              # TTSEngine 包装 CosyVoice + 加载 spk_id→prompt_wav 表
├── audio.py               # WAV 编码工具
└── tests/
    ├── test_parser.py
    └── test_engine_smoke.py
```

### 4.2 EmotionParser

跨 chunk 状态机。逐字符消费输入，输出 `(emotion, plain_text_segment)` 流。

状态：
- `NORMAL`：普通文本
- `IN_TAG`：遇到 `<` 进入，累积标签名直到 `>`

行为：
- 标签作用域：从 `>` 之后到下一个标签出现为止；内置默认 `None`
- 标签字符（`<…>`）从最终输出中剥除
- 嵌套不支持，遇到二次 `<` 视为标签内文字（保留并报警）

接口：
```python
parser = EmotionParser()
for piece in parser.feed(chunk):     # piece = (emotion: Optional[str], text: str)
    ...
parser.flush()                       # 文本结尾收尾
```

### 4.3 SentenceBuffer

输入：`(emotion, text)` 段流。输出：完整句子 `(emotion, sentence)`。

切句规则：
- 终止符：`。！？.!?\n`
- 兜底：自最近 sentence 边界 800ms 还没满足终止符 → 强制 flush
- 句子内可包含多个 emotion 段：以 sentence 内**首个** emotion 为准；后续段如果 emotion 切换，立即在切换处切句（保证一句一情绪）

接口：
```python
buffer = SentenceBuffer(max_buf_ms=800)
async for sentence, emotion in buffer.feed(piece):
    yield sentence, emotion
async for sentence, emotion in buffer.flush():
    yield sentence, emotion
```

### 4.4 TTSEngine

启动时一次性加载：
- CosyVoice3 model（GPU）
- `spk_id → prompt_wav 路径` 字典（解析 `slicer_opt.list`）

合成单句：
- `emotion is None` → `inference_zero_shot(text, '', '', zero_shot_spk_id=spk)`
- `emotion is not None` → `inference_instruct2(text, instruct, prompt_wav)`，其中
  `instruct = f'请用{emotion}的语气说<|endofprompt|>'`，`prompt_wav` 由 spk_id 反查

模型只加载一次，全进程共享；同一时刻只跑一个 inference（asyncio Lock 串行化），避免
显存碎片和 CUDA stream 抢占。多 session 并发以 FIFO 排队。

### 4.5 WS 处理流程

```python
async def ws_tts(websocket):
    await websocket.accept()
    session = None
    try:
        async for msg in iter_messages(websocket):
            if msg['type'] == 'begin':
                session = Session(spk=msg['spk'], format=msg.get('format','wav'))
                continue
            if not session: raise ProtocolError(...)
            if msg['type'] == 'text':
                async for sentence, emotion in session.feed(msg['data']):
                    wav_bytes = await engine.synth(sentence, emotion, session.spk)
                    await send_meta_and_wav(websocket, sentence, emotion, wav_bytes, ...)
            elif msg['type'] == 'end':
                async for sentence, emotion in session.flush():
                    ...
                await websocket.send_json({"type": "end"})
                session = None
            elif msg['type'] == 'abort':
                session.abort()
                await websocket.send_json({"type": "aborted"})
            elif msg['type'] == 'ping':
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        if session: session.abort()
```

## 5. 客户端

### 5.1 新文件

- `src/renderer/src/services/speechProviders/cosyvoiceSpeechProvider.js`
- `src/renderer/src/services/speechProviders/cosyvoiceSpeechProvider.test.js`
- `src/renderer/src/composables/useTtsStream.js`（AudioPlayQueue + AudioContext 管理）

### 5.2 Provider 接口扩展

兼容现有 `{id, label, canSpeak, synthesize, speak}` 接口的同时新增：
```js
createStream({ spk, onAudio, onError, onEnd, onAborted })
  → { appendText(chunk), end(), abort() }
```

`onAudio({ buffer, sentence, emotion, index })` 由队列消费者播放。

### 5.3 App.vue 改动

`handleWsMessage`（streaming chunks）：
- 若当前 provider 支持 `createStream`，且本回合还没建 session：
  - 取 `spk` 配置 → `provider.createStream({ spk, onAudio: queue.push, ... })`
- 把 `data.data` 喂给 `session.appendText(data.data)`

`handleWsEnd`：
- 若有 session：`session.end()`，等 `onEnd`/超时
- 若 provider 不支持流式：仍走老的 `provider.speak(replyText, {playAudio})`

`handleSend` / 用户切换皮肤：调 `session.abort()` 并 reset 队列。

### 5.4 SettingsPanel.vue

新增"语音服务"区块：
- 选择 provider：`browser` / `astrbot` / `mimo` / `cosyvoice`
- 当 provider == cosyvoice：
  - WebSocket URL（默认 `ws://localhost:8765/ws/tts`）
  - 说话人 ID（文本输入；后续可改成下拉拉取 server 列表）
- 保存到 `idb-keyval`

## 6. 失败与边界情况

| 场景 | 处理 |
|---|---|
| WebSocket 断开 / 连接失败 | provider `canSpeak=false`，App.vue 触发 fallback 到上一个 provider（browser）|
| 单句合成抛错 | server 发 `error`，客户端跳过该句，继续下一句 |
| 收到 `abort` 时正在合成 | 等当前句完成、不再开新句、清队列 |
| 同 session 第二次 `begin` | 先 `aborted` 旧 session，再开新 |
| 标签未闭合（如 `<高兴`，无 `>`）| 服务端 buffer 累积超 32 字符则按文本回退，`<高兴` 当作普通字符 |
| spk_id 不存在 | server 返回 `error`，客户端 fallback |

## 7. 测试

- `parser.py`：pytest 覆盖
  - 跨 chunk 标签
  - 多情绪切换
  - 句末兜底 flush
  - 嵌套/未闭合
- `engine.py`：smoke（要 GPU），跑 1 句确认 wav 字节非空
- `server.py`：用 `httpx.AsyncClient` + `websockets` 跑端到端，模拟一个 LLM 流，断言收到正确数量 wav 帧
- 客户端：Vitest 用 `WebSocket` mock + 假 `MessageEvent`，断言：
  - `appendText` 序列化为 `text` 帧
  - 收到 binary 后调 `onAudio`
  - `abort` 发 `abort` 帧

## 8. 部署 / 启动

Linux:
```bash
cd /home/asahi/workspace/cosyvoice/CosyVoice
source ~/miniconda3/etc/profile.d/conda.sh && conda activate cosyvoice
pip install fastapi uvicorn[standard] websockets    # 仅首次
python -m cosyvoice_tts_server.server --host 0.0.0.0 --port 8765
```

Windows:
- SettingsPanel 填 `ws://<linux-lan-ip>:8765/ws/tts`，spk_id `0000040.wav_..._0000171840`
- 正常发消息，桌宠应在 ~600ms 后开始说话

## 9. 后续可能（不在本期）

- TRT/fp16 加速（已确认可降首包到 ~400ms）
- 双工流（CosyVoice text generator + stream=True，理论可降首包至 ~200ms）
- 按句 cross-fade（消除句间小停顿）
- 跨网络（Tailscale / 公网），加 token 鉴权
- 在线 enroll / 通过 UI 上传新 prompt 即用
