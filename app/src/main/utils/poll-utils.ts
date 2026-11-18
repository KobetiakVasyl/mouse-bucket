// Asks a question again and again until the answer is yes or the attempts run out. See docs/ENVIRONMENTS.md.
export async function pollUntil(
  check: () => Promise<boolean>,
  attempts: number,
  delayMs: number
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}
