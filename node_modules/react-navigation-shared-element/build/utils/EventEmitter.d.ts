export declare class EventEmitter {
    private listeners;
    emit(name: string, e: any): void;
    addListener(name: string, callback: (any: any) => any): () => void;
}
