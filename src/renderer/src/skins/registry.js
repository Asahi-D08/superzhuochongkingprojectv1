import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'
import zhenhongChangfu from './zhenhong-changfu/index.js'

const STORAGE_KEY = 'desktop-pet-skin'

const allSkins = [zhenhongChangfu]

const currentSkin = ref(allSkins[0])

export function useSkinManager() {
  async function load() {
    const savedId = await get(STORAGE_KEY)
    if (savedId) {
      const found = allSkins.find(s => s.id === savedId)
      if (found) currentSkin.value = found
    }
  }

  async function switchSkin(id) {
    const found = allSkins.find(s => s.id === id)
    if (found) {
      currentSkin.value = found
      await set(STORAGE_KEY, id)
    }
  }

  return {
    skins: readonly(ref(allSkins)),
    currentSkin: readonly(currentSkin),
    switchSkin,
    load
  }
}
