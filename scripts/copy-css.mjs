import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('src/styles/vailcast.css');
const targetPath = resolve('dist/vailcast.css');

await mkdir(dirname(targetPath), { recursive: true });
await cp(sourcePath, targetPath);
