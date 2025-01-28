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
    // 判断是否为函数
    function isFunction(value) {
        return typeof value === 'function';
    }
    // 合并两个对象
    function extend(a, b) {
        return Object.assign(a, b);
    }
    // export const extend = Object.assign;
    // 空对象
    var EMPTY_OBJ = {};

    // 接收函数，并注册为副作用函数
    function effect(fn, options) {
        var _effect = new ReactiveEffect(fn);
        // _effect 本身是含有副作用函数的对象，如果传入了 options，
        // 且 options 中有调度器函数的话，就能让_effect也具备调度器函数
        // 这样就可以在 triggerEffect() 函数中触发调度器函数，而不直接执行副作用函数
        if (options) {
            extend(_effect, options);
        }
        // 如果开启了 lazy，则不立即执行副作用函数
        if (!options || !options.lazy) {
            _effect.run();
        }
    }
    // 存储当前激活的 ReactiveEffect
    var activeEffect;
    var ReactiveEffect = /** @class */ (function () {
        function ReactiveEffect(fn, scheduler) {
            if (scheduler === void 0) { scheduler = null; }
            this.fn = fn;
            this.scheduler = scheduler;
            //
        }
        ReactiveEffect.prototype.run = function () {
            // 执行副作用函数
            activeEffect = this;
            return this.fn();
        };
        ReactiveEffect.prototype.stop = function () {
            // 停止侦听，将来实现
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
        // console.log('targetMap', targetMap);
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
        // 先执行 computed 的副作用函数
        for (var i = 0; i < effects.length; i++) {
            var effect_1 = effects[i];
            if (effect_1.computed) {
                triggerEffect(effect_1);
            }
        }
        // 再执行普通的副作用函数
        for (var i = 0; i < effects.length; i++) {
            var effect_2 = effects[i];
            if (!effect_2.computed) {
                triggerEffect(effect_2);
            }
        }
    }
    function triggerEffect(effect) {
        // 如果存在调度器，则调用调度器
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            // 否则直接执行副作用函数
            effect.run();
        }
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
        // 添加标识，表示这是一个 reactive 对象
        proxy["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */] = true;
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
    // 判断是否为 reactive 对象
    function isReactive(value) {
        return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
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

    function computed(getterOrOptions) {
        // getterOrOptions 是一个函数或者一个配置对象
        var getter;
        var onlyGetter = isFunction(getterOrOptions);
        // 如果只传入了 getter 函数，则将 getter 赋值给 getter
        if (onlyGetter) {
            getter = getterOrOptions;
        }
        var cRef = new ComputedRefImpl(getter);
        return cRef;
    }
    var ComputedRefImpl = /** @class */ (function () {
        function ComputedRefImpl(getter) {
            var _this = this;
            // 脏值检测，_dirty 是一个标识，用于判断是否需要重新计算
            this._dirty = true;
            // dep 是一个 Set 集合，用于存储副作用函数
            this.dep = undefined;
            this.__v_isRef = true;
            this.effect = new ReactiveEffect(getter, function () {
                // 这就是调度器函数 scheduler
                if (_this._dirty === false) {
                    // 如果 _dirty 为 false，则将 _dirty 赋值为 true
                    _this._dirty = true;
                    // 再触发依赖
                    triggerRefValue(_this);
                }
            });
            this.effect.computed = this;
        }
        Object.defineProperty(ComputedRefImpl.prototype, "value", {
            // 访问 computed 的值时，会执行这个 get 标记对应的回调
            get: function () {
                // 收集依赖
                trackRefValue(this);
                // 如果 _dirty 为 true，则执行 effect.run() 方法，重新计算 computed 的值
                if (this._dirty) {
                    this._dirty = false;
                    // 执行副作用函数, 并将返回值赋值给 _value
                    this._value = this.effect.run();
                }
                return this._value;
            },
            enumerable: false,
            configurable: true
        });
        return ComputedRefImpl;
    }());

    // pendingPreFlushCbs 是一个数组，用于存储需要在 preFlush 阶段执行的回调函数
    var pendingPreFlushCbs = [];
    // isFlushPending 是一个开关，用于表示是否有刷新任务正在等待执行
    var isFlushPending = false;
    // resolvedPromise 是一个已成功的 Promise 对象，用于生成微任务队列
    var resolvedPromise = Promise.resolve();
    function queuePreFlushCb(cb) {
        queueCb(cb, pendingPreFlushCbs);
    }
    function queueCb(cb, pendingQueue) {
        // 将回调函数添加到 pendingQueue 数组中
        pendingQueue.push(cb);
        queueFlush();
    }
    function queueFlush() {
        // 如果当前没有刷新任务正在等待执行，则调用 flushJobs 函数执行刷新任务
        if (!isFlushPending) {
            isFlushPending = true;
            resolvedPromise.then(flushJobs);
        }
    }
    function flushJobs() {
        isFlushPending = false;
        // 执行 pendingPreFlushCbs 数组中的回调函数
        flushPreFlushCbs();
    }
    function flushPreFlushCbs() {
        if (pendingPreFlushCbs.length) {
            var activePreFlushCbs = __spreadArray([], __read(new Set(pendingPreFlushCbs)), false);
            pendingPreFlushCbs.length = 0;
            for (var i = 0; i < activePreFlushCbs.length; i++) {
                activePreFlushCbs[i]();
            }
        }
    }

    function watch(source, cb, options) {
        return doWatch(source, cb, options);
    }
    function doWatch(source, cb, _a) {
        var _b = _a === void 0 ? EMPTY_OBJ : _a, immediate = _b.immediate, deep = _b.deep;
        var getter;
        if (isReactive(source)) {
            getter = function () {
                return source;
            };
            // 引用类型，默认开启深度监听
            deep = true;
        }
        else {
            getter = function () { };
        }
        // 如果监听的是对象，那么上面直接将 deep 设置为了true，
        // 所以这里的 baseGetter 其实就是 source，
        // 所以需要用 traverse 递归 source ，访问所有属性，完成依赖收集
        if (cb && deep) {
            var baseGetter_1 = getter; // 浅拷贝
            getter = function () { return traverse(baseGetter_1()); };
        }
        // 旧值
        var oldValue = {};
        // 重要的 job 函数
        var job = function () {
            if (cb) {
                // 求新值
                var newValue = effect.run();
                // 对比新值与旧值
                if (deep || hasChanged(newValue, oldValue)) {
                    // 执行传入 watch 的回调
                    cb(newValue, oldValue);
                    // 更新旧值
                    oldValue = newValue;
                }
            }
        };
        // 调度器函数
        var scheduler = function () {
            return queuePreFlushCb(job);
        };
        var effect = new ReactiveEffect(getter, scheduler);
        if (cb) {
            if (immediate) {
                job();
            }
            else {
                // 求旧值
                oldValue = effect.run();
            }
        }
        else {
            effect.run();
        }
        return function () {
            // 停止侦听
            effect.stop();
        };
    }
    // 递归value 实现依赖收集
    function traverse(value) {
        if (!isObject(value)) {
            return value;
        }
        for (var key in value) {
            traverse(value[key]);
        }
        return value;
    }

    exports.computed = computed;
    exports.effect = effect;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
