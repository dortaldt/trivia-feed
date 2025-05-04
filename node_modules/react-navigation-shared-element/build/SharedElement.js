import * as React from "react";
import { SharedElement as RawSharedElement, } from "react-native-shared-element";
import SharedElementSceneContext from "./SharedElementSceneContext";
class SharedElement extends React.Component {
    node = null;
    sharedId = "";
    sceneData = null;
    constructor(props) {
        super(props);
        this.sharedId = props.id;
    }
    render() {
        const { id, //eslint-disable-line @typescript-eslint/no-unused-vars
        ...otherProps } = this.props;
        return (React.createElement(SharedElementSceneContext.Consumer, null, (sceneData) => {
            /*invariant(
              sceneData != null,
              'The SharedElementSceneContext is not set, did you forget to wrap your scene component with `createSharedElementScene(..)`?'
            );*/
            this.sceneData = sceneData;
            return React.createElement(RawSharedElement, { ...otherProps, onNode: this.onSetNode });
        }));
    }
    componentDidUpdate() {
        const { id } = this.props;
        if (this.sharedId !== id) {
            if (this.sceneData && this.sharedId && this.node) {
                this.sceneData.removeNode(this.sharedId, this.node);
            }
            this.sharedId = id;
            if (this.sceneData && this.sharedId && this.node) {
                this.sceneData.addNode(this.sharedId, this.node);
            }
        }
    }
    onSetNode = (node) => {
        if (this.node === node) {
            return;
        }
        if (this.sceneData && this.node && this.sharedId) {
            this.sceneData.removeNode(this.sharedId, this.node);
        }
        this.node = node;
        if (this.sceneData && this.node && this.sharedId) {
            this.sceneData.addNode(this.sharedId, this.node);
        }
        this.node = node;
    };
}
export default SharedElement;
//# sourceMappingURL=SharedElement.js.map