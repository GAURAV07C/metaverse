import type React from 'react';
import { OfficeMenuPopover } from './OfficeMenuPopover';
import { Sidebar } from './Sidebar';
import { SpaceRail } from './SpaceRail';

interface ArenaChromeProps {
  spaceRail: React.ComponentProps<typeof SpaceRail>;
  officeMenu: React.ComponentProps<typeof OfficeMenuPopover> & { open: boolean };
  sidebar: React.ComponentProps<typeof Sidebar>;
}

export function ArenaChrome({ spaceRail, officeMenu, sidebar }: ArenaChromeProps) {
  const { open, ...officeMenuProps } = officeMenu;

  return (
    <>
      <SpaceRail {...spaceRail} />
      {open && <OfficeMenuPopover {...officeMenuProps} />}
      <Sidebar {...sidebar} />
    </>
  );
}
