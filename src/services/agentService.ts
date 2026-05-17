import { DictionaryEntry, CorrectionRecord } from '../types';

export const AgentService = {
  async logCorrection(pattern: string, replacement: string, type: CorrectionRecord['type']): Promise<CorrectionRecord> {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern, replacement, type })
    });
    const data = await response.json();
    return data;
  },

  async getMemory(): Promise<CorrectionRecord[]> {
    const response = await fetch('/api/memory');
    return response.json();
  },

  async logGroundTruthCorrection(original: any, corrected: any, page?: number): Promise<void> {
    await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original, corrected, page })
    });
  },

  applyGlobalFixes(entries: DictionaryEntry[], memory: CorrectionRecord[]): DictionaryEntry[] {
    return entries.map(entry => {
      let updatedKaren = entry.karen;
      let updatedDefs = [...entry.definitions];
      let wasModified = false;
      let reasons: string[] = [];

      memory.forEach(record => {
        if (record.type === 'headword') {
          const newKaren = updatedKaren.split(record.pattern).join(record.replacement);
          if (newKaren !== updatedKaren) {
            wasModified = true;
            reasons.push(`Auto-corrected headword: '${record.pattern}' -> '${record.replacement}'`);
            updatedKaren = newKaren;
          }
        } else if (record.type === 'definition') {
          const newDefs = updatedDefs.map(def => def.split(record.pattern).join(record.replacement));
          if (JSON.stringify(newDefs) !== JSON.stringify(updatedDefs)) {
            wasModified = true;
            reasons.push(`Auto-corrected definition: '${record.pattern}' -> '${record.replacement}'`);
            updatedDefs = newDefs;
          }
        }
      });

      if (wasModified) {
        const historyRecord = {
          timestamp: Date.now(),
          karen: entry.karen,
          definitions: entry.definitions,
          agentCorrected: true,
          reason: reasons.join('; ')
        };
        return {
          ...entry,
          karen: updatedKaren,
          definitions: updatedDefs,
          history: [...(entry.history || []), historyRecord]
        };
      }

      return entry;
    });
  },

  /**
   * Few-Shot Context Generator
   * Generates a string of past corrections to inject into the Gemini prompt.
   */
  getFewShotContext(): string {
    const memory = this.getMemory();
    if (memory.length === 0) return "";

    const examples = memory.slice(-10).map(m => 
      `- Correction: Replace "${m.pattern}" with "${m.replacement}" in ${m.type} fields.`
    ).join('\n');

    return `
    PAST CORRECTIONS (FEW-SHOT EXAMPLES):
    Use these historical manual corrections as ground truth for this crop:
    ${examples}
    `;
  }
};
