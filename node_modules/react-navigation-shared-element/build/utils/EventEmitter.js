export class EventEmitter {
    listeners = {};
    emit(name, e) {
        if (this.listeners[name]) {
            this.listeners[name].forEach((callback) => callback(e));
        }
    }
    addListener(name, callback) {
        this.listeners[name] = this.listeners[name] || [];
        this.listeners[name].push(callback);
        return () => this.listeners[name].splice(this.listeners[name].indexOf(callback), 1);
    }
}
//# sourceMappingURL=EventEmitter.js.map