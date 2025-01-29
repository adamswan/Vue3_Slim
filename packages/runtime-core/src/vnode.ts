import { isArray, isFunction, isObject, isString } from '@vue/shared';
import { normalizeClass } from 'packages/shared/src/normalizeProp';
import { ShapeFlags } from 'packages/shared/src/shapeFlags';

export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');
export const Comment = Symbol('Comment');

// VNode 对象属性只选取最重要的几个
export interface VNode {
  __v_isVNode: true; // 标识是否为 vnode
  key: any;
  type: any; // vnode 的类型
  props: any;
  children: any;
  shapeFlag: number; // vnode.type + children 组合后，用二进制的位运算来标识其类型
}

// 判断是否为 vnode
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false;
}

// 处理 shapeFlag 类型、处理类名、触发 createBaseVNode 函数
export function createVNode(type, props, children?): VNode {
  // 通过 bit 位处理 shapeFlag 类型
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type) // 如果是对象，那么就是一个.vue组件
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;

  if (props) {
    // 对样式class进行增强处理
    // 解构出 class 和 style属性，并将 class 重命名为 klass
    let { class: klass, style } = props;
    if (klass && !isString(klass)) {
      // 格式化类名后再设置为vnode节点的class属性，这样就给盒子添加上了class属性
      props.class = normalizeClass(klass);
    }
  }

  return createBaseVNode(type, props, children, shapeFlag);
}

// 字面量的形式创建 vnode 对象
function createBaseVNode(type, props, children, shapeFlag) {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    shapeFlag,
    key: props?.key || null
  } as VNode;

  // 格式化 children, 因为传入的 children 可能是多种类型
  normalizeChildren(vnode, children);

  return vnode;
}

export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0;

  const { shapeFlag } = vnode;

  if (children == null) {
    children = null;
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === 'object') {
    // TODO: object
  } else if (isFunction(children)) {
    // TODO: function
  } else {
    // children 为 string
    children = String(children);
    // 为 type 指定 Flags
    type = ShapeFlags.TEXT_CHILDREN;
  }

  // 修改 vnode 的 chidlren
  vnode.children = children;

  // 按位或赋值
  vnode.shapeFlag |= type;
}

export { createVNode as createElementVNode };

// 创建注释节点
export function createCommentVNode(text) {
  return createVNode(Comment, null, text);
}

// 根据 key 和 type 判断是否为相同类型节点
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key;
}
