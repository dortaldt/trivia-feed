import { SharedElementNode, SharedElementEventSubscription, SharedElementAnimatedValue, SharedElementRoute, SharedElementSceneComponent, SharedElementsComponentConfig } from "./types";
export declare type SharedElementSceneUpdateHandlerEventType = "ancestor" | "add" | "remove";
export declare type SharedElementSceneUpdateHandler = (eventType: SharedElementSceneUpdateHandlerEventType, node: SharedElementNode | undefined, id: string) => any;
export declare type SharedElementSceneEventType = "willFocus" | "didFocus" | "willBlur" | "didBlur";
export default class SharedElementSceneData {
    private updateSubscribers;
    private ancestorNode?;
    private nodes;
    private animationContextValue;
    readonly getSharedElements: () => SharedElementsComponentConfig | void;
    readonly name: string;
    readonly navigatorId: string;
    readonly nestingDepth: number;
    readonly debug: boolean;
    readonly route: SharedElementRoute;
    constructor(Component: SharedElementSceneComponent, getSharedElements: () => SharedElementsComponentConfig | void, route: SharedElementRoute, navigatorId: string, nestingDepth: number, debug: boolean);
    updateRoute(route: SharedElementRoute): void;
    setAnimimationContextValue(value: any): void;
    getAnimValue(closing: boolean): SharedElementAnimatedValue | undefined;
    getAncestor(): SharedElementNode | undefined;
    setAncestor(ancestorNode: SharedElementNode | null): void;
    addNode(id: string, node: SharedElementNode): void;
    removeNode(id: string, node: SharedElementNode): void;
    getNode(id: string): SharedElementNode | undefined;
    addUpdateListener(handler: SharedElementSceneUpdateHandler): SharedElementEventSubscription;
    private emitUpdateEvent;
}
