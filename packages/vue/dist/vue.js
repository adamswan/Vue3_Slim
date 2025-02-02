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
    // 判断是否为一个数组
    function isArray(value) {
        return Array.isArray(value);
    }
    // 判断是否为一个 string
    function isString(value) {
        return typeof value === 'string';
    }
    // 是否 on 开头
    var onRE = /^on[^a-z]/;
    // export const isOn = (key: string) => onRE.test(key)
    function isOn(key) {
        return onRE.test(key);
    }

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

    // 规范化 class 类，处理 class 的增强
    function normalizeClass(value) {
        var res = '';
        // 判断是否为 string，如果是 string 就不需要专门处理
        if (isString(value)) {
            res = value;
        }
        // 额外的数组增强。官方案例：https://cn.vuejs.org/guide/essentials/class-and-style.html#binding-to-arrays
        else if (isArray(value)) {
            // 循环得到数组中的每个元素，通过 normalizeClass 方法进行迭代处理
            for (var i = 0; i < value.length; i++) {
                var normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        // 额外的对象增强。官方案例：https://cn.vuejs.org/guide/essentials/class-and-style.html#binding-html-classes
        else if (isObject(value)) {
            // for in 获取到所有的 key，这里的 key（name） 即为 类名。value 为 boolean 值
            for (var name_1 in value) {
                // 把 value 当做 boolean 来看，拼接 name
                if (value[name_1]) {
                    res += name_1 + ' ';
                }
            }
        }
        // 去左右空格
        return res.trim();
    }

    var ShapeFlags;
    (function (ShapeFlags) {
        ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
        ShapeFlags[ShapeFlags["FUNCTIONAL_COMPONENT"] = 2] = "FUNCTIONAL_COMPONENT";
        ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 4] = "STATEFUL_COMPONENT";
        ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 8] = "TEXT_CHILDREN";
        ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 16] = "ARRAY_CHILDREN";
        ShapeFlags[ShapeFlags["SLOTS_CHILDREN"] = 32] = "SLOTS_CHILDREN";
        ShapeFlags[ShapeFlags["TELEPORT"] = 64] = "TELEPORT";
        ShapeFlags[ShapeFlags["SUSPENSE"] = 128] = "SUSPENSE";
        ShapeFlags[ShapeFlags["COMPONENT_SHOULD_KEEP_ALIVE"] = 256] = "COMPONENT_SHOULD_KEEP_ALIVE";
        ShapeFlags[ShapeFlags["COMPONENT_KEPT_ALIVE"] = 512] = "COMPONENT_KEPT_ALIVE";
        ShapeFlags[ShapeFlags["COMPONENT"] = 6] = "COMPONENT";
    })(ShapeFlags || (ShapeFlags = {}));

    var Fragment = Symbol('Fragment');
    var Text = Symbol('Text');
    var Comment = Symbol('Comment');
    // 判断是否为 vnode
    function isVNode(value) {
        return value ? value.__v_isVNode === true : false;
    }
    // 处理 shapeFlag 类型、处理类名、触发 createBaseVNode 函数
    function createVNode(type, props, children) {
        // 通过 bit 位处理 shapeFlag 类型
        var shapeFlag = isString(type)
            ? ShapeFlags.ELEMENT
            : isObject(type) // 如果是对象，那么就是一个.vue组件
                ? ShapeFlags.STATEFUL_COMPONENT
                : 0;
        if (props) {
            // 对样式class进行增强处理
            // 解构出 class 和 style属性，并将 class 重命名为 klass
            var klass = props.class; props.style;
            if (klass && !isString(klass)) {
                // 格式化类名后再设置为vnode节点的class属性，这样就给盒子添加上了class属性
                props.class = normalizeClass(klass);
            }
        }
        return createBaseVNode(type, props, children, shapeFlag);
    }
    // 字面量的形式创建 vnode 对象
    function createBaseVNode(type, props, children, shapeFlag) {
        var vnode = {
            __v_isVNode: true,
            type: type,
            props: props,
            shapeFlag: shapeFlag,
            key: (props === null || props === void 0 ? void 0 : props.key) || null
        };
        // 格式化 children, 因为传入的 children 可能是多种类型
        normalizeChildren(vnode, children);
        return vnode;
    }
    function normalizeChildren(vnode, children) {
        var type = 0;
        vnode.shapeFlag;
        if (children == null) {
            children = null;
        }
        else if (isArray(children)) {
            type = ShapeFlags.ARRAY_CHILDREN;
        }
        else if (typeof children === 'object') ;
        else if (isFunction(children)) ;
        else {
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
    // 根据 key 和 type 判断是否为相同类型节点
    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }

    function h(type, propsOrChildren, children) {
        // 获取用户传递的参数数量
        var l = arguments.length;
        // 如果用户只传递了两个参数，那么证明第二个参数可能是 props , 也可能是 children
        if (l === 2) {
            // 如果 第二个参数是对象，但不是数组。则第二个参数只有两种可能性：1. VNode 2.普通的 props
            if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
                // 如果是 VNode，则 第二个参数代表了 children
                if (isVNode(propsOrChildren)) {
                    return createVNode(type, null, [propsOrChildren]);
                }
                // 如果不是 VNode， 则第二个参数代表了 props
                return createVNode(type, propsOrChildren);
            }
            // 如果第二个参数不是单纯的 object，则 第二个参数代表了 props
            else {
                return createVNode(type, null, propsOrChildren);
            }
        }
        // 如果用户传递了三个或以上的参数，那么证明第二个参数一定代表了 props
        else {
            // 如果参数在三个以上，则从第二个参数开始，把后续所有参数都作为 children
            if (l > 3) {
                children = Array.prototype.slice.call(arguments, 2);
            }
            // 如果传递的参数只有三个，则 children 是单纯的 children
            else if (l === 3 && isVNode(children)) {
                children = [children];
            }
            // 触发 createVNode 方法，创建 VNode 实例
            return createVNode(type, propsOrChildren, children);
        }
    }

    // 解析 render 函数的返回值
    function renderComponentRoot(instance) {
        var vnode = instance.vnode, render = instance.render, _a = instance.data, data = _a === void 0 ? {} : _a;
        var result;
        try {
            // 解析到状态组件
            if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                // 获取到 result 返回值，如果 render 中使用了 this，则需要修改 this 指向 , 让它指向 data
                result = normalizeVNode(render.call(data, data));
            }
        }
        catch (err) {
            console.error(err);
        }
        return result;
    }
    // 标准化 VNode
    function normalizeVNode(child) {
        if (typeof child === 'object') {
            return cloneIfMounted(child);
        }
        else {
            return createVNode(Text, null, String(child));
        }
    }
    // clone VNode
    function cloneIfMounted(child) {
        return child;
    }

    var onBeforeMount = createHook("bm" /* LifecycleHooks.BEFORE_MOUNT */);
    var onMounted = createHook("m" /* LifecycleHooks.MOUNTED */);
    // 创建一个指定的生命周期钩子
    function createHook(lifecycle) {
        return function (hook, target) { return injectHook(lifecycle, hook, target); };
    }
    // 注册生命周期钩子
    function injectHook(type, hook, target) {
        // 将 hook 注册到 组件实例中
        if (target) {
            target[type] = hook;
            return hook;
        }
    }

    var uid = 0;
    // 创建组件实例
    function createComponentInstance(vnode) {
        var type = vnode.type;
        var instance = {
            uid: uid++,
            vnode: vnode,
            type: type,
            subTree: null,
            effect: null,
            update: null,
            render: null,
            // 生命周期相关
            isMounted: false,
            bc: null,
            c: null,
            bm: null,
            m: null // mounted
        };
        return instance;
    }
    // 规范化组件实例数据
    function setupComponent(instance) {
        // 为 render 赋值
        var setupResult = setupStatefulComponent(instance);
        return setupResult;
    }
    // 处理 setup 函数
    function setupStatefulComponent(instance) {
        var Component = instance.type;
        var setup = Component.setup;
        // 如果 setup 存在，则直接调用
        if (setup) {
            // 使用 composition API
            // 调用 setup 函数，得到返回值 setupResult
            var setupResult = setup();
            // 处理 返回值
            handleSetupResult(instance, setupResult);
        }
        else {
            // 使用 options API
            // 获取组件实例
            finishComponentSetup(instance);
        }
    }
    function handleSetupResult(instance, setupResult) {
        // 存在 setupResult，并且它是一个函数，则 setupResult 就是需要渲染的 render
        if (isFunction(setupResult)) {
            instance.render = setupResult;
        }
        finishComponentSetup(instance);
    }
    function finishComponentSetup(instance) {
        var Component = instance.type;
        // 组件不存在 render 时，才需要重新赋值
        if (!instance.render) {
            // 为 render 赋值
            instance.render = Component.render;
        }
        // 改变 options 中的 this 指向
        applyOptions(instance);
    }
    // 解析 options API
    function applyOptions(instance) {
        var _a = instance.type, dataOptions = _a.data, beforeCreate = _a.beforeCreate, created = _a.created, beforeMount = _a.beforeMount, mounted = _a.mounted;
        // 执行生命周期钩子 beforeCreate , 用户没传就不执行
        if (beforeCreate) {
            callHook(beforeCreate, instance.data);
        }
        // 存在 data 选项时
        if (dataOptions) {
            // 触发 dataOptions 函数，拿到 data 对象
            var data = dataOptions();
            // 如果拿到的 data 是一个对象
            if (isObject(data)) {
                // 则把 data 包装成 reactiv 的响应性数据，赋值给 instance
                // Vue3 中，即使用选项式API，也没用Object.defineProperty 来实现响应式
                // 而是使用 Proxy 来实现响应式
                instance.data = reactive(data);
            }
        }
        // 执行生命周期钩子 created , 用户没传就不执行
        if (created) {
            callHook(created, instance.data);
        }
        // 注册 beforeMount 和 mounted 钩子
        registerLifecycleHook(onBeforeMount, beforeMount);
        registerLifecycleHook(onMounted, mounted);
        function registerLifecycleHook(register, hook) {
            register(hook === null || hook === void 0 ? void 0 : hook.bind(instance.data), instance);
        }
    }
    // 触发 hooks, 并将 this 指向 instance.data, 这样用户就可以在钩子中访问到 data 中的数据
    function callHook(hook, proxy) {
        hook.bind(proxy)();
    }

    function createRenderer(options) {
        return baseCreateRenderer(options);
    }
    // 创建渲染器的核心函数
    function baseCreateRenderer(options) {
        // 从渲染配置对象 options 中解构出需要的函数
        // 需要跨平台渲染，故重命名为host开头
        var hostCreateElement = options.createElement, hostSetElementText = options.setElementText, hostPatchProp = options.patchProp, hostInsert = options.insert, hostRemove = options.remove, hostCreateText = options.createText, hostSetText = options.setText, hostCreateComment = options.createComment;
        console.log('options执行', options);
        // 处理原生DOM元素节点
        var processElement = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode === null) {
                // 挂载
                mountElement(newVNode, container, anchor);
            }
            else {
                // 更新
                patchElement(oldVNode, newVNode);
            }
        };
        // 处理文本节点
        var processText = function (oldVNode, newVNode, container, anchor) {
            // 不存在旧的节点，则为 挂载 操作
            if (oldVNode == null) {
                // 生成节点
                newVNode.el = hostCreateText(newVNode.children);
                // 挂载 使用不同平台的原生方法
                hostInsert(newVNode.el, container, anchor);
            }
            // 存在旧的节点，则为 更新 操作
            else {
                var el = (newVNode.el = oldVNode.el);
                // 新旧节点的文本不同，则更新文本
                if (newVNode.children !== oldVNode.children) {
                    // 更新 使用不同平台的原生方法
                    hostSetText(el, newVNode.children);
                }
            }
        };
        // 处理注释节点（无需响应式）
        var processCommentNode = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 生成节点
                newVNode.el = hostCreateComment(newVNode.children || '');
                // 挂载
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                // 无更新
                newVNode.el = oldVNode.el;
            }
        };
        // 处理Fragment 的打补丁操作
        var processFragment = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                mountChildren(newVNode.children, container, anchor);
            }
            else {
                patchChildren(oldVNode, newVNode, container, anchor);
            }
        };
        // 处理组件
        var processComponent = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 挂载
                mountComponent(newVNode, container, anchor);
            }
        };
        // 挂载组件
        var mountComponent = function (initialVNode, container, anchor) {
            // 生成组件实例
            initialVNode.component = createComponentInstance(initialVNode);
            // 浅拷贝，绑定同一块内存空间
            var instance = initialVNode.component;
            // 标准化组件实例数据
            setupComponent(instance);
            // 设置组件渲染
            setupRenderEffect(instance, initialVNode, container, anchor);
        };
        // 设置组件渲染
        var setupRenderEffect = function (instance, initialVNode, container, anchor) {
            // 组件挂载和更新的方法
            var componentUpdateFn = function () {
                // 当前处于 mounted 之前，即执行 挂载 逻辑
                if (!instance.isMounted) {
                    // 获取 hook
                    var bm = instance.bm, m = instance.m;
                    console.log('打印instance', instance);
                    // 执行生命周期钩子 beforeMount , 用户没传就不执行
                    if (bm) {
                        bm();
                    }
                    // 从 render 中获取需要渲染的内容
                    var subTree = (instance.subTree = renderComponentRoot(instance));
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
                }
                else {
                    var next = instance.next, vnode = instance.vnode;
                    if (!next) {
                        next = vnode;
                    }
                    // 响应式数据更新后, 生成新的 vnode 树
                    var nextTree = renderComponentRoot(instance);
                    // 保存对应的 subTree，以便进行更新操作
                    var prevTree = instance.subTree;
                    instance.subTree = nextTree;
                    // 通过 patch 进行更新操作
                    patch(prevTree, nextTree, container, anchor);
                    // 更新 next
                    next.el = nextTree.el;
                }
            };
            // 创建包含 scheduler 的 effect 实例
            var effect = (instance.effect = new ReactiveEffect(componentUpdateFn, function () {
                return queuePreFlushCb(update);
            }));
            // 生成 update 函数
            var update = (instance.update = function () { return effect.run(); });
            // 触发 update 函数，本质上触发的是 componentUpdateFn
            update();
        };
        // 挂载子节点
        var mountChildren = function (children, container, anchor) {
            // 如果是字符串，则将其拆分成单个字符 demo: 'abc' => ['a', 'b', 'c']
            if (isString(children)) {
                children = children.split('');
            }
            for (var i = 0; i < children.length; i++) {
                var child = (children[i] = normalizeVNode(children[i]));
                patch(null, child, container, anchor);
            }
        };
        // 用于挂载元素的函数
        var mountElement = function (vnode, container, anchor) {
            var type = vnode.type, props = vnode.props, shapeFlag = vnode.shapeFlag;
            // 1. 创建元素
            var el = (vnode.el = hostCreateElement(type));
            if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 2. 设置文本
                hostSetElementText(el, vnode.children);
            }
            else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 设置 Array 子节点
                mountChildren(vnode.children, el, anchor);
            }
            if (props) {
                // 3. 设置 props
                for (var key in props) {
                    hostPatchProp(el, key, null, props[key]);
                }
            }
            // 4. 插入
            hostInsert(el, container, anchor);
        };
        // 用于更新元素的函数
        var patchElement = function (oldVNode, newVNode) {
            var el = (newVNode.el = oldVNode.el); // 浅拷贝
            var oldProps = oldVNode.props || EMPTY_OBJ;
            var newProps = newVNode.props || EMPTY_OBJ;
            patchChildren(oldVNode, newVNode, el, null);
            patchProps(el, newVNode, oldProps, newProps);
        };
        // 更新子节点
        var patchChildren = function (oldVNode, newVNode, container, anchor) {
            // 旧节点的 children
            var c1 = oldVNode && oldVNode.children;
            // 旧节点的 prevShapeFlag
            var prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
            // 新节点的 children
            var c2 = newVNode.children;
            // 新节点的 shapeFlag
            var shapeFlag = newVNode.shapeFlag;
            // 新子节点为 TEXT_CHILDREN
            if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 旧子节点为 ARRAY_CHILDREN
                if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) ;
                // 新旧子节点不同
                if (c2 !== c1) {
                    // 挂载新子节点的文本
                    hostSetElementText(container, c2);
                }
            }
            else {
                // 旧子节点为 ARRAY_CHILDREN
                if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 新子节点也为 ARRAY_CHILDREN
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        // 走 diff
                        patchKeyedChildren(c1, c2, container, anchor);
                    }
                }
                else {
                    // 旧子节点为 TEXT_CHILDREN
                    if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                        // 删除旧的文本
                        hostSetElementText(container, '');
                    }
                    // 新子节点为 ARRAY_CHILDREN
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) ;
                }
            }
        };
        // 更新 props
        var patchProps = function (el, vnode, oldProps, newProps) {
            // 新旧 props 不相同时才进行处理
            if (oldProps !== newProps) {
                // 遍历新的 props，依次触发 hostPatchProp ，赋值新属性
                for (var key in newProps) {
                    var next = newProps[key];
                    var prev = oldProps[key];
                    if (next !== prev) {
                        hostPatchProp(el, key, prev, next);
                    }
                }
                // 存在旧的 props 时
                if (oldProps !== EMPTY_OBJ) {
                    // 遍历旧的 props，依次触发 hostPatchProp ，删除不存在于新props 中的旧属性
                    for (var key in oldProps) {
                        if (!(key in newProps)) {
                            hostPatchProp(el, key, oldProps[key], null);
                        }
                    }
                }
            }
        };
        // 用于比较新旧 VNode 的 patch 函数
        var patch = function (oldVNode, newVNode, container, anchor) {
            if (anchor === void 0) { anchor = null; }
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
            var type = newVNode.type, shapeFlag = newVNode.shapeFlag;
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
                    }
                    else if (shapeFlag & ShapeFlags.COMPONENT) {
                        // 挂载.vue 组件
                        processComponent(oldVNode, newVNode, container, anchor);
                    }
            }
        };
        // 有key时的 diff
        var patchKeyedChildren = function (oldChildren, newChildren, container, parentAnchor) {
            // 索引
            var i = 0;
            // 新的子节点的长度
            var newChildrenLength = newChildren.length;
            // 旧的子节点最大（最后一个）下标
            var oldChildrenEnd = oldChildren.length - 1;
            // 新的子节点最大（最后一个）下标
            var newChildrenEnd = newChildrenLength - 1;
            // 1. 自前向后的 diff 对比。经过该循环之后，从前开始的相同 vnode 将被处理
            while (i <= oldChildrenEnd && i <= newChildrenEnd) {
                var oldVNode = oldChildren[i];
                var newVNode = normalizeVNode(newChildren[i]);
                // 如果 oldVNode 和 newVNode 被认为是同一个 vnode，则直接 patch 即可
                if (isSameVNodeType(oldVNode, newVNode)) {
                    patch(oldVNode, newVNode, container, null);
                }
                // 如果不被认为是同一个 vnode，则直接跳出循环
                else {
                    break;
                }
                // 下标自增
                i++;
            }
            // 2. 自后向前的 diff 对比。经过该循环之后，从后开始的相同 vnode 将被处理
            while (i <= oldChildrenEnd && i <= newChildrenEnd) {
                var oldVNode = oldChildren[oldChildrenEnd];
                var newVNode = normalizeVNode(newChildren[newChildrenEnd]);
                if (isSameVNodeType(oldVNode, newVNode)) {
                    patch(oldVNode, newVNode, container, null);
                }
                else {
                    break;
                }
                oldChildrenEnd--;
                newChildrenEnd--;
            }
            // 3. 如果新 vnode 数组长度【大于】了旧 vnode 数组长度，则【挂载】节点
            if (i > oldChildrenEnd) {
                if (i <= newChildrenEnd) {
                    var nextPos = newChildrenEnd + 1;
                    var anchor = nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor;
                    while (i <= newChildrenEnd) {
                        patch(null, normalizeVNode(newChildren[i]), container, anchor);
                        i++;
                    }
                }
            }
            // 4. 如果新 vnode 数组长度【小于】了旧 vnode 数组长度，则【卸载】节点
            else if (i > newChildrenEnd) {
                while (i <= oldChildrenEnd) {
                    unmount(oldChildren[i]);
                    i++;
                }
            }
            // 5. 处理乱序
            else {
                // 旧子节点的开始索引：oldChildrenStart
                var oldStartIndex = i;
                // 新子节点的开始索引：newChildrenStart
                var newStartIndex = i;
                // 5.1 创建一个 <key（新节点的 key）:index（新节点的位置）> 的 Map 对象 keyToNewIndexMap。通过该对象可知：新的 child（根据 key 判断指定 child） 更新后的位置（根据对应的 index 判断）在哪里
                var keyToNewIndexMap = new Map();
                // 通过循环为 keyToNewIndexMap 填充值（s2 = newChildrenStart; e2 = newChildrenEnd）
                for (i = newStartIndex; i <= newChildrenEnd; i++) {
                    // 从 newChildren 中根据开始索引获取每一个 child（c2 = newChildren）
                    var nextChild = normalizeVNode(newChildren[i]);
                    // child 必须存在 key（这也是为什么 v-for 必须要有 key 的原因）
                    if (nextChild.key != null) {
                        // 把 key 和 对应的索引，放到 keyToNewIndexMap 对象中
                        keyToNewIndexMap.set(nextChild.key, i);
                    }
                }
                // 5.2 循环 oldChildren ，并尝试进行 patch（打补丁）或 unmount（删除）旧节点
                var j = void 0;
                // 记录已经修复的新节点数量
                var patched = 0;
                // 新节点待修补的数量 = newChildrenEnd - newChildrenStart + 1
                var toBePatched = newChildrenEnd - newStartIndex + 1;
                // 标记位：节点是否需要移动
                var moved = false;
                // 配合 moved 进行使用，它始终保存当前最大的 index 值
                var maxNewIndexSoFar = 0;
                // 创建一个 Array 的对象，用来确定最长递增子序列。它的下标表示：《新节点的下标（newIndex），不计算已处理的节点。即：n-c 被认为是 0》，元素表示：《对应旧节点的下标（oldIndex），永远 +1》
                // 但是，需要特别注意的是：oldIndex 的值应该永远 +1 （ 因为 0 代表了特殊含义，他表示《新节点没有找到对应的旧节点，此时需要新增新节点》）。即：旧节点下标为 0， 但是记录时会被记录为 1
                var newIndexToOldIndexMap = new Array(toBePatched);
                // 遍历 toBePatched ，为 newIndexToOldIndexMap 进行初始化，初始化时，所有的元素为 0
                for (i = 0; i < toBePatched; i++)
                    newIndexToOldIndexMap[i] = 0;
                // 遍历 oldChildren（s1 = oldChildrenStart; e1 = oldChildrenEnd），获取旧节点，如果当前 已经处理的节点数量 > 待处理的节点数量，那么就证明：《所有的节点都已经更新完成，剩余的旧节点全部删除即可》
                for (i = oldStartIndex; i <= oldChildrenEnd; i++) {
                    // 获取旧节点
                    var prevChild = oldChildren[i];
                    // 如果当前 已经处理的节点数量 > 待处理的节点数量，那么就证明：《所有的节点都已经更新完成，剩余的旧节点全部删除即可》
                    if (patched >= toBePatched) {
                        // 所有的节点都已经更新完成，剩余的旧节点全部删除即可
                        unmount(prevChild);
                        continue;
                    }
                    // 新节点需要存在的位置，需要根据旧节点来进行寻找（包含已处理的节点。即：n-c 被认为是 1）
                    var newIndex = void 0;
                    // 旧节点的 key 存在时
                    if (prevChild.key != null) {
                        // 根据旧节点的 key，从 keyToNewIndexMap 中可以获取到新节点对应的位置
                        newIndex = keyToNewIndexMap.get(prevChild.key);
                    }
                    else {
                        // 旧节点的 key 不存在（无 key 节点）
                        // 那么我们就遍历所有的新节点，找到《没有找到对应旧节点的新节点，并且该新节点可以和旧节点匹配》，如果能找到，那么 newIndex = 该新节点索引
                        for (j = newStartIndex; j <= newChildrenEnd; j++) {
                            // 找到《没有找到对应旧节点的新节点，并且该新节点可以和旧节点匹配》
                            if (newIndexToOldIndexMap[j - newStartIndex] === 0 &&
                                isSameVNodeType(prevChild, newChildren[j])) {
                                // 如果能找到，那么 newIndex = 该新节点索引
                                newIndex = j;
                                break;
                            }
                        }
                    }
                    // 最终没有找到新节点的索引，则证明：当前旧节点没有对应的新节点
                    if (newIndex === undefined) {
                        // 此时，直接删除即可
                        unmount(prevChild);
                    }
                    // 没有进入 if，则表示：当前旧节点找到了对应的新节点，那么接下来就是要判断对于该新节点而言，是要 patch（打补丁）还是 move（移动）
                    else {
                        // 为 newIndexToOldIndexMap 填充值：下标表示：《新节点的下标（newIndex），不计算已处理的节点。即：n-c 被认为是 0》，元素表示：《对应旧节点的下标（oldIndex），永远 +1》
                        // 因为 newIndex 包含已处理的节点，所以需要减去 s2（s2 = newChildrenStart）表示：不计算已处理的节点
                        newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1;
                        // maxNewIndexSoFar 会存储当前最大的 newIndex，它应该是一个递增的，如果没有递增，则证明有节点需要移动
                        if (newIndex >= maxNewIndexSoFar) {
                            // 持续递增
                            maxNewIndexSoFar = newIndex;
                        }
                        else {
                            // 没有递增，则需要移动，moved = true
                            moved = true;
                        }
                        // 打补丁
                        patch(prevChild, newChildren[newIndex], container, null);
                        // 自增已处理的节点数量
                        patched++;
                    }
                }
                // 5.3 针对移动和挂载的处理
                // 仅当节点需要移动的时候，我们才需要生成最长递增子序列，否则只需要有一个空数组即可
                var increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
                // j >= 0 表示：初始值为 最长递增子序列的最后下标
                // j < 0 表示：《不存在》最长递增子序列。
                j = increasingNewIndexSequence.length - 1;
                // 倒序循环，以便我们可以使用最后修补的节点作为锚点
                for (i = toBePatched - 1; i >= 0; i--) {
                    // nextIndex（需要更新的新节点下标） = newChildrenStart + i
                    var nextIndex = newStartIndex + i;
                    // 根据 nextIndex 拿到要处理的 新节点
                    var nextChild = newChildren[nextIndex];
                    // 获取锚点（是否超过了最长长度）
                    var anchor = nextIndex + 1 < newChildrenLength ? newChildren[nextIndex + 1].el : parentAnchor;
                    // 如果 newIndexToOldIndexMap 中保存的 value = 0，则表示：新节点没有用对应的旧节点，此时需要挂载新节点
                    if (newIndexToOldIndexMap[i] === 0) {
                        // 挂载新节点
                        patch(null, nextChild, container, anchor);
                    }
                    // moved 为 true，表示需要移动
                    else if (moved) {
                        // j < 0 表示：不存在 最长递增子序列
                        // i !== increasingNewIndexSequence[j] 表示：当前节点不在最后位置
                        // 那么此时就需要 move （移动）
                        if (j < 0 || i !== increasingNewIndexSequence[j]) {
                            move(nextChild, container, anchor);
                        }
                        else {
                            // j 随着循环递减
                            j--;
                        }
                    }
                }
            }
        };
        // 求新、旧 vnode 数组的最长递增子序列
        // 本质：贪心 + 二分查找
        function getSequence(arr) {
            // 获取一个数组浅拷贝。注意 p 的元素改变并不会影响 arr
            // p 是一个最终的回溯数组，它会在最终的 result 回溯中被使用
            // 它会在每次 result 发生变化时，记录 result 更新前最后一个索引的值
            var p = arr.slice();
            // 定义返回值（最长递增子序列下标），因为下标从 0 开始，所以它的初始值为 0
            var result = [0];
            var i, j, u, v, c;
            // 当前数组的长度
            var len = arr.length;
            // 对数组中所有的元素进行 for 循环处理，i = 下标
            for (i = 0; i < len; i++) {
                // 根据下标获取当前对应元素
                var arrI = arr[i];
                //
                if (arrI !== 0) {
                    // 获取 result 中的最后一个元素，即：当前 result 中保存的最大值的下标
                    j = result[result.length - 1];
                    // arr[j] = 当前 result 中所保存的最大值
                    // arrI = 当前值
                    // 如果 arr[j] < arrI 。那么就证明，当前存在更大的序列，那么该下标就需要被放入到 result 的最后位置
                    if (arr[j] < arrI) {
                        p[i] = j;
                        // 把当前的下标 i 放入到 result 的最后位置
                        result.push(i);
                        continue;
                    }
                    // 不满足 arr[j] < arrI 的条件，就证明目前 result 中的最后位置保存着更大的数值的下标。
                    // 但是这个下标并不一定是一个递增的序列，比如： [1, 3] 和 [1, 2]
                    // 所以我们还需要确定当前的序列是递增的。
                    // 计算方式就是通过：二分查找来进行的
                    // 初始下标
                    u = 0;
                    // 最终下标
                    v = result.length - 1;
                    // 只有初始下标 < 最终下标时才需要计算
                    while (u < v) {
                        // (u + v) 转化为 32 位 2 进制，右移 1 位 === 取中间位置（向下取整）例如：8 >> 1 = 4;  9 >> 1 = 4; 5 >> 1 = 2
                        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Right_shift
                        // c 表示中间位。即：初始下标 + 最终下标 / 2 （向下取整）
                        c = (u + v) >> 1;
                        // 从 result 中根据 c（中间位），取出中间位的下标。
                        // 然后利用中间位的下标，从 arr 中取出对应的值。
                        // 即：arr[result[c]] = result 中间位的值
                        // 如果：result 中间位的值 < arrI，则 u（初始下标）= 中间位 + 1。即：从中间向右移动一位，作为初始下标。 （下次直接从中间开始，往后计算即可）
                        if (arr[result[c]] < arrI) {
                            u = c + 1;
                        }
                        else {
                            // 否则，则 v（最终下标） = 中间位。即：下次直接从 0 开始，计算到中间位置 即可。
                            v = c;
                        }
                    }
                    // 最终，经过 while 的二分运算可以计算出：目标下标位 u
                    // 利用 u 从 result 中获取下标，然后拿到 arr 中对应的值：arr[result[u]]
                    // 如果：arr[result[u]] > arrI 的，则证明当前  result 中存在的下标 《不是》 递增序列，则需要进行替换
                    if (arrI < arr[result[u]]) {
                        if (u > 0) {
                            p[i] = result[u - 1];
                        }
                        // 进行替换，替换为递增序列
                        result[u] = i;
                    }
                }
            }
            // 重新定义 u。此时：u = result 的长度
            u = result.length;
            // 重新定义 v。此时 v = result 的最后一个元素
            v = result[u - 1];
            // 自后向前处理 result，利用 p 中所保存的索引值，进行最后的一次回溯
            while (u-- > 0) {
                result[u] = v;
                v = p[v];
            }
            return result;
        }
        // 移动节点
        var move = function (vnode, container, anchor) {
            var el = vnode.el;
            hostInsert(el, container, anchor);
        };
        // 用于创建 VNode 树的 render 函数
        var render = function (vnode, container) {
            if (vnode === null) {
                // 如果旧 vnode 为 null，则直接将容器清空
                if (container._vnode) {
                    unmount(container._vnode);
                }
            }
            else {
                // 如果 vnode 不为 null，则调用 patch 方法进行更新
                patch(container._vnode || null, vnode, container);
            }
            // 更新 _vnode ，即将新的 vnode 赋值给容器的 _vnode 属性，作为旧的 vnode，下次渲染时可以进行比较
            container._vnode = vnode;
        };
        // 卸载指定dom
        var unmount = function (vnode) {
            hostRemove(vnode.el);
        };
        return {
            render: render
        };
    }

    // 浏览器端，DOM元素的增删改查操作
    var doc = document;
    var nodeOps = {
        // 插入指定元素到指定位置
        insert: function (child, parent, anchor) {
            parent.insertBefore(child, anchor || null);
        },
        // 创建指定DOM
        createElement: function (tag) {
            var el = doc.createElement(tag);
            return el;
        },
        // 为指定的 DOM 设置文本内容
        setElementText: function (el, text) {
            // console.log('188', el, text);
            el.textContent = text;
        },
        // 删除指定DOM
        remove: function (child) {
            var parent = child.parentNode;
            if (parent) {
                parent.removeChild(child);
            }
        },
        // 创建 Text 节点
        createText: function (text) { return doc.createTextNode(text); },
        // 设置 text
        setText: function (node, text) {
            node.nodeValue = text;
        },
        // 创建 Comment 节点
        createComment: function (text) { return doc.createComment(text); }
    };

    // 处理标签属性
    function patchAttr(el, key, value) {
        if (value == null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, value);
        }
    }

    // 处理类名
    function patchClass(el, value) {
        if (value == null) {
            el.removeAttribute('class');
        }
        else {
            el.className = value;
        }
    }

    // 处理事件
    function patchEvent(el, rawName, prevValue, nextValue) {
        // vei = vue event invokers
        var invokers = el._vei || (el._vei = {});
        // 是否存在缓存事件
        var existingInvoker = invokers[rawName];
        // 如果当前事件存在缓存，并且存在新的事件行为，则判定为更新操作。直接更新 invoker 的 value 即可
        if (nextValue && existingInvoker) {
            // patch
            existingInvoker.value = nextValue;
        }
        else {
            // 获取用于 addEventListener || removeEventListener 的事件名
            var name_1 = parseName(rawName);
            if (nextValue) {
                // add
                var invoker = (invokers[rawName] = createInvoker(nextValue));
                el.addEventListener(name_1, invoker);
            }
            else if (existingInvoker) {
                // remove
                el.removeEventListener(name_1, existingInvoker);
                // 删除缓存
                invokers[rawName] = undefined;
            }
        }
    }
    // 直接返回剔除 on，其余转化为小写的事件名即可
    function parseName(name) {
        return name.slice(2).toLowerCase();
    }
    //  生成 invoker 函数
    function createInvoker(initialValue) {
        var invoker = function (e) {
            invoker.value && invoker.value();
        };
        // value 为真实的事件行为
        invoker.value = initialValue;
        return invoker;
    }

    // 通过 DOM Properties 指定属性
    function patchDOMProp(el, key, value) {
        try {
            el[key] = value;
        }
        catch (e) { }
    }

    /**
     * 为 style 属性进行打补丁
     */
    function patchStyle(el, prev, next) {
        // 获取 style 对象
        var style = el.style;
        // 判断新的样式是否为纯字符串
        var isCssString = isString(next);
        if (next && !isCssString) {
            // 赋值新样式
            for (var key in next) {
                setStyle(style, key, next[key]);
            }
            // 清理旧样式
            if (prev && !isString(prev)) {
                for (var key in prev) {
                    if (next[key] == null) {
                        setStyle(style, key, '');
                    }
                }
            }
        }
    }
    /**
     * 赋值样式
     */
    function setStyle(style, name, val) {
        style[name] = val;
    }

    // 处理标签上的各类属性：样式、事件、属性、class 等等
    // 为 prop 进行打补丁操作
    // 标签上的属性，和 DOM 对象上的属性是不一样的
    var patchProp = function (el, key, prevValue, nextValue) {
        if (key === 'class') {
            patchClass(el, nextValue);
        }
        else if (key === 'style') {
            // style
            patchStyle(el, prevValue, nextValue);
        }
        else if (isOn(key)) {
            // 事件
            patchEvent(el, key, prevValue, nextValue);
        }
        else if (shouldSetAsProp(el, key)) {
            // 通过 DOM Properties 指定
            patchDOMProp(el, key, nextValue);
        }
        else {
            // 其他属性
            patchAttr(el, key, nextValue);
        }
    };
    // 判断指定元素的指定属性是否可以通过 DOM Properties 指定
    function shouldSetAsProp(el, key) {
        // 各种边缘情况处理
        if (key === 'spellcheck' || key === 'draggable' || key === 'translate') {
            return false;
        }
        // #1787, #2840 表单元素的表单属性是只读的，必须设置为属性 attribute
        if (key === 'form') {
            return false;
        }
        // #1526 <input list> 必须设置为属性 attribute
        if (key === 'list' && el.tagName === 'INPUT') {
            return false;
        }
        // #2766 <textarea type> 必须设置为属性 attribute
        if (key === 'type' && el.tagName === 'TEXTAREA') {
            return false;
        }
        return key in el;
    }

    // 渲染器的配置项
    var rendererOptions = extend({ patchProp: patchProp }, nodeOps);
    // 临时变量，存储渲染器
    var renderer;
    function ensureRenderer() {
        return renderer || (renderer = createRenderer(rendererOptions));
    }
    // 调用 ensureRenderer，拿到大对象，再调用内部的 render 方法
    // 最后将一连串调用合并为一个render向外暴露
    var render = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        (_a = ensureRenderer()).render.apply(_a, __spreadArray([], __read(args), false));
    };

    exports.Comment = Comment;
    exports.Fragment = Fragment;
    exports.Text = Text;
    exports.computed = computed;
    exports.effect = effect;
    exports.h = h;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.render = render;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
