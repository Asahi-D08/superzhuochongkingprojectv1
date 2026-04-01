<template>
  <div class="skin-overlay" @click.self="$emit('close')">
    <div class="skin-panel">
      <div class="skin-header">
        <h3>选择皮肤</h3>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>
      <div class="skin-list">
        <button
          v-for="skin in skins"
          :key="skin.id"
          class="skin-item"
          :class="{ active: currentSkin.id === skin.id }"
          @click="handleSwitch(skin.id)"
        >
          {{ skin.name }}
          <span v-if="currentSkin.id === skin.id" class="check">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSkinManager } from '../skins/registry.js'

const emit = defineEmits(['close'])
const { skins, currentSkin, switchSkin } = useSkinManager()

async function handleSwitch(id) {
  await switchSkin(id)
  emit('close')
}
</script>

<style scoped>
.skin-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  z-index: 100;
}
.skin-panel {
  background: #fff;
  border-radius: 12px;
  width: 240px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.skin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.skin-header h3 {
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
.skin-list {
  padding: 8px 0;
}
.skin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  text-align: left;
}
.skin-item:hover {
  background: #f5f5f5;
}
.skin-item.active {
  color: #6A5ACD;
  font-weight: 600;
}
.check {
  color: #6A5ACD;
}
</style>
