export function drawDynamicAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  userId: string,
  username: string,
  url: string | undefined,
  isSitting: boolean,
  anim: { isMoving: boolean; step: number; facing: 'down' | 'up' | 'left' | 'right' },
  isMe: boolean
) {
  const avatarClass = url?.startsWith('class:') ? url.split(':')[1] : 'casual';

  const shirtColors = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444'];
  const hairColors = ['#1e293b', '#78350f', '#451a03', '#111827', '#b45309', '#fcd34d', '#94a3b8'];
  const skinColors = ['#fcd34d', '#fed7aa', '#f59e0b', '#d97706', '#8b5cf6', '#451a03']; // Added a few more skin tones

  const charHash = Math.abs((userId || username || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const shirtColor = isMe ? '#3b82f6' : shirtColors[charHash % shirtColors.length];
  const hairColor = hairColors[charHash % hairColors.length];
  const skinColor = skinColors[charHash % skinColors.length];

  ctx.save();

  // Shadow at feet
  if (!isSitting) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Animation offsets
  const bob = (anim.isMoving && !isSitting) ? (anim.step % 2 === 0 ? -2 : 0) : 0;
  const legStep = (anim.isMoving && !isSitting) ? (anim.step % 2 === 0 ? 3 : -3) : 0;
  const centerY = isSitting ? y + 4 : y - 2 + bob;

  // Function to draw standard head and hair to avoid repetition
  const drawHead = (customHair?: string) => {
    // Neck/Base
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(x, centerY - 11, 7.5, 0, Math.PI * 2); ctx.fill();

    // Eyes
    if (anim.facing !== 'up') {
      ctx.fillStyle = '#0f172a';
      if (anim.facing === 'down') { ctx.fillRect(x - 3, centerY - 12, 2, 2.5); ctx.fillRect(x + 1, centerY - 12, 2, 2.5); }
      else if (anim.facing === 'left') { ctx.fillRect(x - 4, centerY - 12, 2, 2.5); }
      else if (anim.facing === 'right') { ctx.fillRect(x + 2, centerY - 12, 2, 2.5); }
    }

    // Hair
    ctx.fillStyle = customHair || hairColor;
    if (anim.facing === 'up') {
      ctx.beginPath(); ctx.arc(x, centerY - 12, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, centerY - 14, 8, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 7.5, centerY - 16, 15, 5); // Bangs
    }
  };

  // ---------------------------------------------------------
  // CLASS: SUIT (CEO / Executive)
  // ---------------------------------------------------------
  if (avatarClass === 'suit') {
    // Legs (Dark Slacks)
    if (!isSitting) {
      ctx.fillStyle = '#1e293b'; 
      ctx.fillRect(x - 5 + (anim.facing === 'left' ? -legStep : 0), centerY + 4, 4, 7);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 4, 4, 7);
      ctx.fillStyle = '#000000'; // Black Dress Shoes
      ctx.fillRect(x - 6 + (anim.facing === 'left' ? -legStep : 0), centerY + 9, 5, 3);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 9, 5, 3);
    }
    // Torso (Dark Blazer over White Shirt)
    ctx.fillStyle = '#0f172a'; // Blazer
    ctx.beginPath(); ctx.roundRect(x - 7, centerY - 5, 14, 10, 2); ctx.fill();
    
    // White Shirt & Tie (only visible from front)
    if (anim.facing === 'down') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, centerY - 5, 4, 9);
      ctx.fillStyle = '#ef4444'; // Red Tie
      ctx.fillRect(x - 1, centerY - 3, 2, 6);
    }
    
    // Arms (Blazer Sleeves)
    ctx.fillStyle = '#0f172a';
    if (anim.facing === 'left') { ctx.fillRect(x - 8, centerY - 2, 4, 6); ctx.fillStyle=skinColor; ctx.fillRect(x-8, centerY+4, 3,2); }
    else if (anim.facing === 'right') { ctx.fillRect(x + 4, centerY - 2, 4, 6); ctx.fillStyle=skinColor; ctx.fillRect(x+5, centerY+4, 3,2); }
    else { 
      ctx.fillRect(x - 9, centerY - 2, 3, 6); ctx.fillRect(x + 6, centerY - 2, 3, 6); 
      ctx.fillStyle=skinColor; ctx.fillRect(x-9, centerY+4, 3,2); ctx.fillRect(x+6, centerY+4, 3,2);
    }

    drawHead();
  }

  // ---------------------------------------------------------
  // CLASS: HOODIE (Software Engineer)
  // ---------------------------------------------------------
  else if (avatarClass === 'hoodie') {
    // Legs (Blue Jeans)
    if (!isSitting) {
      ctx.fillStyle = '#3b82f6'; 
      ctx.fillRect(x - 5 + (anim.facing === 'left' ? -legStep : 0), centerY + 4, 4, 7);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 4, 4, 7);
      ctx.fillStyle = '#ffffff'; // White Sneakers
      ctx.fillRect(x - 6 + (anim.facing === 'left' ? -legStep : 0), centerY + 9, 5, 3);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 9, 5, 3);
    }
    // Torso (Grey Hoodie)
    const hoodieColor = '#64748b';
    ctx.fillStyle = hoodieColor; 
    ctx.beginPath(); ctx.roundRect(x - 8, centerY - 5, 16, 11, 4); ctx.fill();
    
    // Hoodie strings (front)
    if (anim.facing === 'down') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x - 3, centerY - 2, 1, 4);
      ctx.fillRect(x + 2, centerY - 2, 1, 4);
      // Pocket
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.roundRect(x - 4, centerY + 2, 8, 3, 1); ctx.fill();
    }
    
    // Arms (Hoodie Sleeves)
    ctx.fillStyle = hoodieColor;
    if (anim.facing === 'left') { ctx.fillRect(x - 9, centerY - 2, 4, 6); }
    else if (anim.facing === 'right') { ctx.fillRect(x + 5, centerY - 2, 4, 6); }
    else { ctx.fillRect(x - 10, centerY - 2, 4, 6); ctx.fillRect(x + 6, centerY - 2, 4, 6); }
    
    // Hands
    ctx.fillStyle=skinColor;
    if (anim.facing === 'left') { ctx.fillRect(x-9, centerY+4, 3,2); }
    else if (anim.facing === 'right') { ctx.fillRect(x+6, centerY+4, 3,2); }
    else { ctx.fillRect(x-10, centerY+4, 3,2); ctx.fillRect(x+7, centerY+4, 3,2); }

    // Head
    drawHead();
    
    // Hood on back
    if (anim.facing === 'up') {
      ctx.fillStyle = hoodieColor;
      ctx.beginPath(); ctx.arc(x, centerY - 10, 8.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------------------------------------------------------
  // CLASS: TURTLENECK (Designer / Creative)
  // ---------------------------------------------------------
  else if (avatarClass === 'turtleneck') {
    // Legs (Dark Grey Jeans)
    if (!isSitting) {
      ctx.fillStyle = '#334155'; 
      ctx.fillRect(x - 5 + (anim.facing === 'left' ? -legStep : 0), centerY + 4, 4, 7);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 4, 4, 7);
      ctx.fillStyle = '#0f172a'; // Black Shoes
      ctx.fillRect(x - 6 + (anim.facing === 'left' ? -legStep : 0), centerY + 9, 5, 3);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 9, 5, 3);
    }
    // Torso (Black Turtleneck)
    ctx.fillStyle = '#020617'; 
    ctx.beginPath(); ctx.roundRect(x - 7, centerY - 6, 14, 11, 2); ctx.fill(); // slightly higher for neck
    
    // Arms (Long Sleeves)
    ctx.fillStyle = '#020617';
    if (anim.facing === 'left') { ctx.fillRect(x - 8, centerY - 2, 3, 6); ctx.fillStyle=skinColor; ctx.fillRect(x-8, centerY+4, 3,2); }
    else if (anim.facing === 'right') { ctx.fillRect(x + 5, centerY - 2, 3, 6); ctx.fillStyle=skinColor; ctx.fillRect(x+5, centerY+4, 3,2); }
    else { 
      ctx.fillRect(x - 9, centerY - 2, 3, 6); ctx.fillRect(x + 6, centerY - 2, 3, 6); 
      ctx.fillStyle=skinColor; ctx.fillRect(x-9, centerY+4, 3,2); ctx.fillRect(x+6, centerY+4, 3,2);
    }

    drawHead();
    
    // Stylish Glasses (front)
    if (anim.facing === 'down') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 5, centerY - 13, 4, 3); // left lens
      ctx.fillRect(x + 1, centerY - 13, 4, 3); // right lens
      ctx.fillRect(x - 1, centerY - 12, 2, 1); // bridge
    } else if (anim.facing === 'left') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 6, centerY - 13, 4, 3);
      ctx.fillRect(x - 2, centerY - 12, 4, 1); // temple
    } else if (anim.facing === 'right') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 2, centerY - 13, 4, 3);
      ctx.fillRect(x - 2, centerY - 12, 4, 1); // temple
    }
  }

  // ---------------------------------------------------------
  // CLASS: BLAZER (Manager / Business Casual)
  // ---------------------------------------------------------
  else if (avatarClass === 'blazer') {
    // Legs (Khaki Pants)
    if (!isSitting) {
      ctx.fillStyle = '#d4d4d8'; // Light slacks
      ctx.fillRect(x - 5 + (anim.facing === 'left' ? -legStep : 0), centerY + 4, 4, 7);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 4, 4, 7);
      ctx.fillStyle = '#78350f'; // Brown Shoes
      ctx.fillRect(x - 6 + (anim.facing === 'left' ? -legStep : 0), centerY + 9, 5, 3);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 9, 5, 3);
    }
    // Torso (Navy Blazer over Light Shirt)
    ctx.fillStyle = '#1e3a8a'; // Navy Blazer
    ctx.beginPath(); ctx.roundRect(x - 7, centerY - 5, 14, 10, 2); ctx.fill();
    
    // Light Blue Shirt (front)
    if (anim.facing === 'down') {
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x - 2, centerY - 5, 4, 9);
      // Open collar
      ctx.fillStyle = skinColor;
      ctx.fillRect(x - 1, centerY - 5, 2, 2);
    }
    
    // Arms (Blazer Sleeves)
    ctx.fillStyle = '#1e3a8a';
    if (anim.facing === 'left') { ctx.fillRect(x - 8, centerY - 2, 4, 6); ctx.fillStyle=skinColor; ctx.fillRect(x-8, centerY+4, 3,2); }
    else if (anim.facing === 'right') { ctx.fillRect(x + 4, centerY - 2, 4, 6); ctx.fillStyle=skinColor; ctx.fillRect(x+5, centerY+4, 3,2); }
    else { 
      ctx.fillRect(x - 9, centerY - 2, 3, 6); ctx.fillRect(x + 6, centerY - 2, 3, 6); 
      ctx.fillStyle=skinColor; ctx.fillRect(x-9, centerY+4, 3,2); ctx.fillRect(x+6, centerY+4, 3,2);
    }

    drawHead();
  }
  
  // ---------------------------------------------------------
  // CLASS: DRESS (HR / Professional Women)
  // ---------------------------------------------------------
  else if (avatarClass === 'dress') {
    // Legs (Bare/Tights)
    if (!isSitting) {
      ctx.fillStyle = skinColor; 
      ctx.fillRect(x - 3 + (anim.facing === 'left' ? -legStep : 0), centerY + 7, 2, 4);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 7, 2, 4);
      ctx.fillStyle = '#0f172a'; // Black Flats/Heels
      ctx.fillRect(x - 4 + (anim.facing === 'left' ? -legStep : 0), centerY + 10, 4, 2);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 10, 4, 2);
    }
    // Torso (Professional Red or Blue Dress based on hash)
    const dressColor = (charHash % 2 === 0) ? '#e11d48' : '#0284c7';
    ctx.fillStyle = dressColor;
    
    // Skirt part of dress
    if (!isSitting) {
      ctx.beginPath(); ctx.moveTo(x-5, centerY+3); ctx.lineTo(x+5, centerY+3); 
      ctx.lineTo(x+7, centerY+8); ctx.lineTo(x-7, centerY+8); ctx.fill();
    }
    // Top part of dress
    ctx.beginPath(); ctx.roundRect(x - 6, centerY - 5, 12, 9, 2); ctx.fill();
    
    // Belt
    if (anim.facing === 'down') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 6, centerY + 2, 12, 1);
    }
    
    // Arms (Short sleeves)
    ctx.fillStyle = dressColor;
    if (anim.facing === 'left') { ctx.fillRect(x - 7, centerY - 2, 3, 3); ctx.fillStyle=skinColor; ctx.fillRect(x-7, centerY+1, 2,5); }
    else if (anim.facing === 'right') { ctx.fillRect(x + 4, centerY - 2, 3, 3); ctx.fillStyle=skinColor; ctx.fillRect(x+5, centerY+1, 2,5); }
    else { 
      ctx.fillRect(x - 8, centerY - 2, 2, 3); ctx.fillRect(x + 6, centerY - 2, 2, 3); 
      ctx.fillStyle=skinColor; ctx.fillRect(x-8, centerY+1, 2,5); ctx.fillRect(x+6, centerY+1, 2,5);
    }

    drawHead();
  }

  // ---------------------------------------------------------
  // CLASS: CASUAL (DEFAULT)
  // ---------------------------------------------------------
  else {
    // 1. LEGS & SHOES
    if (!isSitting) {
      ctx.fillStyle = '#1e293b'; // Pants
      ctx.fillRect(x - 5 + (anim.facing === 'left' ? -legStep : 0), centerY + 4, 4, 7);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 4, 4, 7);
      ctx.fillStyle = '#ffffff'; // White Sneakers
      ctx.fillRect(x - 6 + (anim.facing === 'left' ? -legStep : 0), centerY + 9, 5, 3);
      ctx.fillRect(x + 1 + (anim.facing === 'right' ? legStep : 0), centerY + 9, 5, 3);
    }
    // 2. SHIRT / TORSO
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.roundRect(x - 7, centerY - 5, 14, 10, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; // Collar detail
    ctx.fillRect(x - 2, centerY - 5, 4, 3);
    
    // Arms
    ctx.fillStyle = skinColor;
    if (anim.facing === 'left') ctx.fillRect(x - 8, centerY - 2, 3, 6);
    else if (anim.facing === 'right') ctx.fillRect(x + 5, centerY - 2, 3, 6);
    else { ctx.fillRect(x - 9, centerY - 2, 3, 6); ctx.fillRect(x + 6, centerY - 2, 3, 6); }
    
    // 3. HEAD & FACE
    drawHead();
  }

  ctx.restore();
}
