const MAX_BATCH = 1 << 22
const MAX_WARMUP_CALLS = 10000

async function timeBatch(runBatch, k) {
  const start = performance.now()
  await runBatch(k)
  return performance.now() - start
}

/**
 * Warmup → batch-size calibration → N timed samples.
 *
 * `runBatch(k)` executes the workload k times (sync or async). Batching exists
 * only to defeat timer resolution for fast engines; the work per call is
 * identical across engines. Per-call time = batch time / k.
 */
export async function measureWorkload(runBatch, opts) {
  const { samples, warmupMinCalls, warmupMinMs, targetBatchMs } = opts

  let warmupCalls = 0
  const warmupStart = performance.now()
  while (
    (warmupCalls < warmupMinCalls || performance.now() - warmupStart < warmupMinMs) &&
    warmupCalls < MAX_WARMUP_CALLS
  ) {
    await runBatch(1)
    warmupCalls++
  }

  let batchSize = 1
  while (batchSize < MAX_BATCH) {
    const elapsed = await timeBatch(runBatch, batchSize)
    if (elapsed >= targetBatchMs) break
    batchSize *= 2
  }

  const batchesMs = []
  for (let i = 0; i < samples; i++) {
    globalThis.gc?.()
    batchesMs.push(await timeBatch(runBatch, batchSize))
  }

  return {
    warmupCalls,
    batchSize,
    batchesMs,
    perCallMs: batchesMs.map((ms) => ms / batchSize),
  }
}
