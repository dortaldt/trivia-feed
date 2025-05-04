import { ISharedElementRendererData } from "./SharedElementRendererData";
import SharedElementSceneData, { SharedElementSceneEventType } from "./SharedElementSceneData";
export declare class SharedElementRendererProxy implements ISharedElementRendererData {
    private data;
    startTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    endTransition(closing: boolean, navigatorId: string, nestingDepth: number): void;
    updateSceneState(scene: SharedElementSceneData, eventType: SharedElementSceneEventType): void;
    get source(): ISharedElementRendererData | null;
    set source(data: ISharedElementRendererData | null);
    get nestingDepth(): number;
    addDebugRef(): number;
    releaseDebugRef(): number;
}
