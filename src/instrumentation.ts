export async function register() {
  // Runs once on server startup in Next.js (Node runtime)
  try {
    const { startBackgroundSSE, getBackgroundSSEStatus } = await import('@/lib/background-sse');
    const status = getBackgroundSSEStatus();
    if (!status?.isRunning) {
      console.log('🛠️ instrumentation: starting background SSE at boot');
      await startBackgroundSSE();
    } else {
      console.log('🛠️ instrumentation: background SSE already running');
    }
  } catch (e) {
    console.error('🛠️ instrumentation: failed to start background SSE', e);
  }
}
