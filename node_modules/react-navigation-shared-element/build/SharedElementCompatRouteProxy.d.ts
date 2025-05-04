import { SharedElementRoute, SharedElementCompatRoute } from "./types";
export declare class SharedElementCompatRouteProxy implements SharedElementCompatRoute {
    static isParamWarningSilenced: boolean;
    static isStateWarningSilenced: boolean;
    private route;
    private deprecatedStateCache;
    constructor(route: SharedElementRoute);
    get key(): string;
    get name(): string;
    get params(): {
        [key: string]: any;
    };
    getParam(name: string): any;
    get state(): any;
}
