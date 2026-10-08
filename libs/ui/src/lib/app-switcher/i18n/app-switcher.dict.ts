import type { ReddocAppId } from '@reddoc/core';

export interface AppSwitcherDict {
  triggerLabel: string;
  heading: string;
  comingSoon: string;
  /** `Record` sobre `ReddocAppId`: agregar una app obliga a traducirla en es y en. */
  apps: Record<ReddocAppId, { name: string; description: string }>;
}

export interface AppSwitcherTranslationsHost {
  appSwitcher: AppSwitcherDict;
}
