import { RouteConfig, StackRouterOptions, StackNavigationState, ParamListBase } from "@react-navigation/native";
import { StackNavigationOptions } from "@react-navigation/stack";
import { StackNavigationConfig, StackNavigationEventMap } from "@react-navigation/stack/lib/typescript/src/types";
import * as React from "react";
import { SharedElementSceneComponent, SharedElementsComponentConfig } from "./types";
export default function createSharedElementStackNavigator<ParamList extends ParamListBase>(options?: {
    name?: string;
    debug?: boolean;
}): {
    Navigator: (props: (Omit<((Omit<import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    }) | (Omit<import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & {
        children?: React.ReactNode;
    })) & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<Extract<keyof ParamList, string>> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    }) | (Omit<((Omit<import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    }) | (Omit<import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamListBase, string>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & {
        children?: React.ReactNode;
    })) & StackRouterOptions & StackNavigationConfig, "children" | "initialRouteName" | "screenListeners" | "screenOptions" | "defaultScreenOptions"> & import("@react-navigation/native").DefaultRouterOptions<Extract<keyof ParamList, string>> & {
        children: React.ReactNode;
        screenListeners?: Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }> | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
        }) => Partial<{
            transitionStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionStart">;
            transitionEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "transitionEnd">;
            gestureStart: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureStart">;
            gestureEnd: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureEnd">;
            gestureCancel: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "gestureCancel">;
            focus: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "focus">;
            blur: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "blur">;
            state: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "state">;
            beforeRemove: import("@react-navigation/native").EventListenerCallback<StackNavigationEventMap, "beforeRemove">;
        }>) | undefined;
        screenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
        }) => StackNavigationOptions) | undefined;
        defaultScreenOptions?: StackNavigationOptions | ((props: {
            route: import("@react-navigation/native").RouteProp<ParamList, Extract<keyof ParamList, string>>;
            navigation: any;
            options: StackNavigationOptions;
        }) => StackNavigationOptions) | undefined;
    } & {
        children?: React.ReactNode;
    })) => JSX.Element;
    Screen: <RouteName extends keyof ParamList>(_: Omit<RouteConfig<ParamList, RouteName, StackNavigationState<ParamList>, StackNavigationOptions, StackNavigationEventMap>, "children" | "component"> & {
        component: SharedElementSceneComponent<any>;
        sharedElements?: SharedElementsComponentConfig | undefined;
        /**
         * @deprecated
         * The `sharedElementsConfig` prop has been renamed, use `sharedElements` instead.
         */
        sharedElementsConfig?: SharedElementsComponentConfig | undefined;
    }) => null;
};
