import * as React from "react";
import { View, StyleSheet } from "react-native";
import { SharedElementTransition } from "react-native-shared-element";
export default class SharedElementRendererView extends React.PureComponent {
    subscription;
    componentDidMount() {
        this.subscription = this.props.rendererData.addUpdateListener(() => {
            this.forceUpdate();
        });
    }
    componentWillUnmount() {
        if (this.subscription) {
            this.subscription();
            this.subscription = undefined;
        }
    }
    render() {
        const transitions = this.props.rendererData.getTransitions();
        // console.log('SharedElementRendererView.render: ', transitions);
        return (React.createElement(View, { style: StyleSheet.absoluteFill, pointerEvents: "none" }, transitions.map((
        // @ts-ignore
        { key, ...props }, index) => (React.createElement(SharedElementTransition, { key: `${key}:${index}`, ...props })))));
    }
}
//# sourceMappingURL=SharedElementRendererView.js.map