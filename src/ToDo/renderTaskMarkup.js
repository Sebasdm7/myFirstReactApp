const hasWindow = typeof window !== "undefined" && typeof document !== "undefined";

const escapeHtml = (unsafe = "") =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ALLOWED_TAGS = new Set([
  "strong",
  "b",
  "em",
  "i",
  "u",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "blockquote",
  "a",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
]);

const ALLOWED_ATTRIBUTES = {
  a: new Set(["href", "title"]),
  span: new Set([]),
  code: new Set([]),
  pre: new Set([]),
};

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

const isSafeHref = (value = "") => {
  try {
    const base =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : "https://example.com";
    const parsed = new URL(value, base);
    return SAFE_LINK_PROTOCOLS.includes(parsed.protocol);
  } catch (_err) {
    return false;
  }
};

const sanitizeFragment = (node) => {
  const childNodes = Array.from(node.childNodes);
  childNodes.forEach((child) => {
    if (child.nodeType === 1) {
      const tagName = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) {
        sanitizeFragment(child);
        const fragment = document.createDocumentFragment();
        while (child.firstChild) {
          fragment.appendChild(child.firstChild);
        }
        child.replaceWith(fragment);
        return;
      }

      const allowedAttributes = ALLOWED_ATTRIBUTES[tagName] ?? new Set();
      Array.from(child.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        if (!allowedAttributes.has(attrName)) {
          child.removeAttribute(attr.name);
          return;
        }

        if (tagName === "a" && attrName === "href") {
          const hrefValue = attr.value.trim();
          if (!isSafeHref(hrefValue)) {
            child.removeAttribute(attr.name);
            return;
          }
          child.setAttribute("rel", "noreferrer noopener");
          child.setAttribute("target", "_blank");
        }
      });

      sanitizeFragment(child);
    } else if (child.nodeType === 8) {
      child.remove();
    }
  });
};

const escapeAttribute = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const applyInlineFormatting = (text) => {
  if (!text) return "";
  let formatted = text;

  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label, href) => `<a href="${escapeAttribute(href)}">${label}</a>`
  );

  formatted = formatted.replace(/`([^`]+)`/g, (_match, codeText) => `<code>${codeText}</code>`);
  formatted = formatted.replace(/(\*\*|__)(.+?)\1/g, (_m, _wrapper, content) => `<strong>${content}</strong>`);
  formatted = formatted.replace(/(\*|_)(?!\s)(.+?)\1/g, (_m, _wrapper, content) => `<em>${content}</em>`);
  return formatted;
};

const markdownToHtml = (rawInput = "") => {
  const escaped = escapeHtml(rawInput);
  const lines = escaped.split(/\r?\n/);
  const htmlChunks = [];
  let paragraphBuffer = [];
  let currentList = null;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join("<br />");
    htmlChunks.push(`<p>${applyInlineFormatting(text)}</p>`);
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (!currentList) return;
    htmlChunks.push(`</${currentList}>`);
    currentList = null;
  };

  const openList = (type) => {
    if (currentList === type) return;
    closeList();
    currentList = type;
    htmlChunks.push(`<${type}>`);
  };

  const addListItem = (content) => {
    htmlChunks.push(`<li>${applyInlineFormatting(content)}</li>`);
  };

  lines.forEach((rawLine) => {
    const line = rawLine;
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      htmlChunks.push(`<h${level}>${applyInlineFormatting(headingMatch[2])}</h${level}>`);
      return;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      closeList();
      htmlChunks.push(`<blockquote>${applyInlineFormatting(blockquoteMatch[1])}</blockquote>`);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      openList("ul");
      addListItem(unorderedMatch[1]);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      openList("ol");
      addListItem(orderedMatch[1]);
      return;
    }

    closeList();
    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  closeList();

  if (!htmlChunks.length && paragraphBuffer.length) {
    const text = paragraphBuffer.join("<br />");
    htmlChunks.push(`<p>${applyInlineFormatting(text)}</p>`);
  }

  return htmlChunks.join("");
};

export const renderTaskMarkup = (input = "") => {
  if (!input.trim()) {
    return "";
  }

  const markdownHtml = markdownToHtml(input);

  if (!hasWindow) {
    return markdownHtml;
  }

  const template = document.createElement("template");
  template.innerHTML = markdownHtml;
  sanitizeFragment(template.content);
  return template.innerHTML;
};
