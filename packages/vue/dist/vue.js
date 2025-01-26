var Vue = (function (exports) {
    'use strict';

    var mutableHandlers = {};

    var reactiveMap = new WeakMap();
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    // 在这个函数中，我们用 new Proxy() 代理了 target
    function createReactiveObject(target, baseHandlers, proxyMap) {
        // 先从 proxyMap 中读取，如果存在则直接返回【单例模式的思想】
        var existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 否则，创建代理对象，并将其存储到 proxyMap 中
        var proxy = new Proxy(target, baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }

    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
