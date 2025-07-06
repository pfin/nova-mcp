/**
 * Priority Queue implementation for task scheduling
 * Higher priority values are dequeued first
 */
export class PriorityQueue {
    items = [];
    enqueue(item) {
        // Binary search to find insertion point
        let low = 0;
        let high = this.items.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.items[mid].priority > item.priority) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        this.items.splice(low, 0, item);
    }
    dequeue() {
        return this.items.shift();
    }
    peek() {
        return this.items[0];
    }
    size() {
        return this.items.length;
    }
    isEmpty() {
        return this.items.length === 0;
    }
    // Get all items matching a predicate
    filter(predicate) {
        return this.items.filter(predicate);
    }
    // Remove items matching a predicate
    remove(predicate) {
        const removed = [];
        this.items = this.items.filter(item => {
            if (predicate(item)) {
                removed.push(item);
                return false;
            }
            return true;
        });
        return removed;
    }
    // Get snapshot of queue state
    toArray() {
        return [...this.items];
    }
}
//# sourceMappingURL=priority-queue.js.map