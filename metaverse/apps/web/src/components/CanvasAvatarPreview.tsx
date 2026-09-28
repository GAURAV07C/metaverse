import { useEffect, useRef } from "react";
import { drawDynamicAvatar } from "../utils/drawAvatar";

interface CanvasAvatarPreviewProps {
  imageUrl: string;
  name: string;
  size?: number;
}

export function CanvasAvatarPreview({ imageUrl, name, size = 64 }: CanvasAvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // If it's a regular image url, draw it as a circle
    if (imageUrl && !imageUrl.startsWith('class:')) {
      const img = new Image();
      if (imageUrl.startsWith('http')) img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();
      };
      return;
    }

    // It's a class based pixel avatar
    // Scale up the drawing so it fits nicely
    const TILE = 28;
    const scale = size / TILE;
    
    ctx.save();
    ctx.scale(scale, scale);
    
    // Draw the avatar at the center of the scaled canvas
    // The drawDynamicAvatar expects x,y as the center bottom of the tile
    drawDynamicAvatar(
      ctx,
      TILE / 2,
      TILE / 2 + 2, // shift down slightly so head is centered
      name, // use name as seed for colors
      name,
      imageUrl,
      false, // not sitting
      { isMoving: false, step: 0, facing: 'down' },
      false
    );

    ctx.restore();
  }, [imageUrl, name, size]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      style={{ display: 'block', margin: '0 auto' }}
      title={name}
    />
  );
}
