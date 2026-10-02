interface OfficeMenuPopoverProps {
  spaceName: string;
  currentUserRole: string;
  canEditSpace: boolean;
  onCopyInvite: () => void;
  onOpenSettings: () => void;
  onDecorateDesk: () => void;
  onOpenDeskManager: () => void;
  onEditOffice: () => void;
  onGoToLobby: () => void;
  onLeaveOffice: () => void;
}

export function OfficeMenuPopover({
  spaceName,
  currentUserRole,
  canEditSpace,
  onCopyInvite,
  onOpenSettings,
  onDecorateDesk,
  onOpenDeskManager,
  onEditOffice,
  onGoToLobby,
  onLeaveOffice,
}: OfficeMenuPopoverProps) {
  return (
    <div className="office-menu-popover">
      <strong>{spaceName}</strong>
      <span className="office-menu-role">{currentUserRole}</span>
      <button onClick={onCopyInvite}>Invite to office</button>
      <button onClick={onOpenSettings}>Settings</button>
      <button disabled={!canEditSpace} onClick={onDecorateDesk}>Decorate desk</button>
      <button onClick={onOpenDeskManager}>Desk manager</button>
      <button disabled={!canEditSpace} onClick={onEditOffice}>Edit the office</button>
      <button onClick={onGoToLobby}>Go to lobby</button>
      <button className="danger" onClick={onLeaveOffice}>Leave office</button>
    </div>
  );
}
