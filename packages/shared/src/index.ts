export interface Ref<T = any> {
  value: T;
}

// 判断是否为引用类型
export function isObject(value: unknown) {
  if (value !== null && typeof value === 'object') {
    return true;
  }
  return false;
}
