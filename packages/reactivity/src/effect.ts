// 在 track() 函数中收集依赖
export function track(target: object, key: unknown) {
  console.log('触发 track() 函数', target, key);
}

// 在 trigger() 函数中触发依赖
export function trigger(target: object, key: unknown, newValue: unknown) {
  console.log('触发 trigger() 函数', target, key, newValue);
}
