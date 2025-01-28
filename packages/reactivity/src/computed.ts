import { isFunction } from '@vue/shared';
import { ReactiveEffect } from './effect';
import { Dep } from './deps';
import { trackRefValue, triggerRefValue } from './ref';

export function computed(getterOrOptions) {
  // getterOrOptions 是一个函数或者一个配置对象
  let getter;

  const onlyGetter = isFunction(getterOrOptions);

  // 如果只传入了 getter 函数，则将 getter 赋值给 getter
  if (onlyGetter) {
    getter = getterOrOptions;
  }

  const cRef = new ComputedRefImpl(getter);

  return cRef;
}

export class ComputedRefImpl<T> {
  // 脏值检测，_dirty 是一个标识，用于判断是否需要重新计算
  public _dirty = true;

  // dep 是一个 Set 集合，用于存储副作用函数
  public dep?: Dep = undefined;

  //  _value 是 computed 的值
  private _value!: T;

  // effect 是一个 ReactiveEffect 实例，作用是当 computed 被读取时，会执行这个 effect
  public readonly effect: ReactiveEffect<T>;

  public readonly __v_isRef = true;

  constructor(getter) {
    this.effect = new ReactiveEffect(getter, () => {
      // 这就是调度器函数 scheduler
      if (this._dirty === false) {
        // 如果 _dirty 为 false，则将 _dirty 赋值为 true
        this._dirty = true;

        // 再触发依赖
        triggerRefValue(this);
      }
    });

    this.effect.computed = this;
  }

  // 访问 computed 的值时，会执行这个 get 标记对应的回调
  get value() {
    // 收集依赖
    trackRefValue(this);

    // 如果 _dirty 为 true，则执行 effect.run() 方法，重新计算 computed 的值
    if (this._dirty) {
      this._dirty = false;
      // 执行副作用函数, 并将返回值赋值给 _value
      this._value = this.effect.run();
    }

    return this._value;
  }
}
