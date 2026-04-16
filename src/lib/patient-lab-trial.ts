/** Number of complimentary AI lab interpretations for patient accounts */
export const PATIENT_FREE_AI_LAB_INTERPRETATIONS = 3;

export function freeAiInterpretationsRemaining(used: number): number {
  return Math.max(0, PATIENT_FREE_AI_LAB_INTERPRETATIONS - used);
}
