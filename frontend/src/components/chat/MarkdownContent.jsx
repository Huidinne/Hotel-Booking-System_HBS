import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ChatWindow.module.css';

/**
 * Tokenize and render inline formatting safely into React JSX without dangerouslySetInnerHTML:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Links: [label](url)
 */
function renderInlineContent(text) {
  if (!text) return null;

  // Regex matches: `code`, **bold**, __bold__, *italic*, _italic_, [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[([^\]]+)\]\(([^)]+)\))/g;

  const elements = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Append leading plain text
    if (match.index > lastIndex) {
      elements.push(
        <React.Fragment key={`txt-${keyIndex++}`}>
          {text.substring(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const token = match[0];

    // Inline code `code`
    if (token.startsWith('`') && token.endsWith('`')) {
      elements.push(
        <code key={`code-${keyIndex++}`} className={styles.markdownCode}>
          {token.slice(1, -1)}
        </code>
      );
    }
    // Bold **text** or __text__
    else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      elements.push(
        <strong key={`b-${keyIndex++}`} className={styles.markdownBold}>
          {token.slice(2, -2)}
        </strong>
      );
    }
    // Italic *text* or _text_
    else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      elements.push(
        <em key={`i-${keyIndex++}`} className={styles.markdownItalic}>
          {token.slice(1, -1)}
        </em>
      );
    }
    // Markdown link [label](url)
    else if (token.startsWith('[') && match[2] && match[3]) {
      const label = match[2];
      const rawUrl = match[3].trim();

      // Security check: prohibit javascript: or data: schemes
      const isDangerous = /^javascript:|^data:/i.test(rawUrl);

      if (isDangerous) {
        elements.push(
          <span key={`unsafe-${keyIndex++}`}>{label}</span>
        );
      } else if (rawUrl.startsWith('/') || rawUrl.startsWith('#')) {
        // Internal SPA link via React Router
        elements.push(
          <Link
            key={`link-in-${keyIndex++}`}
            to={rawUrl}
            className={styles.markdownLink}
          >
            {label}
          </Link>
        );
      } else {
        // External link with security attributes
        elements.push(
          <a
            key={`link-ex-${keyIndex++}`}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.markdownLink}
          >
            {label}
          </a>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Append remaining plain text
  if (lastIndex < text.length) {
    elements.push(
      <React.Fragment key={`txt-end-${keyIndex++}`}>
        {text.substring(lastIndex)}
      </React.Fragment>
    );
  }

  return elements.length > 0 ? elements : text;
}

/**
 * Pure React Markdown renderer supporting:
 * - Headings (#, ##, ###, ####)
 * - Ordered lists (1., 2., etc.)
 * - Unordered lists (-, *, •)
 * - Blockquotes (>)
 * - Paragraphs and line breaks
 * - Bold, italic, code, links
 * - 100% free of dangerouslySetInnerHTML (immune to XSS)
 */
export function MarkdownContent({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      flushList();
      blocks.push({ type: 'h4', text: trimmed.slice(5) });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      blocks.push({ type: 'blockquote', text: trimmed.slice(2) });
      continue;
    }

    // Unordered list item (- , * , • )
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list item (1. , 2. )
    const numMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    // Normal paragraph
    flushList();
    blocks.push({ type: 'p', text: rawLine });
  }

  flushList();

  return (
    <div className={styles.markdownBody}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
          case 'h2':
          case 'h3':
            return (
              <h4 key={idx} className={styles.markdownHeading}>
                {renderInlineContent(block.text)}
              </h4>
            );
          case 'h4':
            return (
              <h5 key={idx} className={styles.markdownSubheading}>
                {renderInlineContent(block.text)}
              </h5>
            );
          case 'ul':
            return (
              <ul key={idx} className={styles.markdownUl}>
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className={styles.markdownLi}>
                    {renderInlineContent(item)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className={styles.markdownOl}>
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className={styles.markdownLi}>
                    {renderInlineContent(item)}
                  </li>
                ))}
              </ol>
            );
          case 'blockquote':
            return (
              <blockquote key={idx} className={styles.markdownBlockquote}>
                {renderInlineContent(block.text)}
              </blockquote>
            );
          case 'p':
          default:
            return (
              <p key={idx} className={styles.markdownParagraph}>
                {renderInlineContent(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
