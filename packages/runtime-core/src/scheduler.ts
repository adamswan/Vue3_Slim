// pendingPreFlushCbs 是一个数组，用于存储需要在 preFlush 阶段执行的回调函数
const pendingPreFlushCbs: Function[] = [];

// currentFlushPromise 是一个 Promise 对象，用于表示当前正在执行的刷新任务
let currentFlushPromise: Promise<void> | null = null;

// isFlushPending 是一个开关，用于表示是否有刷新任务正在等待执行
let isFlushPending = false;

// resolvedPromise 是一个已成功的 Promise 对象，用于生成微任务队列
const resolvedPromise = Promise.resolve() as Promise<any>;

export function queuePreFlushCb(cb: Function) {
  queueCb(cb, pendingPreFlushCbs);
}

export function queueCb(cb: Function, pendingQueue: Function[]) {
  // 将回调函数添加到 pendingQueue 数组中
  pendingQueue.push(cb);

  queueFlush();
}

function queueFlush() {
  // 如果当前没有刷新任务正在等待执行，则调用 flushJobs 函数执行刷新任务
  if (!isFlushPending) {
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}

function flushJobs() {
  isFlushPending = false;
  // 执行 pendingPreFlushCbs 数组中的回调函数
  flushPreFlushCbs();
}

export function flushPreFlushCbs() {
  if (pendingPreFlushCbs.length) {
    let activePreFlushCbs = [...new Set(pendingPreFlushCbs)];

    pendingPreFlushCbs.length = 0;

    for (let i = 0; i < activePreFlushCbs.length; i++) {
      activePreFlushCbs[i]();
    }
  }
}
