/**
 * Calculates the processing times for units in the machine based on the confirmed physics logic.
 * 
 * Logic rules verified with user:
 * 1. Pipeline: 8 internal positions. Pieces enter sequentially, following each other.
 * 2. Mid-cycle point: at half cycle, unit exits and re-enters, adding 1 dead step_time.
 *    Thus, 1 full round = 9 step_times.
 * 3. Batching: if multiple rounds are needed, 1st unit re-enters step 1. Because the machine
 *    can only hold 8 units, pieces 1-8 form a STRICT BATCH. The 9th piece CANNOT enter
 *    until ALL pieces in the batch have completely exited.
 * 4. Extra steps: Extra steps are taken by each unit. They "stop" the machine. 
 *    This means each piece adds `E` delays to the pieces entering behind it in the batch.
 * 5. Exceptions: Specific pieces can have different target rounds. The batch waits for the LAST
 *    piece to finish before clearing.
 * 
 * Math formulation per piece `p` in a batch (1 to 8):
 * - Target rounds for piece `p`: R_p = customRounds[pieceId] || baseRounds
 * - Delays on piece `p`: Sum of E_j for all j in batch where (R_j < R_p) OR (R_j == R_p AND j <= p)
 * - Exit Offset for `p`: X_p = 9 * R_p * S + Delay_p * S + (p - 1) * S
 * - Batch Next Start: max(X_p) for all p in batch
 */

export function calculateMachineTimes({
  startTime,
  stepTimeSeconds,
  numRounds: baseRounds, // This is basic setting
  totalUnits,
  extraStepsPerUnit = 0,
  exceptions = [], // Array of { pieceId: Number, rounds: Number }
  importedPieces = null // Array of { id: String/Number, rounds: Number }
}) {
  const results = [];
  const startMs = new Date(startTime).getTime();
  
  const S = Number(stepTimeSeconds);
  const E = Number(extraStepsPerUnit);
  
  // Build the list of pieces to process
  let piecesList = [];
  if (importedPieces && importedPieces.length > 0) {
    piecesList = importedPieces.map(p => ({
      id: p.id,
      rounds: Number(p.rounds)
    }));
  } else {
    const total = Number(totalUnits);
    const roundsMap = new Map();
    exceptions.forEach(ex => {
      roundsMap.set(Number(ex.pieceId), Number(ex.rounds));
    });
    for (let i = 1; i <= total; i++) {
        piecesList.push({
            id: i,
            rounds: roundsMap.has(i) ? roundsMap.get(i) : Number(baseRounds)
        });
    }
  }

  const numBatches = Math.ceil(piecesList.length / 8);
  let currentBatchStartSec = 0;

  for (let b = 0; b < numBatches; b++) {
    const numPiecesThisBatch = Math.min(8, piecesList.length - b * 8);

    // 1. Gather R_p for all pieces in this batch
    const batchPieces = [];
    for (let p = 1; p <= numPiecesThisBatch; p++) {
      const globalIndex = b * 8 + (p - 1);
      batchPieces.push(piecesList[globalIndex]);
    }

    // 2. Calculate Exit Times and find Max Batch Duration
    let maxBatchExitOffsetSec = 0;

    for (let p_index = 0; p_index < numPiecesThisBatch; p_index++) {
      const p = p_index + 1; // 1-indexed position in batch
      const currentPiece = batchPieces[p_index];
      const R_p = currentPiece.rounds;

      // Calculate total delays from extra steps in this batch
      let totalExtraStepsTakenValidForP = 0;
      for (let j_index = 0; j_index < numPiecesThisBatch; j_index++) {
        const j = j_index + 1;
        const R_j = batchPieces[j_index].rounds;
        
        // Piece j delays piecewise p if j finishes its extra steps BEFORE p exits.
        // If R_j < R_p, j finishes an entire round earlier, so it happens before.
        // If R_j == R_p, they finish on the same round, but j is physically ahead if j <= p.
        if (R_j < R_p || (R_j === R_p && j <= p)) {
          totalExtraStepsTakenValidForP += E;
        }
      }

      const entryOffsetSec = (p - 1) * S;
      const timeInMachineSec = (9 * R_p * S) + (totalExtraStepsTakenValidForP * S);
      
      const exitSec = currentBatchStartSec + entryOffsetSec + timeInMachineSec;
      const entrySec = currentBatchStartSec + entryOffsetSec;

      results.push({
        id: currentPiece.id,
        entryTime: new Date(startMs + entrySec * 1000),
        exitTime: new Date(startMs + exitSec * 1000),
        processingTimeSeconds: exitSec - entrySec,
        batchId: b + 1,
        actualRounds: R_p
      });

      // Track the maximum time the machine is occupied by this batch
      const offsetFromBatchStart = exitSec - currentBatchStartSec;
      if (offsetFromBatchStart > maxBatchExitOffsetSec) {
        maxBatchExitOffsetSec = offsetFromBatchStart;
      }
    }

    // The next batch can only enter when the CURRENT batch has completely vacated the machine.
    currentBatchStartSec += maxBatchExitOffsetSec;
  }

  return {
    results,
    summary: {
      firstEntry: results[0]?.entryTime || null,
      lastExit: results.length > 0 ? results[results.length - 1].exitTime : null,
      totalUnits: piecesList.length,
      totalDurationSeconds: currentBatchStartSec // The maximum time offset from start
    }
  };
}
