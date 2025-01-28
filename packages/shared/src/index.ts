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

// 合并两个对象
export function extend(a: object, b: object) {
  return Object.assign(a, b);
}
// export const extend = Object.assign;

// 空对象
export const EMPTY_OBJ: { readonly [key: string]: any } = {};
