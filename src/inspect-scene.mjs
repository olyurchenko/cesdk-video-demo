// Огляд сцени з архіву: які сторінки, блоки та текстові змінні в ній є.
// Запуск: node src/inspect-scene.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CreativeEngine from '@cesdk/node-native';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveUrl = `file://${path.join(root, 'scene', 'scene-archive.zip')}`;

const engine = await CreativeEngine.init({ license: process.env.CESDK_LICENSE });

try {
  // Архів (.zip зі scene.scene + fonts/ + videos/) вантажиться тим самим
  // шляхом, що й будь-який URL — для локального файлу це file://.
  await engine.scene.loadFromArchiveURL(archiveUrl, false, true);

  const pages = engine.block.findByType('page');
  console.log('Сторінок:', pages.length);

  for (const page of pages) {
    console.log('  page', page, {
      width: engine.block.getWidth(page),
      height: engine.block.getHeight(page),
      duration: engine.block.getDuration(page),
    });
  }

  for (const type of ['text', 'graphic', 'audio', 'group']) {
    console.log(`Блоків типу ${type}:`, engine.block.findByType(type).length);
  }

  for (const text of engine.block.findByType('text')) {
    console.log('  text', text, JSON.stringify(engine.block.getString(text, 'text/text')));
  }

  console.log('Змінні сцени:', engine.variable.findAll());
} finally {
  engine.dispose();
}
