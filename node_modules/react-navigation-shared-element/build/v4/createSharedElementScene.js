import hoistNonReactStatics from "hoist-non-react-statics";
import * as React from "react";
import { View, StyleSheet } from "react-native";
import { nodeFromRef } from "react-native-shared-element";
import SharedElementSceneContext from "../SharedElementSceneContext";
import SharedElementSceneData from "../SharedElementSceneData";
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
function routeFromNavigation(navigation) {
    return {
        key: navigation.state.key,
        name: navigation.state.routeName,
        params: navigation.state.params || {},
    };
}
export function getActiveRouteState(route) {
    if (!route.routes ||
        route.routes.length === 0 ||
        route.index >= route.routes.length) {
        return route;
    }
    else {
        return getActiveRouteState(route.routes[route.index]);
    }
}
function createSharedElementScene(Component, rendererData, AnimationContext, navigatorId, verbose) {
    class SharedElementSceneView extends React.PureComponent {
        subscriptions = {};
        sceneData = new SharedElementSceneData(Component, () => Component.sharedElements, routeFromNavigation(this.props.navigation), navigatorId, rendererData.nestingDepth, verbose);
        componentDidMount() {
            const { navigation } = this.props;
            this.subscriptions = {
                willFocus: navigation.addListener("willFocus", this.onWillFocus),
                didFocus: navigation.addListener("didFocus", this.onDidFocus),
                willBlur: navigation.addListener("willBlur", this.onWillBlur),
            };
        }
        componentWillUnmount() {
            Object.values(this.subscriptions).forEach((subscription) => subscription.remove());
        }
        render() {
            // console.log('SharedElementSceneView.render');
            return (React.createElement(SharedElementSceneContext.Provider, { value: this.sceneData },
                React.createElement(View, { style: styles.container, collapsable: false, ref: this.onSetRef },
                    React.createElement(AnimationContext.Consumer, null, this.onRenderAnimationContext),
                    React.createElement(Component, { ...this.props }))));
        }
        onRenderAnimationContext = (value) => {
            this.sceneData.setAnimimationContextValue(value);
        };
        componentDidUpdate() {
            this.sceneData.updateRoute(routeFromNavigation(this.props.navigation));
        }
        onSetRef = (ref) => {
            this.sceneData.setAncestor(nodeFromRef(ref));
        };
        onWillFocus = () => {
            const { navigation } = this.props;
            const activeRoute = getActiveRouteState(navigation.state);
            //console.log('onWillFocus: ', navigation.state, activeRoute);
            if (navigation.state.routeName === activeRoute.routeName) {
                this.sceneData.updateRoute(routeFromNavigation(navigation));
                rendererData.updateSceneState(this.sceneData, "willFocus");
            }
        };
        onDidFocus = () => {
            const { navigation } = this.props;
            const activeRoute = getActiveRouteState(navigation.state);
            if (navigation.state.routeName === activeRoute.routeName) {
                // console.log('onDidFocus: ', this.sceneData.name, navigation);
                this.sceneData.updateRoute(routeFromNavigation(navigation));
                rendererData.updateSceneState(this.sceneData, "didFocus");
            }
        };
        onWillBlur = () => {
            const { navigation } = this.props;
            const activeRoute = getActiveRouteState(navigation.state);
            //console.log('onWillBlur: ', navigation.state, activeRoute);
            if (navigation.state.routeName === activeRoute.routeName) {
                this.sceneData.updateRoute(routeFromNavigation(navigation));
                rendererData.updateSceneState(this.sceneData, "willBlur");
            }
        };
    }
    hoistNonReactStatics(SharedElementSceneView, Component);
    return SharedElementSceneView;
}
export default createSharedElementScene;
//# sourceMappingURL=createSharedElementScene.js.map