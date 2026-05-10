<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>设置</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-body">
        <div class="setting-item">
          <div class="setting-label">
            <span>角色大小</span>
            <span class="setting-value">{{ characterSize }}px</span>
          </div>
          <input
            type="range"
            :min="100"
            :max="260"
            :step="10"
            :value="characterSize"
            @input="setCharacterSize(+$event.target.value)"
          />
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span>文本框高度</span>
            <span class="setting-value">{{ textBoxHeight }}px</span>
          </div>
          <input
            type="range"
            :min="30"
            :max="150"
            :step="5"
            :value="textBoxHeight"
            @input="setTextBoxHeight(+$event.target.value)"
          />
        </div>

        <div class="setting-section-title">语音合成</div>

        <div class="setting-item">
          <div class="setting-label">
            <span>TTS 来源</span>
          </div>
          <select
            class="setting-select"
            :value="ttsProvider"
            @change="setTtsProvider($event.target.value)"
          >
            <option value="auto">自动（AstrBot / 浏览器）</option>
            <option value="cosyvoice">CosyVoice 本地（局域网）</option>
            <option value="browser">仅浏览器内置</option>
          </select>
        </div>

        <template v-if="ttsProvider === 'cosyvoice'">
          <div class="setting-item">
            <div class="setting-label">
              <span>WebSocket 地址</span>
            </div>
            <input
              type="text"
              class="setting-input"
              :value="cosyWsUrl"
              placeholder="ws://192.168.x.x:8765/ws/tts"
              @change="setCosyWsUrl($event.target.value)"
            />
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span>说话人 ID</span>
            </div>
            <input
              type="text"
              class="setting-input"
              :value="cosySpk"
              placeholder="0000040.wav_0000000000_0000171840"
              @change="setCosySpk($event.target.value)"
            />
            <div class="setting-hint">服务端 spk2info.pt 中已 enroll 的 ID</div>
          </div>
        </template>
      </div>

      <div class="settings-footer">
        <button class="btn-reset" @click="resetDefaults">恢复默认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../composables/useSettings.js'

defineEmits(['close'])
const {
  characterSize,
  textBoxHeight,
  ttsProvider,
  cosyWsUrl,
  cosySpk,
  setCharacterSize,
  setTextBoxHeight,
  setTtsProvider,
  setCosyWsUrl,
  setCosySpk,
  resetDefaults
} = useSettings()
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}
.settings-panel {
  background: #fff;
  border-radius: 12px;
  width: 280px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.settings-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}
.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}

.settings-body {
  padding: 12px 16px;
}
.setting-item {
  margin-bottom: 14px;
}
.setting-item:last-child {
  margin-bottom: 0;
}
.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #555;
}
.setting-value {
  font-variant-numeric: tabular-nums;
  color: #6A5ACD;
  font-weight: 600;
}
.setting-section-title {
  margin: 16px 0 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #888;
  font-weight: 600;
}
.setting-hint {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}

input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e0e0e0;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6A5ACD;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.setting-input,
.setting-select {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  color: #333;
  background: #fff;
}
.setting-input:focus,
.setting-select:focus {
  border-color: #6A5ACD;
}

.settings-footer {
  padding: 8px 16px 12px;
  text-align: center;
}
.btn-reset {
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 5px 14px;
  font-size: 12px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reset:hover {
  border-color: #6A5ACD;
  color: #6A5ACD;
}
</style>
