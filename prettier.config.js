/** @type {import('prettier').Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  // Markdown uses semantic line breaks: one line per paragraph or list item, never a
  // hard wrap, because the renderer wraps to the viewport anyway. This governs the root
  // documents only; docs/ and template_docs/ are in .prettierignore and hand-formatted.
  proseWrap: 'never',
}
