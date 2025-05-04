export declare type Route = {
    key: string;
    routeName: string;
};
export declare type NavigationEventName = "willFocus" | "didFocus" | "willBlur" | "didBlur";
export declare type NavigationState = {
    key: string;
    index: number;
    routes: Route[];
    routeName: string;
    transitions: {
        pushing: string[];
        popping: string[];
    };
    params?: {
        [key: string]: unknown;
    };
};
export declare type NavigationProp<RouteName = string, Params = object> = {
    navigate(routeName: RouteName): void;
    goBack(): void;
    goBack(key: string | null): void;
    addListener: (event: NavigationEventName, callback: () => void) => {
        remove: () => void;
    };
    isFocused(): boolean;
    state: NavigationState;
    setParams(params: Params): void;
    getParam(): Params;
    dispatch(action: {
        type: string;
    }): void;
    isFirstRouteInParent(): boolean;
    dangerouslyGetParent(): NavigationProp | undefined;
};
