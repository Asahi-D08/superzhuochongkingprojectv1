# 皮肤系统重构设计

## 目标

1. 将"视觉渲染"与"交互逻辑"彻底分离
2. 建立可插拔的皮肤系统，支持运行时切换
3. 消除状态组件间的代码重复，简化架构

## 核心架构

```
App.vue
├── <component :is="currentSkin.component" :state="currentState" />
└── <InteractionLayer :state="currentState" ... />
```

- **皮肤组件**：只负责视觉（图片、动画），接收 `state` prop
- **InteractionLayer**：只负责 UI 交互（登录、聊天、消息输出），根据 state 切换

## 皮肤接口

每个皮肤导出：

```js
{
  id: 'book-character',
  name: '书本角色',
  component: BookCharacterSkin  // Vue 组件
}
```

皮肤组件 props：

```js
{ state: 'idle' | 'standby' | 'speaking' }
```

皮肤组件只渲染视觉效果，不包含任何交互 UI。

## useSkinManager composable

```js
export function useSkinManager() {
  return {
    skins,              // ref<Skin[]> 所有已注册皮肤
    currentSkin,        // ref<Skin> 当前皮肤
    switchSkin(id),     // 切换皮肤并持久化到 IndexedDB
  }
}
```

## 皮肤切换入口

- STANDBY 状态下右键菜单增加"切换皮肤"选项（复用 contextmenu）
- SkinSwitcher 组件以 overlay 形式展示可选皮肤列表

## 文件结构

```
src/renderer/src/
  App.vue
  skins/
    registry.js                    # 皮肤注册 + useSkinManager()
    book-character/
      index.js                     # { id, name, component }
      BookCharacterSkin.vue
      assets/
        book-closed.png
        book-open.png
        character.png
  components/
    InteractionLayer.vue           # 根据 state 渲染对应 UI
    LoginForm.vue
    ChatInput.vue
    ChatHistory.vue
    MessageOutput.vue
    SkinSwitcher.vue
  composables/
    useStateMachine.js
    useAstrBotApi.js
    useChatHistory.js
```

## 删除

- `components/IdleState.vue`
- `components/StandbyState.vue`
- `components/SpeakingState.vue`
- `config/assets.config.js`

## 添加新皮肤的步骤

1. 在 `skins/` 下创建文件夹
2. 写一个 Vue 组件，接收 `{ state }` prop
3. 导出 `{ id, name, component }`
4. 在 `registry.js` 中导入注册
