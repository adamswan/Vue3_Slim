// 处理标签属性
export function patchAttr(el: Element, key: string, value: any) {
  if (value == null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
