<template>
  <div class="speaking-indicator" aria-label="正在说话">
    <span class="bar bar-1"></span>
    <span class="bar bar-2"></span>
    <span class="bar bar-3"></span>
  </div>
</template>

<script setup>
// 纯展示组件：三条竖条波动，配合 isSpeaking 出现/消失。
</script>

<style scoped>
.speaking-indicator {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
  padding: 2px 4px;
  border-radius: 6px;
  background: rgba(106, 90, 205, 0.12);
  pointer-events: none;
}
.bar {
  display: block;
  width: 2px;
  background: #6A5ACD;
  border-radius: 1px;
  animation: speak 0.9s ease-in-out infinite;
}
.bar-1 { animation-delay: 0s; }
.bar-2 { animation-delay: 0.15s; }
.bar-3 { animation-delay: 0.3s; }

@keyframes speak {
  0%, 100% { height: 3px; }
  50%      { height: 10px; }
}
</style>
