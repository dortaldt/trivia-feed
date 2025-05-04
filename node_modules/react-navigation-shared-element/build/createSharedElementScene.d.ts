import { StackCardInterpolationProps } from "@react-navigation/stack";
import * as React from "react";
import { ISharedElementRendererData } from "./SharedElementRendererData";
import { SharedElementSceneComponent, SharedElementsComponentConfig } from "./types";
import { EventEmitter } from "./utils/EventEmitter";
declare function createSharedElementScene(Component: SharedElementSceneComponent, sharedElements: SharedElementsComponentConfig | void, rendererData: ISharedElementRendererData, emitter: EventEmitter, AnimationContext: React.Context<StackCardInterpolationProps | undefined>, navigatorId: string, verbose: boolean): React.ComponentType<any>;
export default createSharedElementScene;
