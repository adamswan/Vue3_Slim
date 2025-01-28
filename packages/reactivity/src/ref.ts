import { Dep, createDep } from './deps';
import { toReactive } from './reactive';
import { activeEffect, trackEffects, triggerEffects } from './effect';
import { hasChanged } from '@vue/shared';

export interface Ref<T = any> {
  value: T;
}

export function ref(value?: unknown) {
  return createRef(value, false);
}

function createRef(rawValue: unknown, shallow: boolean) {
  // 如果已经是 ref 类型，则直接返回
  if (isRef(rawValue)) {
    return rawValue;
  }

  return new RefImpl(rawValue, shallow);
}

class RefImpl<T> {
  // _value 是传入 ref() 的值
  private _value: T;

  // rawValue 是 _value 的原始值
  private _rawValue: T;

  // dep 是一个 Set 集合，用于存储副作用函数
  public dep?: Dep = undefined;

  // __v_isRef 是一个标识，用于判断是否为 ref 对象
  public readonly __v_isRef = true;

  // 经过判断后，将 value 赋值给 _value
  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = value;
    this._value = __v_isShallow ? value : toReactive(value);
  }

  // 在 get 对应的回调中收集依赖、并返回 _value
  get value() {
    trackRefValue(this);
    return this._value;
  }

  // 在 set 对应的回调中设定新value，并触发依赖
  set value(newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      // 判断值前后是否发生变化
      // 如果发生变化，则将新值赋值给 _rawValue, 下一次还要判断
      this._rawValue = newVal;
      this._value = toReactive(newVal);
      triggerRefValue(this);
    }
  }
}

// 收集依赖
export function trackRefValue(ref) {
  if (activeEffect) {
    trackEffects(ref.dep || (ref.dep = createDep()));
  }
}

// 触发依赖
export function triggerRefValue(ref) {
  if (ref.dep) {
    triggerEffects(ref.dep);
  }
}

// 判断是否为 ref 对象
export function isRef(r: any): r is Ref {
  if (r && r.__v_isRef === true) {
    return true;
  } else {
    return false;
  }
}
