import type React from 'react';
import { ArenaNotifications } from './ArenaNotifications';
import { ArenaRightStack } from './ArenaRightStack';
import { ConnectionBanner } from './ConnectionBanner';
import { InteractionLayer } from './InteractionLayer';
import { SelectedUserCard } from './SelectedUserCard';
import { ShortcutsModal } from './ShortcutsModal';
import { VideoOverlay } from './VideoOverlay';

type ComponentProps<T extends React.ComponentType<any>> = React.ComponentProps<T>;

interface ArenaOverlaysProps {
  connectionBanner: ComponentProps<typeof ConnectionBanner>;
  selectedUserCard: ComponentProps<typeof SelectedUserCard>;
  notifications: ComponentProps<typeof ArenaNotifications>;
  shortcuts: ComponentProps<typeof ShortcutsModal>;
  rightStack: ComponentProps<typeof ArenaRightStack>;
  videoOverlay: ComponentProps<typeof VideoOverlay>;
  interactionLayer: ComponentProps<typeof InteractionLayer>;
  portalPrompt: {
    currentPortal: any;
    activeInteraction: any;
    onUsePortal: () => void;
  };
}

export function ArenaOverlays({
  connectionBanner,
  selectedUserCard,
  notifications,
  shortcuts,
  rightStack,
  videoOverlay,
  interactionLayer,
  portalPrompt,
}: ArenaOverlaysProps) {
  return (
    <>
      <ConnectionBanner {...connectionBanner} />
      <SelectedUserCard {...selectedUserCard} />
      <ArenaNotifications {...notifications} />
      <ShortcutsModal {...shortcuts} />
      <ArenaRightStack {...rightStack} />
      <VideoOverlay {...videoOverlay} />
      <InteractionLayer {...interactionLayer} />

      {portalPrompt.currentPortal && !portalPrompt.activeInteraction && (
        <div className="interaction-prompt portal-prompt">
          <span>
            Press <kbd>X</kbd> to use {portalPrompt.currentPortal.name || 'portal'}
            {portalPrompt.currentPortal.targetRoomId ? ` → ${portalPrompt.currentPortal.targetRoomId}` : ''}
          </span>
          <button type="button" onClick={portalPrompt.onUsePortal}>Use</button>
        </div>
      )}
    </>
  );
}
