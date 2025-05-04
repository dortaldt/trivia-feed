import { StackNavigationState } from "@react-navigation/native";
import { EventEmitter } from "./utils/EventEmitter";
/**
 * A variation of useFocusEvents that uses a custom emitter
 * and emits events using useLayoutEffect instead of useEffect.
 * This enables shared element to respond to focus events in
 * a timely manner.
 * https://github.com/react-navigation/react-navigation/blob/master/packages/core/src/useFocusEvents.tsx
 */
export declare function useSharedElementFocusEvents<ParamList extends Record<string, object | undefined>>({ state, emitter, }: {
    state: StackNavigationState<ParamList>;
    emitter: EventEmitter;
}): void;
