// 浏览器端，DOM元素的增删改查操作
const doc = document;

export const nodeOps = {
  // 插入指定元素到指定位置
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },

  // 创建指定DOM
  createElement: (tag): Element => {
    const el = doc.createElement(tag);

    return el;
  },

  // 为指定的 DOM 设置文本内容
  setElementText: (el, text) => {
    // console.log('188', el, text);
    el.textContent = text;
  },

  // 删除指定DOM
  remove: child => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },

  // 创建 Text 节点
  createText: text => doc.createTextNode(text),

  // 设置 text
  setText: (node, text) => {
    node.nodeValue = text;
  },

  // 创建 Comment 节点
  createComment: text => doc.createComment(text)
};
