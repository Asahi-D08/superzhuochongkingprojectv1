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

        <div class="setting-item setting-toggle">
          <div class="setting-label">
            <span>启用语音</span>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="voiceEnabled"
                @change="setVoiceEnabled($event.target.checked)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-hint">
            使用系统自带日语语音朗读回复，无需联网。
          </div>
        </div>
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
  voiceEnabled,
  setCharacterSize,
  setTextBoxHeight,
  setVoiceEnabled,
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
  width: 240px;
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

.setting-toggle .setting-label {
  margin-bottom: 4px;
}
.setting-hint {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}
.toggle {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background-color: #ddd;
  border-radius: 18px;
  transition: 0.2s;
  cursor: pointer;
}
.toggle-slider::before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  top: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.toggle input:checked + .toggle-slider {
  background-color: #6A5ACD;
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(16px);
}
</style>
