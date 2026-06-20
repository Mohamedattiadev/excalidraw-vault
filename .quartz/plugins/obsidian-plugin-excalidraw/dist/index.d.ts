import { QuartzPageTypePlugin } from '@quartz-community/types';
import { ExcalidrawPageOptions, ExcalidrawData } from './types.js';
export { ExcalidrawElement } from './types.js';
export { ExcalidrawBody } from './components/index.js';
export { ExcalidrawFrame } from './frames/index.js';

declare const ExcalidrawPage: QuartzPageTypePlugin<ExcalidrawPageOptions>;

declare function parseExcalidraw(content: string, filePath: string): ExcalidrawData | null;
declare function parseExcalidrawJson(content: string): ExcalidrawData | null;
declare function parseExcalidrawMd(content: string): ExcalidrawData | null;

export { ExcalidrawData, ExcalidrawPage, ExcalidrawPageOptions, parseExcalidraw, parseExcalidrawJson, parseExcalidrawMd };
