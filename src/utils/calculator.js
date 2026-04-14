/**
 * Calculates the processing times for units in the machine based on the confirmed physics logic.
 * 
 * Logic rules verified with user:
 * 1. Pipeline: 8 internal positions. Pieces enter sequentially, following each other.
 * 2. Mid-cycle point: at half cycle, unit exits and re-enters, adding 1 dead step_time.
 *    Thus, 1 full round = 9 step_times.
 * 3. Batching: if multiple rounds are needed, 1st unit re-enters step 1. Because the machine
 *    can only hold 8 units, pieces 1-8 form a STRICT BATCH. The 9th piece CANNOT enter
 *    until piece 8 has completely exited.
 * 4. Extra steps: Extra steps are taken by each unit. They "stop" the machine. 
 *    This means each piece adds `E` delays to the pieces entering behind it in the batch.
 * 
 * Math formulation:
 * - S = step time in seconds
 * - R = number of rounds
 * - E = extra steps
 * - Batch index `b` = Math.floor((N-1) / 8)
 * - Position in batch `p` = ((N-1) % 8) + 1
 * - Batch Duration `D` = S * (9*R + 8*E + 7)
 * - Batch Start `T_batch` = b * D
 * - Entry Offset `E_N` = T_batch + (p-1)*S
 * - Exit Offset `X_N` = T_batch + (9*R*S) + (p*E*S) + ((p-1)*S)
 */

export function calculateMachineTimes({
  startTime,
  stepTimeSeconds,
  numRounds,
  totalUnits,
  extraStepsPerUnit = 0
}) {
  const results = [];
  const startMs = new Date(startTime).getTime();
  
  const S = Number(stepTimeSeconds);
  const R = Number(numRounds);
  const E = Number(extraStepsPerUnit);
  const total = Number(totalUnits);
  
  const batchDurationSeconds = S * (9 * R + 8 * E + 7);

  for (let idx = 0; idx < total; idx++) {
    const unitNumber = idx + 1;
    const b = Math.floor(idx / 8);
    const p = (idx % 8) + 1;

    const tBatchSec = b * batchDurationSeconds;
    
    // Seconds from the very start of the process
    const entrySec = tBatchSec + (p - 1) * S;
    const exitSec = tBatchSec + (9 * R * S) + (p * E * S) + (p - 1) * S;

    results.push({
      id: unitNumber,
      entryTime: new Date(startMs + entrySec * 1000),
      exitTime: new Date(startMs + exitSec * 1000),
      processingTimeSeconds: exitSec - entrySec,
      batchId: b + 1
    });
  }

  return {
    results,
    summary: {
      firstEntry: results[0]?.entryTime || null,
      lastExit: results.length > 0 ? results[results.length - 1].exitTime : null,
      totalUnits: total,
      totalDurationSeconds: results.length > 0 ? (results[results.length - 1].exitTime.getTime() - startMs) / 1000 : 0
    }
  };
}
