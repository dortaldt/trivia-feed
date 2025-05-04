export class SharedElementCompatRouteProxy {
    static isParamWarningSilenced = false;
    static isStateWarningSilenced = false;
    route;
    deprecatedStateCache;
    constructor(route) {
        this.route = route;
    }
    get key() {
        return this.route.key;
    }
    get name() {
        return this.route.name;
    }
    get params() {
        return this.route.params || {};
    }
    // As of react-navigation-shared-element@3, the `sharedElements` function
    // receives a route rather than a navigator. In order to easy the code transition
    // both the `navigation` and `route` forms are supported. When using `navigation`.
    getParam(name) {
        if (!SharedElementCompatRouteProxy.isParamWarningSilenced) {
            SharedElementCompatRouteProxy.isParamWarningSilenced = true;
            console.warn('SharedElementNavigation: `navigation.getParam() is deprecated, use `route.params` instead. See TODO"');
        }
        return this.params[name];
    }
    get state() {
        if (!SharedElementCompatRouteProxy.isStateWarningSilenced) {
            SharedElementCompatRouteProxy.isStateWarningSilenced = true;
            console.warn('SharedElementNavigation: `navigation.state[key/routeName] is deprecated, use `route[key/name]` instead. See TODO"');
        }
        this.deprecatedStateCache = this.deprecatedStateCache || {
            key: this.key,
            routeName: this.name,
            params: this.params,
        };
        return this.deprecatedStateCache;
    }
}
//# sourceMappingURL=SharedElementCompatRouteProxy.js.map