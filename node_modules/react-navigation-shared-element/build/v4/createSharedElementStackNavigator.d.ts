import { NavigationNavigator, NavigationProp, NavigationState } from "react-navigation";
import { createStackNavigator } from "react-navigation-stack";
declare function createSharedElementStackNavigator(routeConfigs: Parameters<typeof createStackNavigator>[0], stackConfig: Parameters<typeof createStackNavigator>[1], options?: {
    name?: string;
    debug?: boolean;
}): NavigationNavigator<any, NavigationProp<NavigationState>>;
export default createSharedElementStackNavigator;
