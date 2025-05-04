const INVERT_OPTIONS = {
    inputRange: [0, 1],
    outputRange: [1, 0],
};
export default class SharedElementSceneData {
    updateSubscribers = new Set();
    ancestorNode = undefined;
    nodes = {};
    animationContextValue;
    getSharedElements;
    name;
    navigatorId;
    nestingDepth;
    debug;
    route;
    constructor(Component, getSharedElements, route, navigatorId, nestingDepth, debug) {
        this.getSharedElements = getSharedElements;
        this.route = route;
        this.navigatorId = navigatorId;
        this.nestingDepth = nestingDepth;
        this.debug = debug;
        this.name =
            Component.displayName ||
                Component.name ||
                (Component.constructor ? Component.constructor.name : undefined) ||
                "";
    }
    updateRoute(route) {
        if (route.key !== this.route.key) {
            throw new Error("SharedElementNavigation: Integrity error, route key should never change");
        }
        // @ts-ignore
        this.route = route;
    }
    setAnimimationContextValue(value) {
        this.animationContextValue = value;
    }
    getAnimValue(closing) {
        const { animationContextValue } = this;
        if (!animationContextValue)
            return;
        const { progress } = animationContextValue.current;
        return closing ? progress.interpolate(INVERT_OPTIONS) : progress;
    }
    getAncestor() {
        return this.ancestorNode;
    }
    setAncestor(ancestorNode) {
        // console.log('SharedElementSceneData.setAncestor');
        if (this.ancestorNode === ancestorNode)
            return;
        this.ancestorNode = ancestorNode || undefined;
        this.emitUpdateEvent("ancestor", this.ancestorNode, "");
    }
    addNode(id, node) {
        // console.log('SharedElementSceneData.addNode: ', id);
        this.nodes[id] = node;
        this.emitUpdateEvent("add", node, id);
    }
    removeNode(id, node) {
        // console.log('SharedElementSceneData.removeNode: ', id);
        delete this.nodes[id];
        this.emitUpdateEvent("remove", node, id);
    }
    getNode(id) {
        return this.nodes[id];
    }
    addUpdateListener(handler) {
        this.updateSubscribers.add(handler);
        return () => this.updateSubscribers.delete(handler);
    }
    emitUpdateEvent(eventType, node, id) {
        this.updateSubscribers.forEach((handler) => handler(eventType, node, id));
    }
}
//# sourceMappingURL=SharedElementSceneData.js.map