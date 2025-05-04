import * as React from "react";
import { ISharedElementRendererData } from "../SharedElementRendererData";
import { SharedElementSceneComponent } from "../types";
import { Route } from "./types";
export declare function getActiveRouteState(route: any): Route;
declare function createSharedElementScene(Component: SharedElementSceneComponent, rendererData: ISharedElementRendererData, AnimationContext: any, navigatorId: string, verbose: boolean): React.ComponentType<any>;
export default createSharedElementScene;
