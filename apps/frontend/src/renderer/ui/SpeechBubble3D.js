import * as THREE from 'three';

export function showSpeechBubble(scene, agentObj, text, duration = 6000) {
  if (!scene || !agentObj) return;

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  // Background box rounded
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  const radius = 12;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(320 - radius, 0);
  ctx.quadraticCurveTo(320, 0, 320, radius);
  ctx.lineTo(320, 96 - radius);
  ctx.quadraticCurveTo(320, 96, 320 - radius, 96);
  ctx.lineTo(radius, 96);
  ctx.quadraticCurveTo(0, 96, 0, 96 - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Color border (based on agent nickname if available or gray)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFB74D';
  ctx.stroke();

  // Text truncated 40 chars
  ctx.fillStyle = '#111';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  const cleanText = text.length > 40 ? text.slice(0, 37) + '...' : text;
  
  // Wrap text in two lines if needed
  if (cleanText.length > 20) {
    const spaceIdx = cleanText.lastIndexOf(' ', 20);
    const splitIdx = spaceIdx > 0 ? spaceIdx : 20;
    ctx.fillText(cleanText.slice(0, splitIdx), 160, 40);
    ctx.fillText(cleanText.slice(splitIdx).trim(), 160, 65);
  } else {
    ctx.fillText(cleanText, 160, 55);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    depthTest: false,
    renderOrder: 100
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(3, 0.9, 1);
  
  // Position above agent
  sprite.position.copy(agentObj.position);
  sprite.position.y += 2.1;

  scene.add(sprite);

  // Auto-remove
  setTimeout(() => {
    scene.remove(sprite);
    sprite.material.dispose();
    sprite.material.map.dispose();
  }, duration);

  return sprite;
}