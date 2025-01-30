import { EMPTY_OBJ, isString } from '@vue/shared';
import { Text, Comment, Fragment } from './vnode';
import { ShapeFlags } from 'packages/shared/src/shapeFlags';
import { isSameVNodeType } from './vnode';
import { normalizeVNode, renderComponentRoot } from './componentRenderUtils';
import { createComponentInstance, setupComponent } from './component';
import { ReactiveEffect } from 'packages/reactivity/src/effect';
import { queuePreFlushCb } from './scheduler';

export interface RendererOptions {
  // 创建元素
  createElement: (type: string) => any;

  // 给标签设置文本
  setElementText: (node: Element, text: string) => void;

  // 处理标签身上的所有属性
  pathProp: (el: Element, key: string, prevValue: any, nextValue: any) => void;

  // 插入元素
  insert: (el: Element, parent: Element, anchor?: Element | null) => void;

  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void;

  // 卸载指定dom
  remove(el): void;

  // 创建 Text 节点
  createText(text: string);

  //设置 text
  setText(node, text): void;

  //设置 text
  createComment(text: string);
}

export function createRenderer(options: RendererOptions) {
  return baseCreateRenderer(options);
}

// 创建渲染器的核心函数
function baseCreateRenderer(options: RendererOptions): any {
  // 从渲染配置对象 options 中解构出需要的函数
  // 需要跨平台渲染，故重命名为host开头
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    createText: hostCreateText,
    setText: hostSetText,
    createComment: hostCreateComment
  } = options;

  console.log('options执行', options);

  // 处理原生DOM元素节点
  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode === null) {
      // 挂载
      mountElement(newVNode, container, anchor);
    } else {
      // 更新
      patchElement(oldVNode, newVNode);
    }
  };

  // 处理文本节点
  const processText = (oldVNode, newVNode, container, anchor) => {
    // 不存在旧的节点，则为 挂载 操作
    if (oldVNode == null) {
      // 生成节点
      newVNode.el = hostCreateText(newVNode.children as string);
      // 挂载 使用不同平台的原生方法
      hostInsert(newVNode.el, container, anchor);
    }
    // 存在旧的节点，则为 更新 操作
    else {
      const el = (newVNode.el = oldVNode.el!);
      // 新旧节点的文本不同，则更新文本
      if (newVNode.children !== oldVNode.children) {
        // 更新 使用不同平台的原生方法
        hostSetText(el, newVNode.children as string);
      }
    }
  };

  // 处理注释节点（无需响应式）
  const processCommentNode = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 生成节点
      newVNode.el = hostCreateComment((newVNode.children as string) || '');
      // 挂载
      hostInsert(newVNode.el, container, anchor);
    } else {
      // 无更新
      newVNode.el = oldVNode.el;
    }
  };

  // 处理Fragment 的打补丁操作
  const processFragment = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      mountChildren(newVNode.children, container, anchor);
    } else {
      patchChildren(oldVNode, newVNode, container, anchor);
    }
  };

  // 处理组件
  const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载
      mountComponent(newVNode, container, anchor);
    }
  };

  // 挂载组件
  const mountComponent = (initialVNode, container, anchor) => {
    // 生成组件实例
    initialVNode.component = createComponentInstance(initialVNode);
    // 浅拷贝，绑定同一块内存空间
    const instance = initialVNode.component;

    // 标准化组件实例数据
    setupComponent(instance);

    // 设置组件渲染
    setupRenderEffect(instance, initialVNode, container, anchor);
  };

  // 设置组件渲染
  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    // 组件挂载和更新的方法
    const componentUpdateFn = () => {
      // 当前处于 mounted 之前，即执行 挂载 逻辑
      if (!instance.isMounted) {
        // 获取 hook
        const { bm, m } = instance;

        // 执行生命周期钩子 beforeMount , 用户没传就不执行
        if (bm) {
          bm();
        }

        // 从 render 中获取需要渲染的内容
        const subTree = (instance.subTree = renderComponentRoot(instance));
        console.log('subTree', subTree);

        // 通过 patch 对 subTree，进行打补丁。即：渲染组件
        patch(null, subTree, container, anchor);

        // 执行生命周期钩子 mounted , 用户没传就不执行
        if (m) {
          m();
        }

        // 把组件根节点的 el，作为组件的 el
        initialVNode.el = subTree.el;

        // 修改 mounted 状态，表示组件已经挂载
        instance.isMounted = true;
      } else {
        let { next, vnode } = instance;

        if (!next) {
          next = vnode;
        }

        // 响应式数据更新后, 生成新的 vnode 树
        const nextTree = renderComponentRoot(instance);

        // 保存对应的 subTree，以便进行更新操作
        const prevTree = instance.subTree;
        instance.subTree = nextTree;

        // 通过 patch 进行更新操作
        patch(prevTree, nextTree, container, anchor);

        // 更新 next
        next.el = nextTree.el;
      }
    };

    // 创建包含 scheduler 的 effect 实例
    const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () =>
      queuePreFlushCb(update)
    ));

    // 生成 update 函数
    const update = (instance.update = () => effect.run());

    // 触发 update 函数，本质上触发的是 componentUpdateFn
    update();
  };

  // 挂载子节点
  const mountChildren = (children, container, anchor) => {
    // 如果是字符串，则将其拆分成单个字符 demo: 'abc' => ['a', 'b', 'c']
    if (isString(children)) {
      children = children.split('');
    }
    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]));
      patch(null, child, container, anchor);
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

  // 用于更新元素的函数
  const patchElement = (oldVNode, newVNode) => {
    const el = (newVNode.el = oldVNode.el); // 浅拷贝

    const oldProps = oldVNode.props || EMPTY_OBJ;
    const newProps = newVNode.props || EMPTY_OBJ;

    patchChildren(oldVNode, newVNode, el, null);

    patchProps(el, newVNode, oldProps, newProps);
  };

  // 更新子节点
  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    // 旧节点的 children
    const c1 = oldVNode && oldVNode.children;
    // 旧节点的 prevShapeFlag
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
    // 新节点的 children
    const c2 = newVNode.children;

    // 新节点的 shapeFlag
    const { shapeFlag } = newVNode;

    // 新子节点为 TEXT_CHILDREN
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧子节点为 ARRAY_CHILDREN
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO: 卸载旧子节点
      }
      // 新旧子节点不同
      if (c2 !== c1) {
        // 挂载新子节点的文本
        hostSetElementText(container, c2 as string);
      }
    } else {
      // 旧子节点为 ARRAY_CHILDREN
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新子节点也为 ARRAY_CHILDREN
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 这里要进行 diff 运算
          // patchKeyedChildren(c1, c2, container, anchor);
        }
        // 新子节点不为 ARRAY_CHILDREN，则直接卸载旧子节点
        else {
          // TODO: 卸载
        }
      } else {
        // 旧子节点为 TEXT_CHILDREN
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 删除旧的文本
          hostSetElementText(container, '');
        }
        // 新子节点为 ARRAY_CHILDREN
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // TODO: 单独挂载新子节点操作
        }
      }
    }
  };

  // 更新 props
  const patchProps = (el: Element, vnode, oldProps, newProps) => {
    // 新旧 props 不相同时才进行处理
    if (oldProps !== newProps) {
      // 遍历新的 props，依次触发 hostPatchProp ，赋值新属性
      for (const key in newProps) {
        const next = newProps[key];
        const prev = oldProps[key];
        if (next !== prev) {
          hostPatchProp(el, key, prev, next);
        }
      }
      // 存在旧的 props 时
      if (oldProps !== EMPTY_OBJ) {
        // 遍历旧的 props，依次触发 hostPatchProp ，删除不存在于新props 中的旧属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  };

  // 用于比较新旧 VNode 的 patch 函数
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) {
      // 如果新旧 VNode 是同一个对象，则直接返回
      return;
    }

    // 如果新旧 VNode 类型不同，则卸载旧 VNode，并挂载新 VNode
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      // 如果新旧 VNode 不是同一个对象，且旧 VNode 存在，则卸载旧 VNode
      unmount(oldVNode);
      // 置空旧 VNode , 进而触发新 VNode 的挂载操作
      oldVNode = null;
    }

    const { type, shapeFlag } = newVNode;

    switch (type) {
      case Text:
        // 如果新 VNode 的类型是文本节点，则处理文本节点的更新
        processText(oldVNode, newVNode, container, anchor);
        break;
      case Comment:
        // 如果新 VNode 的类型是注释节点，则处理注释节点的更新
        processCommentNode(oldVNode, newVNode, container, anchor);
        break;

      case Fragment:
        // 如果新 VNode 的类型是片段节点，则处理片段节点的更新
        processFragment(oldVNode, newVNode, container, anchor);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 挂载原生标签
          processElement(oldVNode, newVNode, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 挂载.vue 组件
          processComponent(oldVNode, newVNode, container, anchor);
        }
    }
  };

  // 用于创建 VNode 树的 render 函数
  const render = (vnode, container) => {
    if (vnode === null) {
      // 如果旧 vnode 为 null，则直接将容器清空
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 如果 vnode 不为 null，则调用 patch 方法进行更新
      patch(container._vnode || null, vnode, container);
    }

    // 更新 _vnode ，即将新的 vnode 赋值给容器的 _vnode 属性，作为旧的 vnode，下次渲染时可以进行比较
    container._vnode = vnode;
  };

  // 卸载指定dom
  const unmount = vnode => {
    hostRemove(vnode.el!);
  };

  return {
    render
  };
}
