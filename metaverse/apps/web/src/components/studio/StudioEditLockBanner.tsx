interface StudioEditLockBannerProps {
  onExit: () => void;
}

export function StudioEditLockBanner({ onExit }: StudioEditLockBannerProps) {
  return (
    <div className="studio-edit-lock-banner">
      <span className="studio-edit-lock-icon">!</span>
      <span>No one else can edit or decorate the office until you exit Studio.</span>
      <button onClick={onExit}>Got it</button>
    </div>
  );
}
