import { useState } from 'react';

export function useInviteLinks() {
  const [copied, setCopied] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopied(false));
  };

  const buildRoomUrl = (roomId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  };

  const handleCopyRoomLink = (roomId: string) => {
    navigator.clipboard.writeText(buildRoomUrl(roomId)).then(() => {
      setCopiedRoomId(roomId);
      window.setTimeout(() => setCopiedRoomId(null), 2000);
    }).catch(() => setCopiedRoomId(null));
  };

  return {
    copied,
    copiedRoomId,
    buildRoomUrl,
    handleCopyInvite,
    handleCopyRoomLink,
  };
}
