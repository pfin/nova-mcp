/**
 * Priority Queue implementation for task scheduling
 * Higher priority values are dequeued first
 */

export class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    // Binary search to find insertion point
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.items[mid].priority > item.priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.items.splice(low, 0, item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // Get all items matching a predicate
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  // Remove items matching a predicate
  remove(predicate: (item: T) => boolean): T[] {
    const removed: T[] = [];
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
  toArray(): T[] {
    return [...this.items];
  }
}