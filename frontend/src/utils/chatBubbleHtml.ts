/**
 * Render chat content as Markdown (GFM), then sanitize HTML for safe v-html.
 * Images, headings, lists, links, code blocks from the bot display correctly.
 */
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Only allow http(s) resources in img/src and a/href */
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'src' && node.nodeName === 'IMG') {
    const v = data.attrValue ?? '';
    if (!/^https:\/\//i.test(v)) {
      data.keepAttr = false;
    }
  }
  if (data.attrName === 'href' && node.nodeName === 'A') {
    const v = data.attrValue ?? '';
    if (!/^https?:\/\//i.test(v)) {
      data.keepAttr = false;
    }
  }
});

export function formatChatBubbleHtml(raw: string): string {
  if (!raw?.trim()) return '';

  const dirty = marked.parse(raw, { async: false });
  let html = dirty.replace(/<img /gi, '<img class="chat-img" loading="lazy" referrerpolicy="no-referrer" ');
  html = html.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ');

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['loading', 'referrerpolicy', 'class', 'target', 'rel', 'colspan', 'rowspan'],
    ADD_TAGS: [
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'blockquote',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
  });
}
