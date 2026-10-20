const APPROVED_MOUSE_IMAGE_PATH = '/photo-1527814050087-3793815479db'

export function getCartProductImageClass(sourcePath: string | null): string {
  if (sourcePath === APPROVED_MOUSE_IMAGE_PATH) {
    return 'object-cover scale-110'
  }

  return 'object-contain p-1.5'
}
