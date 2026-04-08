<template>
  <div class="chat-input-container">
    <!-- 图片预览行：仅在有附件时显示 -->
    <div v-if="attachments.length" class="preview-row">
      <div
        v-for="a in attachments"
        :key="a.localId"
        class="preview-item"
        :class="a.status"
      >
        <img :src="a.previewUrl" class="preview-thumb" :alt="a.filename" />
        <!-- 上传中：蒙层 + 转圈 -->
        <div v-if="a.status === 'uploading'" class="preview-mask">
          <div class="spinner" />
        </div>
        <!-- 上传失败：红色 ! -->
        <div v-else-if="a.status === 'failed'" class="preview-mask failed" :title="a.error">
          <span>!</span>
        </div>
        <!-- 删除按钮（永远显示） -->
        <button
          class="preview-remove"
          type="button"
          @click="removeAttachment(a.localId)"
          title="移除"
        >×</button>
      </div>
    </div>

    <textarea
      ref="inputRef"
      v-model="text"
      placeholder="输入消息，可粘贴图片..."
      rows="2"
      @keydown.enter.exact.prevent="send"
      @paste="onPaste"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /**
   * 上传函数，由父组件通过 api.uploadFile 注入。
   * 签名：(blob: Blob | File, filename?: string) => Promise<{ attachment_id, filename, type }>
   */
  uploadFn: { type: Function, required: true }
})

const emit = defineEmits(['send'])

const text = ref('')
const inputRef = ref(null)

/**
 * 附件列表。每一项的形状：
 * {
 *   localId:      string      // 本地唯一 id，用于 :key 和删除
 *   file:         File        // 原始文件，用来读 base64 / 重试上传
 *   previewUrl:   string      // URL.createObjectURL(file) —— 组件卸载前务必 revokeObjectURL
 *   base64:       string      // data URI，异步填充（用来写进历史记录做持久化）
 *   mimeType:     string
 *   filename:     string
 *   attachment_id:string      // 上传成功后由后端返回
 *   status:       'uploading' | 'ok' | 'failed'
 *   error:        string
 * }
 */
const attachments = ref([])

// ─── 粘贴处理 ───────────────────────────────────────────────

/**
 * TODO: 你来实现这个函数 👇
 *
 * 从一个 ClipboardEvent 里提取所有"图片文件"。
 *
 * 为什么把这块留给你：
 *   1. 剪贴板事件里 items 可能混合：纯文本、HTML、图片，甚至多项
 *      （例如从 Word 复制一段带图文字，会同时有 text/plain、text/html、image/png）
 *   2. 不是所有 item 都能拿到 File —— 只有 kind === 'file' 的才能 .getAsFile()
 *      而且 getAsFile() 可能返回 null，要容错
 *   3. 什么算"图片"由你决定：只要 image/*？还是要排除 image/svg+xml（可能含脚本）？
 *      多张图片是否要去重（比如同一张图以 png+jpeg 两种格式都塞进来了）？
 *   4. 这是业务逻辑的起点，后面整个图片管线都依赖它的判断
 *
 * 实现提示：
 *   - event.clipboardData 可能为 null（极少数情况），要判空
 *   - 遍历 event.clipboardData.items（它是 DataTransferItemList，不是数组）
 *   - 对每一项：item.kind === 'file' && item.type.startsWith('image/')
 *   - 用 item.getAsFile() 拿 File；返回 null 时跳过
 *   - 不要在这里 preventDefault —— 调用方根据你返回的结果决定
 *
 * @param {ClipboardEvent} event
 * @returns {File[]} 提取到的所有图片文件；若没有任何图片请返回空数组
 */
function extractImagesFromClipboard(event) {
  const dt = event.clipboardData
  if (!dt || !dt.items) return []

  const files = []
  for (const item of dt.items) {
    // 只要 kind 是 file 且 MIME 以 image/ 开头
    // 排除 svg —— SVG 是可执行文本，塞给 LLM 既无视觉意义又有风险
    if (item.kind !== 'file') continue
    if (!item.type.startsWith('image/')) continue
    if (item.type === 'image/svg+xml') continue

    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

async function onPaste(event) {
  const files = extractImagesFromClipboard(event)
  if (files.length === 0) return // 纯文字粘贴 —— 让浏览器默认行为继续，文本会进 textarea

  // 有图片 —— 阻止浏览器把图片当文本粘进去
  event.preventDefault()

  for (const file of files) {
    // 顺序 await 会让多图时一张张上传，不阻塞 UI 因为每张都是异步的
    // eslint-disable-next-line no-await-in-loop
    await addAttachment(file)
  }
}

// ─── 附件生命周期 ───────────────────────────────────────────────

async function addAttachment(file) {
  const localId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const previewUrl = URL.createObjectURL(file)

  const item = reactive({
    localId,
    file,
    previewUrl,
    base64: '',
    mimeType: file.type || 'image/png',
    filename: file.name && file.name !== 'image.png' ? file.name : `pasted-${localId}.png`,
    attachment_id: '',
    status: 'uploading',
    error: ''
  })
  attachments.value.push(item)

  // 并行：读 base64（供历史记录持久化）
  readAsDataUrl(file)
    .then(b64 => { item.base64 = b64 })
    .catch(() => { /* 读失败不阻塞 —— 当前会话还能用 previewUrl 显示 */ })

  // 上传
  try {
    const res = await props.uploadFn(file, item.filename)
    item.attachment_id = res.attachment_id
    item.status = 'ok'
  } catch (e) {
    item.status = 'failed'
    item.error = e?.message || '上传失败'
  }
}

function removeAttachment(localId) {
  const idx = attachments.value.findIndex(a => a.localId === localId)
  if (idx === -1) return
  const [removed] = attachments.value.splice(idx, 1)
  URL.revokeObjectURL(removed.previewUrl)
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// ─── 发送 ───────────────────────────────────────────────

function send() {
  const msg = text.value.trim()
  // 纯空输入直接忽略
  if (!msg && attachments.value.length === 0) return

  // 有任何图片还在上传 —— 暂不发送（用户可以等一下或 × 掉它再发）
  if (attachments.value.some(a => a.status === 'uploading')) return

  // 上传失败的附件不会被发出去
  const ready = attachments.value.filter(a => a.status === 'ok')

  emit('send', {
    text: msg,
    attachments: ready.map(a => ({
      attachment_id: a.attachment_id,
      base64: a.base64,
      mimeType: a.mimeType,
      filename: a.filename
    }))
  })

  // 清空状态
  text.value = ''
  attachments.value.forEach(a => URL.revokeObjectURL(a.previewUrl))
  attachments.value = []
}

onMounted(() => {
  inputRef.value?.focus()
})

onBeforeUnmount(() => {
  // 泄漏预防：释放所有 blob URL
  attachments.value.forEach(a => URL.revokeObjectURL(a.previewUrl))
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}

/* ─── 预览行 ─── */
.preview-row {
  display: flex;
  gap: 4px;
  padding: 4px 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.preview-row::-webkit-scrollbar {
  height: 3px;
}
.preview-row::-webkit-scrollbar-thumb {
  background: rgba(106, 90, 205, 0.3);
  border-radius: 2px;
}

.preview-item {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(106, 90, 205, 0.3);
}
.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.preview-mask.failed {
  background: rgba(220, 53, 69, 0.7);
  color: #fff;
  font-weight: bold;
  font-size: 16px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-remove {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 2;
}
.preview-remove:hover {
  background: rgba(220, 53, 69, 0.9);
}

/* ─── 原有 textarea 样式保持不变 ─── */
textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(106, 90, 205, 0.3);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  resize: none;
  outline: none;
  background: rgba(255, 255, 255, 0.95);
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
  min-height: 52px;
  max-height: 96px;
  overflow-y: auto;
}
textarea:focus {
  border-color: #6A5ACD;
}
</style>
