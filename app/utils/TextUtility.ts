export class TextUtility {
  static HEAD_LINES = 10;
  static TAIL_LINES = 10;
  static MAX_CHARS = 3000;

  /**
   * Truncates a string by keeping the head and tail, informing the user of the truncation.
   */
  /**
   * Graduated truncation with semantic awareness.
   * Attempts to keep Head, Tail, and "Important" middle parts (Errors, TODOs, Signatures).
   */
  static smartTruncate(text: string, level: 'light' | 'medium' | 'heavy' = 'medium'): string {
    const limits = {
      light: 5000,
      medium: 3000,
      heavy: 1000,
    };

    const maxLength = limits[level];

    if (!text || text.length <= maxLength) {
      return text;
    }

    const lines = text.split('\n');
    const headCount = level === 'heavy' ? 5 : 15;
    const tailCount = level === 'heavy' ? 5 : 15;

    const head = lines.slice(0, headCount).join('\n');
    const tail = lines.slice(-tailCount).join('\n');

    // Semantic Middle Sampling: Extract errors, TODOs, and signatures from the "lost" section
    const middleSection = lines.slice(headCount, -tailCount).join('\n');
    const semanticMatches: string[] = [];

    // Simple regex for semantic anchors
    const patterns = [
      /error|failure|exception|bug|todo|fixme/gi,
      /fatal|critical|severe|warn(?:ing)?/gi,
      /^(?:export\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([a-zA-Z0-9_$]+)/gm,
      /if\s*\(.*\)|else|switch|case|try|catch|finally/g,
    ];

    for (const pattern of patterns) {
      const matches = middleSection.match(pattern);

      if (matches) {
        // Keep a unique set of hints
        const uniqueMatches = Array.from(new Set(matches.slice(0, 10)));
        semanticMatches.push(...uniqueMatches);
      }
    }

    const semanticSummary = semanticMatches.length > 0 ? `\n[SEMANTIC HINTS: ${semanticMatches.join(', ')}]\n` : '';

    return `${head}\n\n... [TRUNCATED ${lines.length - (headCount + tailCount)} lines] ...${semanticSummary}\n\n${tail}`;
  }

  static truncate(text: string): string {
    return this.smartTruncate(text, 'medium');
  }
}
