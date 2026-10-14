// Експорт сцени з архіву в MP4 нативними біндінгами CE.SDK.
// Підставляє випадкове значення в текстову змінну {{Location name}}
// і кладе результат на Робочий стіл.
//
// Запуск:  node src/export-video.mjs [--duration <сек>] [--width N] [--height N]
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CreativeEngine from '@cesdk/node-native';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveUrl = `file://${path.join(root, 'scene', 'scene-archive.zip')}`;

// --- аргументи -------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : Number(argv[i + 1]);
};

// --- випадкове значення для змінної ----------------------------------------
const VARIABLE_NAME = 'Location name';
const PLACES = ['Lviv', 'Kyiv', 'Odesa', 'Porto', 'Reykjavik', 'Kyoto', 'Valencia'];
const randomValue = `${PLACES[Math.floor(Math.random() * PLACES.length)]} #${Math
  .floor(Math.random() * 9000 + 1000)}`;

const engine = await CreativeEngine.init({ license: process.env.CESDK_LICENSE });

try {
  // waitForResources=true — інакше експорт може стартувати до того, як
  // відео та шрифти з архіву реально завантажились.
  await engine.scene.loadFromArchiveURL(archiveUrl, false, true);

  // Змінна оголошується самим фактом присвоєння: усі текстові блоки, що
  // посилаються на {{Location name}}, оновлюються автоматично.
  engine.variable.setString(VARIABLE_NAME, randomValue);
  console.log(`Змінна "${VARIABLE_NAME}" =`, JSON.stringify(randomValue));
  console.log('Змінні сцени:', engine.variable.findAll());

  const [page] = engine.block.findByType('page');
  const sceneDuration = engine.block.getDuration(page);
  const duration = arg('duration') ?? sceneDuration;
  const targetWidth = arg('width') ?? engine.block.getWidth(page);
  const targetHeight = arg('height') ?? engine.block.getHeight(page);

  console.log(
    `Сторінка ${page}: ${engine.block.getWidth(page)}x${engine.block.getHeight(page)}, ` +
      `${sceneDuration.toFixed(2)} с → експорт ${targetWidth}x${targetHeight}, ${duration.toFixed(2)} с`,
  );

  const startedAt = Date.now();
  let lastLogged = -1;

  const blob = await engine.block.exportVideo(page, {
    mimeType: 'video/mp4',
    targetWidth,
    targetHeight,
    framerate: 30,
    duration,
    onProgress: (rendered, encoded, total) => {
      const percent = Math.floor((encoded / total) * 100);
      if (percent !== lastLogged && percent % 5 === 0) {
        lastLogged = percent;
        console.log(`  ${percent}% — кадрів: ${rendered} відрендерено, ${encoded}/${total} закодовано`);
      }
    },
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `cesdk-export-${stamp}.mp4`;

  const desktopPath = path.join(os.homedir(), 'Desktop', fileName);
  const localPath = path.join(root, 'output', fileName);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(desktopPath, buffer);
  await fs.writeFile(localPath, buffer);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nГотово за ${seconds} с — ${(buffer.length / 1024 / 1024).toFixed(2)} МБ`);
  console.log('  ', desktopPath);
  console.log('  ', localPath);
} finally {
  engine.dispose();
}
