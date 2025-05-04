import { SharedElementCompatRouteProxy } from "./SharedElementCompatRouteProxy";
import { normalizeSharedElementsConfig } from "./utils";
function getSharedElements(scene, otherScene, showing) {
    const sharedElements = scene.getSharedElements();
    if (!sharedElements)
        return null;
    return normalizeSharedElementsConfig(sharedElements(new SharedElementCompatRouteProxy(scene.route), new SharedElementCompatRouteProxy(otherScene.route), showing));
}
const NO_SHARED_ELEMENTS = [];
/**
 * TODO
 * - [ ] Not all lifecycle events not emitted by stack when using gestures (close modal)
 */
export default class SharedElementRendererData {
    scenes = [];
    updateSubscribers = new Set();
    sharedElements = null;
    isShowing = true;
    route = null;
    prevRoute = null;
    routeAnimValue;
    scene = null;
    prevScene = null;
    sceneAnimValue;
    isTransitionStarted = false;
    isTransitionClosing = false;
    transitionNavigatorId = "";
    transitionNestingDepth = -1;
    debugRefCount = 0;
    startTransition(closing, navigatorId, nestingDepth) {
        if (this.debug)
            console.debug(`[${navigatorId}]startTransition, closing: ${closing}, nestingDepth: ${nestingDepth}`);
        if (!this.isTransitionStarted || this.route) {
            this.prevRoute = this.route;
            this.route = null;
            this.routeAnimValue = null;
            // When a transition wasn't completely fully, but a new transition
            // has already started, then the `willBlur` event is not called.
            // For this particular case, we capture the animation-value of the
            // last (previous) scene that is now being hidden.
            if (this.isTransitionStarted) {
                const scene = this.getScene(this.prevRoute);
                if (scene) {
                    this.routeAnimValue = scene.getAnimValue(true);
                }
            }
            this.isTransitionStarted = true;
            this.isTransitionClosing = closing;
            this.transitionNavigatorId = navigatorId;
            this.transitionNestingDepth = nestingDepth;
        }
        else {
            // When navigators are nested, `startTransition` may be called multiple
            // times. In such as case, we want to use the most shallow navigator,
            // as that is the one doing the transition.
            if (nestingDepth < this.transitionNestingDepth) {
                this.transitionNavigatorId = navigatorId;
                this.transitionNestingDepth = nestingDepth;
            }
        }
    }
    endTransition(closing, navigatorId, nestingDepth) {
        if (this.debug)
            console.debug(`[${navigatorId}]endTransition, closing: ${closing}, nestingDepth: ${nestingDepth}`);
        if (!this.isTransitionStarted ||
            this.transitionNavigatorId !== navigatorId) {
            return;
        }
        this.isTransitionStarted = false;
        if (this.prevRoute != null) {
            this.prevRoute = null;
            this.routeAnimValue = null;
            this.updateSceneListeners();
            this.updateSharedElements();
        }
    }
    updateSceneState(scene, eventType) {
        switch (eventType) {
            case "willFocus":
                return this.willFocusScene(scene);
            case "didFocus":
                return this.didFocusScene(scene);
            /*case "willBlur":
              return this.willBlurScene(scene);*/
        }
    }
    addDebugRef() {
        return ++this.debugRefCount;
    }
    releaseDebugRef() {
        return --this.debugRefCount;
    }
    get debug() {
        return this.debugRefCount > 0;
    }
    willFocusScene(scene) {
        if (this.debug)
            console.debug(`[${scene.navigatorId}]willFocus, scene: "${scene.name}", depth: ${scene.nestingDepth}, closing: ${this.isTransitionClosing}`);
        this.registerScene(scene);
        // Wait for a transition start, before starting any animations
        if (!this.isTransitionStarted)
            return;
        // Use the animation value from the navigator that
        // started the transition
        if (this.prevRoute) {
            const routeScene = this.isTransitionClosing
                ? this.getScene(this.prevRoute)
                : scene;
            if (routeScene?.navigatorId === this.transitionNavigatorId) {
                this.routeAnimValue = routeScene?.getAnimValue(this.isTransitionClosing);
            }
        }
        // In case of nested navigators, multiple scenes will become
        // activated. Make sure to use the scene that is nested most deeply,
        // as this will be the one visible to the user
        if (!this.route) {
            this.route = scene.route;
        }
        else {
            const routeScene = this.getScene(this.route);
            if (routeScene && routeScene.nestingDepth <= scene.nestingDepth) {
                this.route = scene.route;
            }
        }
        // Update transition
        if (this.prevRoute && this.route && this.routeAnimValue) {
            this.updateSceneListeners();
            this.updateSharedElements();
        }
    }
    didFocusScene(scene) {
        if (this.debug)
            console.debug(`[${scene.navigatorId}]didFocus, scene: "${scene.name}", depth: ${scene.nestingDepth}`);
        if (!this.route || this.prevRoute) {
            this.route = scene.route;
        }
        else {
            const routeScene = this.getScene(this.route);
            if (routeScene && routeScene.nestingDepth <= scene.nestingDepth) {
                this.route = scene.route;
            }
        }
        this.registerScene(scene);
    }
    /*willBlurScene(scene: SharedElementSceneData): void {
      if (this.debug)
        console.debug(
          `[${scene.navigatorId}]willBlur, scene: "${scene.name}", depth: ${scene.nestingDepth}`
        );
  
      // Wait for a transition start, before starting any animations
      if (!this.isTransitionStarted) return;
  
      // Use the animation value from the navigator that
      // started the transition
      if (
        this.isTransitionClosing &&
        scene.navigatorId === this.transitionNavigatorId &&
        !this.routeAnimValue
      ) {
        this.routeAnimValue = scene.getAnimValue(this.isTransitionClosing);
      }
  
      // Update transition
      if (this.prevRoute && this.route && this.routeAnimValue) {
        this.updateSceneListeners();
        this.updateSharedElements();
      }
    }*/
    registerScene(scene) {
        this.scenes.push({
            scene,
            subscription: null,
        });
        if (this.scenes.length > 10) {
            const { subscription } = this.scenes[0];
            this.scenes.splice(0, 1);
            subscription?.();
        }
        this.updateSceneListeners();
    }
    updateSceneListeners() {
        this.scenes.forEach((sceneRoute) => {
            const { scene, subscription } = sceneRoute;
            const isActive = (this.route && this.route.key === scene.route.key) ||
                (this.prevRoute && this.prevRoute.key === scene.route.key);
            if (isActive && !subscription) {
                sceneRoute.subscription = scene.addUpdateListener(() => {
                    // TODO: optimize?
                    this.emitUpdateEvent();
                });
            }
            else if (!isActive && subscription) {
                sceneRoute.subscription = null;
                subscription();
            }
        });
    }
    getScene(route) {
        const sceneRoute = route
            ? this.scenes.find((sc) => sc.scene.route.key === route.key)
            : undefined;
        return sceneRoute ? sceneRoute.scene : null;
    }
    updateSharedElements() {
        const { route, prevRoute, routeAnimValue } = this;
        const scene = this.getScene(route);
        const prevScene = this.getScene(prevRoute);
        const sceneAnimValue = routeAnimValue;
        // Update current scene & previous scene
        if (scene === this.scene &&
            prevScene === this.prevScene &&
            sceneAnimValue === this.sceneAnimValue)
            return;
        this.scene = scene;
        this.prevScene = prevScene;
        this.sceneAnimValue = sceneAnimValue;
        // Update shared elements
        let sharedElements = null;
        let isShowing = true;
        if (sceneAnimValue && scene && prevScene && route && prevRoute) {
            sharedElements = getSharedElements(scene, prevScene, true);
            if (!sharedElements) {
                isShowing = false;
                sharedElements = getSharedElements(prevScene, scene, false);
            }
        }
        if (this.sharedElements !== sharedElements) {
            if (this.debug) {
                if (sharedElements) {
                    console.debug(`Transition start: "${prevScene?.name}" -> "${scene?.name}", elements: ${JSON.stringify(sharedElements, undefined, 2)}`);
                }
                else {
                    console.debug(`Transition end: "${scene?.name}"`);
                }
            }
            this.sharedElements = sharedElements;
            this.isShowing = isShowing;
            /*console.log(
              'updateSharedElements: ',
              sharedElements,
              ' ,isShowing: ',
              isShowing,
              ', animValue: ',
              animValue
            );*/
            this.emitUpdateEvent();
        }
    }
    addUpdateListener(handler) {
        this.updateSubscribers.add(handler);
        return () => this.updateSubscribers.delete(handler);
    }
    emitUpdateEvent() {
        this.updateSubscribers.forEach((handler) => handler());
    }
    getTransitions() {
        const { sharedElements, prevScene, scene, isShowing, sceneAnimValue } = this;
        if (!sharedElements || !scene || !prevScene)
            return NO_SHARED_ELEMENTS;
        return sharedElements.map(({ id, otherId, ...other }) => {
            const startId = isShowing ? otherId || id : id;
            const endId = isShowing ? id : otherId || id;
            return {
                key: scene.route.key,
                position: sceneAnimValue,
                start: {
                    ancestor: (prevScene ? prevScene.getAncestor() : undefined) || null,
                    node: (prevScene ? prevScene.getNode(startId) : undefined) || null,
                },
                end: {
                    ancestor: (scene ? scene.getAncestor() : undefined) || null,
                    node: (scene ? scene.getNode(endId) : undefined) || null,
                },
                ...other,
            };
        });
    }
    get nestingDepth() {
        return 0;
    }
}
//# sourceMappingURL=SharedElementRendererData.js.map