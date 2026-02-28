<template>
  <div class="markdown-body" v-html="renderedHtml"></div>
</template>

<script>
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(md) {
  if (!md) return ''
  let html = escapeHtml(md)

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return '<pre><code class="lang-' + lang + '">' + code.trim() + '</code></pre>'
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'
  html = html.replace(/<p>\s*<(h[1-4]|ul|pre|blockquote|hr)/g, '<$1')
  html = html.replace(/<\/(h[1-4]|ul|pre|blockquote)>\s*<\/p>/g, '</$1>')
  html = html.replace(/<p>\s*<hr>\s*<\/p>/g, '<hr>')
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

export default {
  name: 'MarkdownRenderer',
  props: {
    content: { type: String, default: '' }
  },
  computed: {
    renderedHtml() {
      return renderMarkdown(this.content)
    }
  }
}
</script>

<style scoped>
.markdown-body {
  color: #333;
  line-height: 1.7;
  word-break: break-word;
}

.markdown-body :deep(h1) { font-size: 1.6em; margin: 20px 0 10px; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
.markdown-body :deep(h2) { font-size: 1.3em; margin: 18px 0 8px; color: #222; }
.markdown-body :deep(h3) { font-size: 1.15em; margin: 14px 0 6px; color: #333; }
.markdown-body :deep(h4) { font-size: 1em; margin: 12px 0 6px; color: #444; }

.markdown-body :deep(p) { margin: 8px 0; }

.markdown-body :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #e11d48;
}

.markdown-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  color: inherit;
  padding: 0;
}

.markdown-body :deep(ul) {
  padding-left: 24px;
  margin: 8px 0;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding: 8px 16px;
  margin: 12px 0;
  background: #eff6ff;
  color: #555;
}

.markdown-body :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 20px 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}
</style>
