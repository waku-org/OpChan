/**
 * Utility to check if a URL loads successfully within a timeout
 */
export async function urlLoads(
  url: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
