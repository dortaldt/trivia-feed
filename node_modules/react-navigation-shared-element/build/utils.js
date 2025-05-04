export function normalizeSharedElementConfig(sharedElementConfig) {
    if (typeof sharedElementConfig === "string") {
        return {
            id: sharedElementConfig,
            otherId: sharedElementConfig,
            animation: "move",
        };
    }
    else {
        const { id, otherId, animation, ...other } = sharedElementConfig;
        return {
            id,
            otherId: otherId || id,
            animation: animation || "move",
            ...other,
        };
    }
}
export function normalizeSharedElementsConfig(sharedElementsConfig) {
    if (!sharedElementsConfig || !sharedElementsConfig.length)
        return null;
    return sharedElementsConfig.map(normalizeSharedElementConfig);
}
//# sourceMappingURL=utils.js.map