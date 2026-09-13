/** Removes the common source-code indentation from a prompt template without trimming content indentation. */
export const stripCommonIndent = (value: string): string => {
  const lines = value
    .replace(/^\n/, '')
    .replace(/\n\s*$/, '')
    .split('\n');
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const commonIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(commonIndent)).join('\n');
};
