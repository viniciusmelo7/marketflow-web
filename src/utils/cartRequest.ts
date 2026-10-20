export async function runCartRequest<T>(
  request: () => Promise<T>,
  onSettled: () => void,
): Promise<T> {
  try {
    return await request()
  } finally {
    onSettled()
  }
}
