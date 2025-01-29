import { Text, Comment, Fragment } from './vnode';
import { ShapeFlags } from 'packages/shared/src/shapeFlags';

export interface RendererOptions {
  // 创建元素
  createElement: (type: string) => any;

  // 给标签设置文本
  setElementText: (node: Element, text: string) => void;

  // 处理标签身上的所有属性
  pathProp: (el: Element, key: string, prevValue: any, nextValue: any) => void;

  // 插入元素
  insert: (el: Element, parent: Element, anchor?: Element | null) => void;
}

export function crateRenderer(options: RendererOptions) {
  return baseCreateRenderer(options);
}

// 创建渲染器的核心函数
function baseCreateRenderer(options: RendererOptions): any {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    pathProp: hostPatchProp,
    insert: hostInsert
  } = options;

  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode === null) {
      // 挂载
      mountElement(newVNode, container, anchor);
    } else {
      // 更新
    }
  };

  // 用于挂载元素的函数
  const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag } = vnode;

    // 1. 创建元素
    const el = (vnode.el = hostCreateElement(type));

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 2. 设置文本
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //
    }

    if (props) {
      // 3. 设置 props
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    // 4. 插入
    hostInsert(el, container, anchor);
  };

  // 用于比较新旧 VNode 的 patch 函数
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) {
      // 如果新旧 VNode 是同一个对象，则直接返回
      return;
    }

    const { type, shapeFlag } = newVNode;

    switch (type) {
      case Text:
        // 如果新 VNode 的类型是文本节点，则处理文本节点的更新
        // processText(oldVNode, newVNode, container);
        break;
      case Comment:
        // 如果新 VNode 的类型是注释节点，则处理注释节点的更新
        // processComment(oldVNode, newVNode, container);
        break;

      case Fragment:
        // 如果新 VNode 的类型是片段节点，则处理片段节点的更新
        // processFragment(oldVNode, newVNode, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 原生 element
          processElement(oldVNode, newVNode, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // .vue 组件
        }
    }
  };

  // 用于创建 VNode 树的 render 函数
  const render = (vnode, container) => {
    if (vnode === null) {
      // 如果 vnode 为 null，则直接将容器清空
    } else {
      // 如果 vnode 不为 null，则调用 patch 方法进行渲染
      patch(container._vnode || null, vnode, container);
    }

    // 更新 _vnode ，即将新的 vnode 赋值给容器的 _vnode 属性，作为旧的 vnode，下次渲染时可以进行比较
    container._vnode = vnode;
  };

  return {
    render
  };
}
