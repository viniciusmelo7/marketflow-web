import gamingHeadsetImage from '../assets/gaming-headset-framed.png'
import gamingPcImage from '../assets/gaming-pc-framed.jpg'
import mechanicalKeyboardImage from '../assets/mechanical-keyboard-framed.jpg'
import gamingChairImage from '../assets/gaming-chair-landscape.jpg'
import gamingMouseImage from '../assets/mouse-gamer-pro.jpg'
import { getProductImageUrl } from './productImage'
import {
  resolveCartProductImageKey,
  resolveLocalProductImageKey,
} from './productImageMapping'

const localProductImages = {
  'gaming-chair': gamingChairImage,
  'gaming-headset': gamingHeadsetImage,
  'gaming-pc': gamingPcImage,
  'mechanical-keyboard': mechanicalKeyboardImage,
  'gaming-mouse': gamingMouseImage,
}

export type ProductImageSource = {
  url: string | null
  sourcePath: string | null
}

export function resolveProductImage(
  imageUrl: string | null | undefined,
  productName?: string,
): ProductImageSource {
  const validImageUrl = getProductImageUrl(imageUrl)
  const sourcePath = validImageUrl ? new URL(validImageUrl).pathname : null
  const imageKey = resolveLocalProductImageKey(imageUrl, productName)

  return {
    url: imageKey ? localProductImages[imageKey] : validImageUrl,
    sourcePath,
  }
}

export function resolveCartProductImage(
  imageUrl: string | null | undefined,
  productName: string,
): ProductImageSource {
  const imageKey = resolveCartProductImageKey(imageUrl, productName)
  if (!imageKey) return resolveProductImage(imageUrl, productName)

  const validImageUrl = getProductImageUrl(imageUrl)
  const sourcePath =
    imageKey === 'gaming-mouse'
      ? '/photo-1527814050087-3793815479db'
      : validImageUrl
        ? new URL(validImageUrl).pathname
        : null

  return { url: localProductImages[imageKey], sourcePath }
}
