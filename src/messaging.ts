export type MessageType = 'info' | 'movement' | 'attack' | 'combat' | 'error';

export type GameMessage = {
    id?: string;
    type: MessageType;
    text: string;
    data?: any;
    time?: string;
};

class MessageBus {
    private listeners = new Set<(m: GameMessage) => void>();

    on(cb: (m: GameMessage) => void): void {
        this.listeners.add(cb);
    }

    off(cb: (m: GameMessage) => void): void {
        this.listeners.delete(cb);
    }

    emit(msg: GameMessage): void {
        msg.time = msg.time ?? new Date().toISOString();
        for (const cb of Array.from(this.listeners)) {
            try {
                cb(msg);
            } catch (e) {
                // swallow listener errors
                // eslint-disable-next-line no-console
                console.error('MessageBus listener error', e);
            }
        }
    }
}

export const globalBus = new MessageBus();

export default MessageBus;
