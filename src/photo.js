const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_DIMENSION = 480

export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.'
  if (file.size > MAX_FILE_BYTES) return 'That image is larger than 10 MB. Choose a smaller one.'
  return ''
}

// Shrinks the photo so many of them fit in browser storage.
export async function compressImage(file, maxDimension = MAX_DIMENSION) {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    throw new Error('That image could not be read. Try a different one.')
  }
}
