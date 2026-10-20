import { getProductImageUrl } from './productImage.ts'

export type LocalProductImageKey =
  | 'gaming-chair'
  | 'gaming-headset'
  | 'gaming-pc'
  | 'mechanical-keyboard'
  | 'gaming-mouse'

const productImageKeysByPath: Record<string, LocalProductImageKey> = {
  '/photo-1770195483917-b3bb444b7a29': 'gaming-chair',
  '/photo-1679429973860-d430a100db8c': 'gaming-headset',
  '/photo-1658673934022-945726cb89c4': 'gaming-pc',
  '/photo-1562819606-b7a0ebd7e7c5': 'mechanical-keyboard',
}

const productImageKeysByName: Record<string, LocalProductImageKey> = {
  'mouse gamer pro': 'gaming-mouse',
  'cadeira gamer ergonomica': 'gaming-chair',
  'headset gamer': 'gaming-headset',
  'computador gamer de entrada': 'gaming-pc',
  'teclado mecanico': 'mechanical-keyboard',
}

function normalizeProductName(productName: string): string {
  return productName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
}

export function getLocalProductImageKeyByName(
  productName: string | undefined,
): LocalProductImageKey | null {
  if (!productName) return null
  return productImageKeysByName[normalizeProductName(productName)] ?? null
}

/**
 * Resolves known API image paths first. Product-name fallback is used only
 * when the API does not provide a valid HTTP(S) image URL.
 */
export function resolveLocalProductImageKey(
  imageUrl: string | null | undefined,
  productName?: string,
): LocalProductImageKey | null {
  const validImageUrl = getProductImageUrl(imageUrl)

  if (validImageUrl) {
    const sourcePath = new URL(validImageUrl).pathname
    return productImageKeysByPath[sourcePath] ?? null
  }

  return getLocalProductImageKeyByName(productName)
}

/** Uses the bundled approved mouse photo in the cart, avoiding a remote-only request. */
export function resolveCartProductImageKey(
  imageUrl: string | null | undefined,
  productName: string | undefined,
): LocalProductImageKey | null {
  const nameKey = getLocalProductImageKeyByName(productName)

  if (nameKey === 'gaming-mouse') return nameKey
  return resolveLocalProductImageKey(imageUrl, productName)
}
