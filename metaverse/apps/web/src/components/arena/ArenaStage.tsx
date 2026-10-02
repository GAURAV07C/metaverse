import type React from 'react';
import { ActionToolbar } from './ActionToolbar';
import { ArenaOverlays } from './ArenaOverlays';
import { ArenaPanels } from './ArenaPanels';
import { ArenaTopBar } from './ArenaTopBar';
import { MapCanvas } from './MapCanvas';

interface ArenaStageProps {
  topBar: React.ComponentProps<typeof ArenaTopBar>;
  overlays: React.ComponentProps<typeof ArenaOverlays>;
  mapCanvas: React.ComponentProps<typeof MapCanvas>;
  actionToolbar: React.ComponentProps<typeof ActionToolbar>;
  panels: React.ComponentProps<typeof ArenaPanels>;
}

export function ArenaStage({
  topBar,
  overlays,
  mapCanvas,
  actionToolbar,
  panels,
}: ArenaStageProps) {
  return (
    <>
      <main className="arena-main" aria-label="Space map">
        <ArenaTopBar {...topBar} />
        <ArenaOverlays {...overlays} />
        <MapCanvas {...mapCanvas} />
        <ActionToolbar {...actionToolbar} />
      </main>

      <ArenaPanels {...panels} />
    </>
  );
}
