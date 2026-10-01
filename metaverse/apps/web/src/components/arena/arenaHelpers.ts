import type { SpaceElement } from './ElementsPanel';

export const normalizeAssetUrl = (url?: string | null) => {
  if (!url || url.startsWith('class:') || url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')) return url ?? null;
  return `/${url}`;
};

export const getElementInteraction = (el: SpaceElement) => {
  const configured = el.element.interactiveObjects?.[0];
  const text = `${el.element.name ?? ''} ${el.element.category ?? ''} ${el.element.id ?? ''}`.toLowerCase();
  const isLikelyInteractive =
    Boolean(configured) ||
    text.includes('whiteboard') ||
    text.includes('screen') ||
    text.includes('terminal') ||
    text.includes('arcade') ||
    text.includes('game') ||
    text.includes('interactive') ||
    text.includes('smart');

  if (!isLikelyInteractive) return null;

  const type =
    configured?.type ||
    (text.includes('whiteboard') ? 'WHITEBOARD' :
      text.includes('screen') ? 'SCREENSHARE' :
      text.includes('arcade') || text.includes('game') ? 'GAME' :
      'INFO');

  const state = configured?.state || {};
  return {
    id: configured?.id || el.id,
    elementId: el.element.id,
    name: el.element.name || 'Interactive object',
    type,
    state,
    url: state?.url,
    x: el.x,
    y: el.y,
  };
};
