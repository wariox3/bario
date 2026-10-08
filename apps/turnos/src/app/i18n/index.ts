import type { Lang } from '@reddoc/core';
import type { AppDict } from './app.dict';
import { es } from './app.es';
import { en } from './app.en';

export type { AppDict } from './app.dict';

export const dictionaries: Record<Lang, AppDict> = { es, en };
