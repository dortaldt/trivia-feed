export class SharedElementRendererProxy {
    data = null;
    startTransition(closing, navigatorId, nestingDepth) {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.startTransition called before Proxy was initialized");
            return;
        }
        return this.data.startTransition(closing, navigatorId, nestingDepth);
    }
    endTransition(closing, navigatorId, nestingDepth) {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.endTransition called before Proxy was initialized");
            return;
        }
        return this.data.endTransition(closing, navigatorId, nestingDepth);
    }
    updateSceneState(scene, eventType) {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.updateSceneState called before Proxy was initialized");
            return;
        }
        return this.data.updateSceneState(scene, eventType);
    }
    get source() {
        return this.data;
    }
    set source(data) {
        this.data = data;
    }
    get nestingDepth() {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.nestingDepth called before Proxy was initialized");
            return 0;
        }
        return this.data.nestingDepth + 1;
    }
    addDebugRef() {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.addDebugRef called before Proxy was initialized");
            return 0;
        }
        return this.data.addDebugRef();
    }
    releaseDebugRef() {
        if (!this.data) {
            console.warn("SharedElementRendererProxy.relaseDebugRef called before Proxy was initialized");
            return 0;
        }
        return this.data.releaseDebugRef();
    }
}
//# sourceMappingURL=SharedElementRendererProxy.js.map