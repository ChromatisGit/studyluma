export async function tryCatch<T>(
  promise: Promise<T>,
  onError: (e: unknown) => void = console.error
): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    onError(error)
    return null
  }
}
