const fs = require('fs');
const path = require('path');

// Generate a high quality 2-tone melodic chime WAV file (44.1kHz, 16-bit Mono)
const sampleRate = 44100;
const duration = 0.65; // 650ms
const totalSamples = Math.floor(sampleRate * duration);

const buffer = Buffer.alloc(44 + totalSamples * 2);

// WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + totalSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // PCM Chunk size
buffer.writeUInt16LE(1, 20);  // Format: PCM
buffer.writeUInt16LE(1, 22);  // Channels: 1 (Mono)
buffer.writeUInt32LE(sampleRate, 24); // Sample rate
buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
buffer.writeUInt16LE(2, 32);  // Block align
buffer.writeUInt16LE(16, 34); // Bits per sample
buffer.write('data', 36);
buffer.writeUInt32LE(totalSamples * 2, 40);

// Harmonics for a crisp Apple Pay / Cash App style success chime
// Tone 1: E6 (1318.5 Hz) + G6 (1567.9 Hz) at t = 0ms
// Tone 2: B6 (1975.5 Hz) + E7 (2637.0 Hz) at t = 150ms
for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  let sample = 0;

  // Tone 1 starts at 0s
  if (t >= 0 && t < 0.45) {
    const env1 = Math.exp(-t * 9);
    sample += 0.45 * Math.sin(2 * Math.PI * 1318.5 * t) * env1;
    sample += 0.25 * Math.sin(2 * Math.PI * 1567.9 * t) * env1;
  }

  // Tone 2 starts at 0.12s
  if (t >= 0.12) {
    const t2 = t - 0.12;
    const env2 = Math.exp(-t2 * 7.5);
    sample += 0.6 * Math.sin(2 * Math.PI * 1975.5 * t2) * env2;
    sample += 0.3 * Math.sin(2 * Math.PI * 2637.0 * t2) * env2;
    sample += 0.15 * Math.sin(2 * Math.PI * 3951.0 * t2) * env2;
  }

  // Soft master limiter to prevent clipping
  sample = Math.max(-1, Math.min(1, sample));
  const intSample = Math.floor(sample * 32767);
  buffer.writeInt16LE(intSample, 44 + i * 2);
}

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

const outputPath = path.join(soundsDir, 'booking-confirmed.wav');
fs.writeFileSync(outputPath, buffer);
console.log('Successfully generated booking confirmation sound at:', outputPath);
