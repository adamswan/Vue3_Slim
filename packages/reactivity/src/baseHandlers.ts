import { track, trigger } from './effect';

function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    const res = Reflect.get(target, key, receiver);

    // 在 track() 函数中收集依赖
    track(target, key);

    return res;
  };
}

function createSetter() {
  return function set(target: object, key: string | symbol, value: unknown, receiver: object) {
    const result = Reflect.set(target, key, value, receiver);

    // 在 trigger() 函数中触发依赖
    trigger(target, key, value);

    return result;
  };
}

const get = createGetter();
const set = createSetter();

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set
};
