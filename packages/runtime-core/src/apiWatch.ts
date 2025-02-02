import { isReactive, ReactiveEffect } from '@vue/reactivity';
import { queuePreFlushCb } from '@vue/runtime-core';
import { hasChanged, isObject, EMPTY_OBJ } from '@vue/shared';

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
}

export function watch(source, cb: Function, options?: WatchOptions) {
  return doWatch(source, cb, options);
}

function doWatch(source, cb: Function, { immediate, deep }: WatchOptions = EMPTY_OBJ) {
  let getter: () => any;

  if (isReactive(source)) {
    getter = () => {
      return source;
    };
    // 引用类型，默认开启深度监听
    deep = true;
  } else {
    getter = () => {};
  }

  // 如果监听的是对象，那么上面直接将 deep 设置为了true，
  // 所以这里的 baseGetter 其实就是 source，
  // 所以需要用 traverse 递归 source ，访问所有属性，完成依赖收集
  if (cb && deep) {
    const baseGetter = getter; // 浅拷贝
    getter = () => traverse(baseGetter());
  }

  // 旧值
  let oldValue = {};

  // 重要的 job 函数
  const job = () => {
    if (cb) {
      // 求新值
      const newValue = effect.run();

      // 对比新值与旧值
      if (deep || hasChanged(newValue, oldValue)) {
        // 执行传入 watch 的回调
        cb(newValue, oldValue);
        // 更新旧值
        oldValue = newValue;
      }
    }
  };

  // 调度器函数
  let scheduler = () => {
    return queuePreFlushCb(job);
  };

  const effect = new ReactiveEffect(getter, scheduler);

  if (cb) {
    if (immediate) {
      job();
    } else {
      // 求旧值
      oldValue = effect.run();
    }
  } else {
    effect.run();
  }

  return () => {
    // 停止侦听
    effect.stop();
  };
}

// 递归value 实现依赖收集
export function traverse(value: unknown) {
  if (!isObject(value)) {
    return value;
  }

  for (const key in value as object) {
    traverse((value as object)[key]);
  }

  return value;
}
