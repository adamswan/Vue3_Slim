import { LifecycleHooks } from './component';

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);

// 创建一个指定的生命周期钩子
export function createHook(lifecycle: LifecycleHooks) {
  return (hook, target) => injectHook(lifecycle, hook, target);
}

// 注册生命周期钩子
export function injectHook(type: LifecycleHooks, hook: Function, target): Function | undefined {
  // 将 hook 注册到 组件实例中
  if (target) {
    target[type] = hook;
    return hook;
  }
}
