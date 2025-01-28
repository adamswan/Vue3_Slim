var Vue = (function (exports) {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    // 创建一个 Set 集合，用于存储副作用函数
    var createDep = function (effects) {
        var dep = new Set(effects);
        return dep;
    };

    // 接收函数，并注册为副作用函数
    function effect(fn) {
        var _effect = new ReactiveEffect(fn);
        // 初次执行副作用函数
        _effect.run();
    }
    // 存储当前激活的 ReactiveEffect
    var activeEffect;
    var ReactiveEffect = /** @class */ (function () {
        function ReactiveEffect(fn) {
            this.fn = fn;
            //
        }
        ReactiveEffect.prototype.run = function () {
            // 执行副作用函数
            activeEffect = this;
            return this.fn();
        };
        return ReactiveEffect;
    }());
    // targetMap 就是 WeakMap---Map---Set 的结构
    var targetMap = new WeakMap();
    // 在 track() 函数中收集依赖:
    // 本质是用 WeakMap - Map - Set ，将属性与副作用函数关联起来
    function track(target, key) {
        // console.log('触发 track() 函数', target, key);
        if (!activeEffect)
            return;
        var depsMap = targetMap.get(target);
        if (!depsMap) {
            depsMap = new Map();
            targetMap.set(target, depsMap);
        }
        var dep = depsMap.get(key);
        if (!dep) {
            dep = createDep();
            depsMap.set(key, dep);
        }
        trackEffects(dep);
        console.log('targetMap', targetMap);
    }
    // 同一个属性的副作用函数都收集到一个 Set 中
    function trackEffects(dep) {
        dep.add(activeEffect);
    }
    // 在 trigger() 函数中触发依赖
    function trigger(target, key, newValue) {
        // console.log('触发 trigger() 函数', target, key, newValue);
        var depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        var dep = depsMap.get(key);
        if (!dep)
            return;
        triggerEffects(dep);
    }
    // 遍历 Set 集合，依次执行副作用函数
    function triggerEffects(dep) {
        var effects = Array.isArray(dep) ? dep : __spreadArray([], __read(dep), false);
        for (var i = 0; i < effects.length; i++) {
            var effect_1 = effects[i];
            triggerEffect(effect_1);
        }
    }
    function triggerEffect(effect) {
        effect.run();
    }

    function createGetter() {
        return function get(target, key, receiver) {
            var res = Reflect.get(target, key, receiver);
            // 在 track() 函数中收集依赖
            track(target, key);
            return res;
        };
    }
    function createSetter() {
        return function set(target, key, value, receiver) {
            var result = Reflect.set(target, key, value, receiver);
            // 在 trigger() 函数中触发依赖
            trigger(target, key);
            return result;
        };
    }
    var get = createGetter();
    var set = createSetter();
    var mutableHandlers = {
        get: get,
        set: set
    };

    // 判断是否为引用类型
    function isObject(value) {
        if (value !== null && typeof value === 'object') {
            return true;
        }
        return false;
    }
    // 判断值前后是否发生变化
    function hasChanged(value, oldValue) {
        if (Object.is(value, oldValue)) {
            return false;
        }
        return true;
    }

    // reactiveMap 就是 proxyMap，是一个 WeakMap，
    // 它的键是原始对象，值是代理对象
    // 作用：防止用户重复代理同一个对象
    var reactiveMap = new WeakMap();
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    // 在这个函数中，我们用 new Proxy() 代理了 target
    function createReactiveObject(target, // 原始对象
    baseHandlers, // Proxy 的 handlers
    proxyMap // 存储代理对象的 weakmap
    ) {
        // 先从 proxyMap 中读取，如果存在则直接返回, 【单例模式的思想】
        var existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 否则，创建代理对象，并将其存储到 proxyMap 中
        var proxy = new Proxy(target, baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    // 判断是否为引用类型
    // 如果是，则交给 reactive 处理
    // 如果不是，则直接返回
    function toReactive(value) {
        if (isObject(value)) {
            return reactive(value);
        }
        return value;
    }

    function ref(value) {
        return createRef(value, false);
    }
    function createRef(rawValue, shallow) {
        // 如果已经是 ref 类型，则直接返回
        if (isRef(rawValue)) {
            return rawValue;
        }
        return new RefImpl(rawValue, shallow);
    }
    var RefImpl = /** @class */ (function () {
        // 经过判断后，将 value 赋值给 _value
        function RefImpl(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            // dep 是一个 Set 集合，用于存储副作用函数
            this.dep = undefined;
            // __v_isRef 是一个标识，用于判断是否为 ref 对象
            this.__v_isRef = true;
            this._rawValue = value;
            this._value = __v_isShallow ? value : toReactive(value);
        }
        Object.defineProperty(RefImpl.prototype, "value", {
            // 在 get 对应的回调中收集依赖、并返回 _value
            get: function () {
                trackRefValue(this);
                return this._value;
            },
            // 在 set 对应的回调中设定新value，并触发依赖
            set: function (newVal) {
                if (hasChanged(newVal, this._rawValue)) {
                    // 判断值前后是否发生变化
                    // 如果发生变化，则将新值赋值给 _rawValue, 下一次还要判断
                    this._rawValue = newVal;
                    this._value = toReactive(newVal);
                    triggerRefValue(this);
                }
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    // 收集依赖
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    // 触发依赖
    function triggerRefValue(ref) {
        if (ref.dep) {
            triggerEffects(ref.dep);
        }
    }
    // 判断是否为 ref 对象
    function isRef(r) {
        if (r && r.__v_isRef === true) {
            return true;
        }
        else {
            return false;
        }
    }

    exports.effect = effect;
    exports.reactive = reactive;
    exports.ref = ref;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
