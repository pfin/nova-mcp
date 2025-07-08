/**
 * Priority Queue implementation for task scheduling
 * Higher priority values are dequeued first
 */
export declare class PriorityQueue<T extends {
    priority: number;
}> {
    private items;
    enqueue(item: T): void;
    dequeue(): T | undefined;
    peek(): T | undefined;
    size(): number;
    isEmpty(): boolean;
    filter(predicate: (item: T) => boolean): T[];
    remove(predicate: (item: T) => boolean): T[];
    toArray(): T[];
}
//# sourceMappingURL=priority-queue.d.ts.map