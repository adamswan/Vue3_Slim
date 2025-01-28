import { mutableHandlers } from './baseHandlers';
import { isObject } from '@vue/shared';

// 枚举 ReactiveFlags
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

// reactiveMap 就是 proxyMap，是一个 WeakMap，
// 它的键是原始对象，值是代理对象
// 作用：防止用户重复代理同一个对象
export const reactiveMap = new WeakMap<object, any>();

export function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap);
}

// 在这个函数中，我们用 new Proxy() 代理了 target
function createReactiveObject(
  target: object, // 原始对象
  baseHandlers: ProxyHandler<any>, // Proxy 的 handlers
  proxyMap: WeakMap<object, any> // 存储代理对象的 weakmap
) {
  // 先从 proxyMap 中读取，如果存在则直接返回, 【单例模式的思想】
  const existingProxy = proxyMap.get(target);

  if (existingProxy) {
    return existingProxy;
  }

  // 否则，创建代理对象，并将其存储到 proxyMap 中
  const proxy = new Proxy(target, baseHandlers);

  // 添加标识，表示这是一个 reactive 对象
  proxy[ReactiveFlags.IS_REACTIVE] = true;

  proxyMap.set(target, proxy);

  return proxy;
}

// 判断是否为引用类型
// 如果是，则交给 reactive 处理
// 如果不是，则直接返回
export function toReactive<T extends unknown>(value: T): T {
  if (isObject(value)) {
    return reactive(value as object);
  }
  return value;
}

// 判断是否为 reactive 对象
export function isReactive(value): boolean {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}
