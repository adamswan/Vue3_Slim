import { ReactiveEffect } from './effect';

export type Dep = Set<ReactiveEffect>;

// 创建一个 Set 集合，用于存储副作用函数
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep;

  return dep;
};
