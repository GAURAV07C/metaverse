import type React from 'react';
import { ElementsPanel } from './ElementsPanel';
import { SettingsModal } from './SettingsModal';

interface ArenaPanelsProps {
  elementsPanel: React.ComponentProps<typeof ElementsPanel>;
  settingsModal: React.ComponentProps<typeof SettingsModal>;
}

export function ArenaPanels({ elementsPanel, settingsModal }: ArenaPanelsProps) {
  return (
    <>
      <ElementsPanel {...elementsPanel} />
      <SettingsModal {...settingsModal} />
    </>
  );
}
