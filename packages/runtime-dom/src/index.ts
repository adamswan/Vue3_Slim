import { createRenderer } from '@vue/runtime-core';
import { extend, isString } from '@vue/shared';
import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';
import { RendererOptions } from '@vue/runtime-core';

// 渲染器的配置项
const rendererOptions = extend({ patchProp }, nodeOps) as RendererOptions;

// 临时变量，存储渲染器
let renderer;

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}

// 调用 ensureRenderer，拿到大对象，再调用内部的 render 方法
// 最后将一连串调用合并为一个render向外暴露
export const render = (...args) => {
  ensureRenderer().render(...args);
};
