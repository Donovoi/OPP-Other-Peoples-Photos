export const FACE_TEMPLATE_ALGORITHM = 'opp-local-dhash-v1';

export async function createTemplateFromVideo(video, canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 160;
  canvas.height = 160;
  const crop = await getFaceCropFromVideo(video);
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, 160, 160);
  const imageData = ctx.getImageData(0, 0, 160, 160);
  return createTemplateFromImageData(imageData);
}

export async function createTemplateFromImageFile(file) {
  if (file.type.startsWith('video/')) return createTemplateFromVideoFile(file);
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(160, 160);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const crop = await getFaceCropFromBitmap(bitmap);
  ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, 160, 160);
  return createTemplateFromImageData(ctx.getImageData(0, 0, 160, 160));
}

export async function createTemplateFromVideoFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await once(video, 'loadedmetadata');
    video.currentTime = Math.min(1, Math.max(0, video.duration / 3 || 0));
    await once(video, 'seeked');
    const canvas = new OffscreenCanvas(160, 160);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const crop = await getFaceCropFromVideo(video);
    ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, 160, 160);
    return createTemplateFromImageData(ctx.getImageData(0, 0, 160, 160));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createTemplateFromImageData(imageData) {
  const grayscale = downsampleGrayscale(imageData, 9, 8);
  const hashBits = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = grayscale[y * 9 + x];
      const right = grayscale[y * 9 + x + 1];
      hashBits.push(left > right ? '1' : '0');
    }
  }
  return {
    algorithm: FACE_TEMPLATE_ALGORITHM,
    hash: bitsToHex(hashBits.join('')),
    createdAt: new Date().toISOString(),
    quality: estimateImageQuality(imageData),
  };
}

export function compareTemplates(a, b) {
  if (!a || !b) throw new Error('Both templates are required for comparison.');
  if (a.algorithm !== b.algorithm) throw new Error(`Template algorithm mismatch: ${a.algorithm} vs ${b.algorithm}`);
  const distance = hammingDistance(hexToBits(a.hash), hexToBits(b.hash));
  const similarity = Math.max(0, 1 - distance / 64);
  const confidence = Math.round(similarity * 100);
  return {
    distance,
    similarity,
    confidence,
    verdict: confidence >= 82 ? 'possible-match' : confidence >= 68 ? 'manual-review' : 'unlikely-match',
  };
}

export function hammingDistance(bitsA, bitsB) {
  if (bitsA.length !== bitsB.length) throw new Error('Hamming inputs must have equal length.');
  let distance = 0;
  for (let i = 0; i < bitsA.length; i += 1) {
    if (bitsA[i] !== bitsB[i]) distance += 1;
  }
  return distance;
}

function downsampleGrayscale(imageData, width, height) {
  const result = new Array(width * height).fill(0);
  const sourceWidth = imageData.width;
  const sourceHeight = imageData.height;
  const data = imageData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.floor((x + 0.5) * sourceWidth / width);
      const sy = Math.floor((y + 0.5) * sourceHeight / height);
      const idx = (sy * sourceWidth + sx) * 4;
      result[y * width + x] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
  }
  return result;
}

function estimateImageQuality(imageData) {
  const grayscale = downsampleGrayscale(imageData, 16, 16);
  const mean = grayscale.reduce((sum, value) => sum + value, 0) / grayscale.length;
  const variance = grayscale.reduce((sum, value) => sum + (value - mean) ** 2, 0) / grayscale.length;
  return {
    brightness: Math.round(mean),
    contrast: Math.round(Math.sqrt(variance)),
  };
}

async function getFaceCropFromVideo(video) {
  const width = video.videoWidth || video.clientWidth || 640;
  const height = video.videoHeight || video.clientHeight || 480;
  if ('FaceDetector' in globalThis) {
    try {
      const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(video);
      if (faces.length) return squareCrop(faces[0].boundingBox, width, height, 1.35);
    } catch {
      // Shape Detection API support is inconsistent; centre crop is the safe fallback.
    }
  }
  return centerCrop(width, height);
}

async function getFaceCropFromBitmap(bitmap) {
  if ('FaceDetector' in globalThis) {
    try {
      const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(bitmap);
      if (faces.length) return squareCrop(faces[0].boundingBox, bitmap.width, bitmap.height, 1.35);
    } catch {
      // Ignore and use centre crop.
    }
  }
  return centerCrop(bitmap.width, bitmap.height);
}

function centerCrop(width, height) {
  const side = Math.min(width, height) * 0.74;
  return {
    x: (width - side) / 2,
    y: (height - side) / 2,
    width: side,
    height: side,
  };
}

function squareCrop(box, imageWidth, imageHeight, scale = 1) {
  const side = Math.min(Math.max(box.width, box.height) * scale, Math.min(imageWidth, imageHeight));
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return {
    x: Math.max(0, Math.min(imageWidth - side, centerX - side / 2)),
    y: Math.max(0, Math.min(imageHeight - side, centerY - side / 2)),
    width: side,
    height: side,
  };
}

function bitsToHex(bits) {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function hexToBits(hex) {
  return [...hex].map((char) => parseInt(char, 16).toString(2).padStart(4, '0')).join('');
}

function once(target, eventName) {
  return new Promise((resolve, reject) => {
    target.addEventListener(eventName, resolve, { once: true });
    target.addEventListener('error', () => reject(new Error(`Failed waiting for ${eventName}`)), { once: true });
  });
}
