/// <reference types="react" />
import { SharedElementNode, SharedElementAnimation, SharedElementResize, SharedElementAlign, SharedElementTransitionProps } from "react-native-shared-element";
export { SharedElementNode, SharedElementAnimation, SharedElementTransitionProps, };
export declare type SharedElementEventSubscription = () => void;
export declare type SharedElementStrictConfig = {
    readonly id: string;
    readonly otherId: string;
    readonly animation: SharedElementAnimation;
    readonly resize?: SharedElementResize;
    readonly align?: SharedElementAlign;
    readonly debug?: boolean;
};
export declare type SharedElementsStrictConfig = SharedElementStrictConfig[];
export declare type SharedElementConfig = {
    readonly id: string;
    readonly otherId?: string;
    readonly animation?: SharedElementAnimation;
    readonly resize?: SharedElementResize;
    readonly align?: SharedElementAlign;
    readonly debug?: boolean;
} | string;
export declare type SharedElementsConfig = SharedElementConfig[];
export declare type SharedElementAnimatedValue = any;
export declare type SharedElementRoute = {
    key: string;
    name: string;
    params: {
        [key: string]: any;
    };
};
export interface SharedElementCompatRoute {
    /**
     * Key of the screen.
     */
    readonly key: string;
    /**
     * Route name of this screen.
     */
    readonly name: string;
    /**
     * Params for this route.
     */
    readonly params: {
        [key: string]: any;
    };
    /**
     * @deprecated
     * Gets the parameter by its name.
     */
    getParam(name: string): any;
    /**
     * @deprecated
     * Gets the navigation state.
     */
    readonly state: {
        readonly key: string;
        readonly routeName: string;
        readonly params: {
            [key: string]: any;
        };
    };
}
export declare type SharedElementsComponentConfig = (route: SharedElementCompatRoute, otherRoute: SharedElementCompatRoute, showing: boolean) => SharedElementsConfig | undefined;
export declare type SharedElementSceneComponent<P = object> = React.ComponentType<P> & {
    sharedElements?: SharedElementsComponentConfig;
};
