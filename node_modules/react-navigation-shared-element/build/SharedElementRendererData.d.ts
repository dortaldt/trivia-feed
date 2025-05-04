import SharedElementSceneData, { SharedElementSceneEventType } from "./SharedElementSceneData";
import { SharedElementEventSubscription, SharedElementTransitionProps } from "./types";
export declare type SharedElementRendererUpdateHandler = () => any;
export interface ISharedElementRendererData {
    startTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    endTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    updateSceneState(scene: SharedElementSceneData, eventType: SharedElementSceneEventType): void;
    readonly nestingDepth: number;
    addDebugRef(): number;
    releaseDebugRef(): number;
}
/**
 * TODO
 * - [ ] Not all lifecycle events not emitted by stack when using gestures (close modal)
 */
export default class SharedElementRendererData implements ISharedElementRendererData {
    private scenes;
    private updateSubscribers;
    private sharedElements;
    private isShowing;
    private route;
    private prevRoute;
    private routeAnimValue;
    private scene;
    private prevScene;
    private sceneAnimValue;
    private isTransitionStarted;
    private isTransitionClosing;
    private transitionNavigatorId;
    private transitionNestingDepth;
    debugRefCount: number;
    startTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    endTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    updateSceneState(scene: SharedElementSceneData, eventType: SharedElementSceneEventType): void;
    addDebugRef(): number;
    releaseDebugRef(): number;
    get debug(): boolean;
    willFocusScene(scene: SharedElementSceneData): void;
    didFocusScene(scene: SharedElementSceneData): void;
    private registerScene;
    private updateSceneListeners;
    private getScene;
    private updateSharedElements;
    addUpdateListener(handler: SharedElementRendererUpdateHandler): SharedElementEventSubscription;
    private emitUpdateEvent;
    getTransitions(): SharedElementTransitionProps[];
    get nestingDepth(): number;
}
