import { Dep, createDep } from './deps';

// 接收函数，并注册为副作用函数
export function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn);

  // 初次执行副作用函数
  _effect.run();
}

// 存储当前激活的 ReactiveEffect
export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any> {
  constructor(public fn: () => T) {
    //
  }

  run() {
    // 执行副作用函数
    activeEffect = this;
    return this.fn();
  }
}

type KeyToDepMap = Map<any, Dep>;

// targetMap 就是 WeakMap---Map---Set 的结构
const targetMap = new WeakMap<any, KeyToDepMap>();

// 在 track() 函数中收集依赖:
// 本质是用 WeakMap - Map - Set ，将属性与副作用函数关联起来
export function track(target: object, key: unknown) {
  // console.log('触发 track() 函数', target, key);
  if (!activeEffect) return;

  let depsMap = targetMap.get(target);

  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);

  if (!dep) {
    dep = createDep();
    depsMap.set(key, dep);
  }

  trackEffects(dep);

  console.log('targetMap', targetMap);
}

// 同一个属性的副作用函数都收集到一个 Set 中
export function trackEffects(dep: Dep) {
  dep.add(activeEffect!);
}

// 在 trigger() 函数中触发依赖
export function trigger(target: object, key: unknown, newValue: unknown) {
  // console.log('触发 trigger() 函数', target, key, newValue);

  const depsMap = targetMap.get(target);

  if (!depsMap) return;

  const dep: Dep | undefined = depsMap.get(key);

  if (!dep) return;

  triggerEffects(dep);
}

// 遍历 Set 集合，依次执行副作用函数
export function triggerEffects(dep: Dep) {
  const effects = Array.isArray(dep) ? dep : [...dep];

  for (let i = 0; i < effects.length; i++) {
    let effect = effects[i];
    triggerEffect(effect);
  }
}

export function triggerEffect(effect: ReactiveEffect) {
  effect.run();
}
