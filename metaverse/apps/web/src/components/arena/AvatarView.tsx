import { CanvasAvatarPreview } from '../CanvasAvatarPreview';

interface AvatarViewProps {
  avatarUrl?: string;
  name: string;
  className?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2);
  return (initials || 'U').toUpperCase();
};

export function AvatarView({ avatarUrl, name, className }: AvatarViewProps) {
  if (!avatarUrl) {
    return <div className={`vid-placeholder vid-placeholder-initials ${className || ''}`}>{getInitials(name)}</div>;
  }

  if (avatarUrl.startsWith('class:')) {
    return (
      <div className={`vid-placeholder vid-placeholder-canvas ${className || ''}`}>
        <CanvasAvatarPreview imageUrl={avatarUrl} name={name} size={48} />
      </div>
    );
  }

  return <img src={avatarUrl} alt="" className={`vid-placeholder-img ${className || ''}`} />;
}
