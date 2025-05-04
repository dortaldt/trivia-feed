import { SharedElementConfig, SharedElementsConfig, SharedElementStrictConfig, SharedElementsStrictConfig } from "./types";
export declare function normalizeSharedElementConfig(sharedElementConfig: SharedElementConfig): SharedElementStrictConfig;
export declare function normalizeSharedElementsConfig(sharedElementsConfig: SharedElementsConfig | undefined): SharedElementsStrictConfig | null;
