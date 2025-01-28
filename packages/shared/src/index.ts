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

// 判断值前后是否发生变化
export function hasChanged(value: any, oldValue: any): boolean {
  if (Object.is(value, oldValue)) {
    return false;
  }
  return true;
}

// 判断是否为函数
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}
