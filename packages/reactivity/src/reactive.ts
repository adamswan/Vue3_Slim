import { mutableHandlers } from './baseHandlers';

// reactiveMap 就是 proxyMap，是一个 WeakMap，
// 它的键是原始对象，值是代理对象
// 作用：防止用户重复代理同一个对象
export const reactiveMap = new WeakMap<object, any>();

export function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap);
}

// 在这个函数中，我们用 new Proxy() 代理了 target
function createReactiveObject(
  target: object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  // 先从 proxyMap 中读取，如果存在则直接返回【单例模式的思想】
  const existingProxy = proxyMap.get(target);

  if (existingProxy) {
    return existingProxy;
  }

  // 否则，创建代理对象，并将其存储到 proxyMap 中
  const proxy = new Proxy(target, baseHandlers);

  proxyMap.set(target, proxy);

  return proxy;
}
