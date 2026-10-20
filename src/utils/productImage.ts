export function getProductImageUrl(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl?.trim()) return null

  try {
    const parsedUrl = new URL(imageUrl)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? imageUrl
      : null
  } catch {
    return null
  }
}

export function shouldDisplayProductImage(
  imageUrl: string | null,
  failedImageUrl: string | undefined,
): boolean {
  return imageUrl !== null && imageUrl !== failedImageUrl
}
