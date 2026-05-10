// 在前端运行时把图片的"黑色背景"替换成透明。
//
// 适用场景：AI 生成的图带纯黑底（无 alpha 通道），需要在 Electron 透明窗口里
// 看起来"抠了图"。原理：用 canvas 读像素，把亮度低于阈值的像素 alpha 设为 0，
// 阈值附近的像素做软边缘羽化避免锯齿。
//
// threshold: 0-255，值越大被判定为"黑"的范围越宽（默认 32 适合纯黑背景 + JPEG 压缩噪点）

export async function chromaKeyBlackToTransparent(srcUrl, threshold = 32) {
  const img = await loadImage(srcUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = imageData.data
  const softBand = threshold // 羽化区间宽度

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    // 用 max(r,g,b) 而不是简单 luma，纯黑像素更容易被判定
    const luma = Math.max(r, g, b)

    if (luma <= threshold) {
      px[i + 3] = 0
    } else if (luma < threshold + softBand) {
      // 边缘羽化：threshold..threshold+softBand 区间内 alpha 从 0 渐变到原值
      const t = (luma - threshold) / softBand
      px[i + 3] = Math.round(px[i + 3] * t)
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}
