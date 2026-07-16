let annotationMode = false;
let highlightedElement = null;

window.parent.postMessage(
  {
    type: 'agent-review:artifact-ready',
    title: document.title,
    name: 'pranjalagni',
  },
  window.location.origin,
);

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.source !== window.parent) {
    return;
  }

  if (event.data?.type === 'agent-review:set-annotation-mode') {
    annotationMode = event.data.enabled;
    document.body.style.cursor = annotationMode ? 'crosshair' : '';

    if (!annotationMode) {
      clearHighlight();
    }
  }
});

document.addEventListener(
  'mouseover',
  (event) => {
    if (!annotationMode) {
      return;
    }

    clearHighlight();

    highlightedElement = event.target;
    highlightedElement.style.outline = '2px solid #7c3aed';
    highlightedElement.style.outlineOffset = '2px';
  },
  true,
);

document.addEventListener(
  'click',
  (event) => {
    if (!annotationMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;
    const selector = createSelector(element);
    const matchedElement = document.querySelector(selector);

    if (matchedElement !== element) {
      console.warn('Generated selector did not resolve correctly', {
        selector,
        expected: element,
        actual: matchedElement,
      });
    }

    window.parent.postMessage(
      {
        type: 'agent-review:element-selected',
        target: {
          selector,
          tagName: element.tagName.toLowerCase(),
          text: element.textContent.trim().slice(0, 200),
        },
      },
      window.location.origin,
    );
  },
  true,
);

function clearHighlight() {
  if (!highlightedElement) {
    return;
  }

  highlightedElement.style.outline = '';
  highlightedElement.style.outlineOffset = '';
  highlightedElement = null;
}

function createSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const parts = [];
  let current = element;

  while (
    current &&
    current.nodeType === Node.ELEMENT_NODE &&
    current !== document.body
  ) {
    let part = current.tagName.toLowerCase();

    const parent = current.parentElement;

    if (parent) {
      const sameTagSiblings = [...parent.children].filter(
        (sibling) => sibling.tagName === current.tagName,
      );

      if (sameTagSiblings.length > 1) {
        const position = sameTagSiblings.indexOf(current) + 1;

        part += `:nth-of-type(${position})`;
      }
    }

    parts.unshift(part);

    if (current.parentElement?.id) {
      parts.unshift(`#${CSS.escape(current.parentElement.id)}`);
      break;
    }

    current = current.parentElement;
  }

  return parts.join(' > ');
}
