import { allowedHTMLElements } from '~/utils/markdown';
import { stripCommonIndent } from './promptSections';

/** HTML tags that may be used in rendered model responses. */
export const allowedHtmlElementTags = allowedHTMLElements.map((tagName) => `<${tagName}>`).join(', ');

export const codeFormattingInstructions = stripCommonIndent(`
  <code_formatting_info>
    Use 2 spaces for code indentation
  </code_formatting_info>
`);

export const messageFormattingInstructions = stripCommonIndent(`
  <message_formatting_info>
    You can make the output pretty by using only the following available HTML elements: ${allowedHtmlElementTags}
  </message_formatting_info>
`);
