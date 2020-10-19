
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/includes/Library.svelte generated by Svelte v3.29.0 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Library", slots, []);
    	let currentSong = "";

    	function setSong(song) {
    		let audioPlayer = document.querySelector("audio");
    		audioPlayer.volume = 0.1;
    		currentSong = song["SourceFile"];

    		audioPlayer.addEventListener("loadeddata", () => {
    			audioPlayer.play();
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Library> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ currentSong, setSong });

    	$$self.$inject_state = $$props => {
    		if ("currentSong" in $$props) currentSong = $$props.currentSong;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Library extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Library",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function cutWord(word) {
        try {
            if (word.length >= 20) {
                return word.substr(0, 18) + '...';
            }
            else {
                return word;
            }
        }
        catch (error) {
            return word;
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let songIndex = writable([]);
    let userSelectedTagsToGroup = writable(['Genre', 'AlbumArtist', 'Album']);
    // Value choosen by the user to filter out the specified tag from the song index.
    let userSelectedValueToFilter = writable(['Anime']);
    /*
      [
        0:{
          filter:'Genre',
          userSelection:'Electronic',
          data:[]
        },
        1:[
          {

          },
          ...
        ],
        2:[
          {

          },
          ...
        ]
      ]

    */

    function filterSongs(valuesToGroupBy, valuesToFilterBy, index) {
        let songArray;
        let outputArray = [];
        songIndex.subscribe((value) => (songArray = value))();
        for (let i = 0; i <= index; i++) {
            // If i === index means that it should be grouping since user selection does not matter now.
            if (i === index) {
                // Groups
                // If no filtering done then use the array with all songs.
                if (outputArray.length === 0) {
                    songArray.forEach((song) => {
                        // If that prevents redundant data.
                        if (!outputArray.includes(song[valuesToGroupBy[i]])) {
                            outputArray.push(song[valuesToGroupBy[i]]);
                        }
                    });
                }
                else {
                    let tempArray = [];
                    outputArray.forEach((song) => {
                        // If that prevents redundant data.
                        if (!tempArray.includes(song[valuesToGroupBy[i]])) {
                            if (song[valuesToGroupBy[i]] !== undefined) {
                                tempArray.push(song[valuesToGroupBy[i]]);
                            }
                        }
                    });
                    outputArray = tempArray;
                }
            }
            else {
                // Filters
                let groupBy = valuesToGroupBy[i];
                let filterBy = valuesToFilterBy[i];
                if (outputArray.length === 0) {
                    outputArray = songArray.filter((song) => song[groupBy] === filterBy);
                }
                else {
                    outputArray = outputArray.filter((song) => {
                        if (filterBy === undefined) {
                            return true;
                        }
                        else {
                            return song[groupBy] === filterBy;
                        }
                    });
                }
            }
        } // for end
        outputArray = outputArray.sort((a, b) => String(a).localeCompare(String(b)));
        return outputArray;
    }

    /* src/components/Filter.svelte generated by Svelte v3.29.0 */

    const file = "src/components/Filter.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (23:3) {:else}
    function create_else_block(ctx) {
    	let label;
    	let t_value = cutWord(/*item*/ ctx[8]) + "";
    	let t;
    	let label_for_value;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t = text(t_value);
    			attr_dev(label, "for", label_for_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]));
    			attr_dev(label, "class", "svelte-z59xpe");
    			add_location(label, file, 23, 4, 982);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentArray*/ 4 && t_value !== (t_value = cutWord(/*item*/ ctx[8]) + "")) set_data_dev(t, t_value);

    			if (dirty & /*currentArray, filterType*/ 6 && label_for_value !== (label_for_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]))) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(23:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (21:3) {#if item && item[filterType] !== undefined}
    function create_if_block(ctx) {
    	let label;
    	let t_value = cutWord(/*item*/ ctx[8][/*filterType*/ ctx[1]]) + "";
    	let t;
    	let label_for_value;

    	const block = {
    		c: function create() {
    			label = element("label");
    			t = text(t_value);
    			attr_dev(label, "for", label_for_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]));
    			attr_dev(label, "class", "svelte-z59xpe");
    			add_location(label, file, 21, 4, 894);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentArray, filterType*/ 6 && t_value !== (t_value = cutWord(/*item*/ ctx[8][/*filterType*/ ctx[1]]) + "")) set_data_dev(t, t_value);

    			if (dirty & /*currentArray, filterType*/ 6 && label_for_value !== (label_for_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]))) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(21:3) {#if item && item[filterType] !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (17:1) {#each currentArray as item, i (i)}
    function create_each_block(key_1, ctx) {
    	let item;
    	let input;
    	let input_id_value;
    	let input_value_value;
    	let t0;
    	let t1;
    	let item_title_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[8] && /*item*/ ctx[8][/*filterType*/ ctx[1]] !== undefined) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			item = element("item");
    			input = element("input");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", input_id_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]));
    			input.__value = input_value_value = /*item*/ ctx[8];
    			input.value = input.__value;
    			attr_dev(input, "class", "svelte-z59xpe");
    			/*$$binding_groups*/ ctx[5][0].push(input);
    			add_location(input, file, 18, 3, 731);
    			attr_dev(item, "title", item_title_value = /*item*/ ctx[8]);
    			attr_dev(item, "class", "svelte-z59xpe");
    			add_location(item, file, 17, 2, 708);
    			this.first = item;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, item, anchor);
    			append_dev(item, input);
    			input.checked = input.__value === /*$userSelectedValueToFilter*/ ctx[3][/*index*/ ctx[0]];
    			append_dev(item, t0);
    			if_block.m(item, null);
    			append_dev(item, t1);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentArray, filterType*/ 6 && input_id_value !== (input_id_value = "" + (/*item*/ ctx[8] + /*i*/ ctx[10] + /*filterType*/ ctx[1]))) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*currentArray*/ 4 && input_value_value !== (input_value_value = /*item*/ ctx[8])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*$userSelectedValueToFilter, index*/ 9) {
    				input.checked = input.__value === /*$userSelectedValueToFilter*/ ctx[3][/*index*/ ctx[0]];
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(item, t1);
    				}
    			}

    			if (dirty & /*currentArray*/ 4 && item_title_value !== (item_title_value = /*item*/ ctx[8])) {
    				attr_dev(item, "title", item_title_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(item);
    			/*$$binding_groups*/ ctx[5][0].splice(/*$$binding_groups*/ ctx[5][0].indexOf(input), 1);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(17:1) {#each currentArray as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let filter_component;
    	let item;
    	let input;
    	let input_id_value;
    	let t0;
    	let label;
    	let t1;
    	let t2;
    	let t3_value = /*currentArray*/ ctx[2].length + "";
    	let t3;
    	let t4;
    	let label_for_value;
    	let item_title_value;
    	let t5;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*currentArray*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*i*/ ctx[10];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			filter_component = element("filter-component");
    			item = element("item");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(/*filterType*/ ctx[1]);
    			t2 = text(" (");
    			t3 = text(t3_value);
    			t4 = text(")");
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", input_id_value = "all" + /*filterType*/ ctx[1]);
    			input.__value = undefined;
    			input.value = input.__value;
    			attr_dev(input, "class", "svelte-z59xpe");
    			/*$$binding_groups*/ ctx[5][0].push(input);
    			add_location(input, file, 13, 2, 473);
    			attr_dev(label, "for", label_for_value = "all" + /*filterType*/ ctx[1]);
    			attr_dev(label, "class", "svelte-z59xpe");
    			add_location(label, file, 14, 2, 584);
    			attr_dev(item, "title", item_title_value = "All " + /*filterType*/ ctx[1]);
    			attr_dev(item, "class", "svelte-z59xpe");
    			add_location(item, file, 12, 1, 439);
    			set_custom_element_data(filter_component, "class", "svelte-z59xpe");
    			add_location(filter_component, file, 11, 0, 419);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, filter_component, anchor);
    			append_dev(filter_component, item);
    			append_dev(item, input);
    			input.checked = input.__value === /*$userSelectedValueToFilter*/ ctx[3][/*index*/ ctx[0]];
    			append_dev(item, t0);
    			append_dev(item, label);
    			append_dev(label, t1);
    			append_dev(label, t2);
    			append_dev(label, t3);
    			append_dev(label, t4);
    			append_dev(filter_component, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(filter_component, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*filterType*/ 2 && input_id_value !== (input_id_value = "all" + /*filterType*/ ctx[1])) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*$userSelectedValueToFilter, index*/ 9) {
    				input.checked = input.__value === /*$userSelectedValueToFilter*/ ctx[3][/*index*/ ctx[0]];
    			}

    			if (dirty & /*filterType*/ 2) set_data_dev(t1, /*filterType*/ ctx[1]);
    			if (dirty & /*currentArray*/ 4 && t3_value !== (t3_value = /*currentArray*/ ctx[2].length + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*filterType*/ 2 && label_for_value !== (label_for_value = "all" + /*filterType*/ ctx[1])) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty & /*filterType*/ 2 && item_title_value !== (item_title_value = "All " + /*filterType*/ ctx[1])) {
    				attr_dev(item, "title", item_title_value);
    			}

    			if (dirty & /*currentArray, filterType, cutWord, undefined, $userSelectedValueToFilter, index*/ 15) {
    				const each_value = /*currentArray*/ ctx[2];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, filter_component, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(filter_component);
    			/*$$binding_groups*/ ctx[5][0].splice(/*$$binding_groups*/ ctx[5][0].indexOf(input), 1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $userSelectedTagsToGroup;
    	let $userSelectedValueToFilter;
    	validate_store(userSelectedTagsToGroup, "userSelectedTagsToGroup");
    	component_subscribe($$self, userSelectedTagsToGroup, $$value => $$invalidate(7, $userSelectedTagsToGroup = $$value));
    	validate_store(userSelectedValueToFilter, "userSelectedValueToFilter");
    	component_subscribe($$self, userSelectedValueToFilter, $$value => $$invalidate(3, $userSelectedValueToFilter = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Filter", slots, []);
    	let { index = undefined } = $$props;
    	let { filterType = undefined } = $$props;
    	let currentArray = [];
    	const writable_props = ["index", "filterType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Filter> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		$userSelectedValueToFilter[index] = this.__value;
    		userSelectedValueToFilter.set($userSelectedValueToFilter);
    		$$invalidate(0, index);
    	}

    	function input_change_handler_1() {
    		$userSelectedValueToFilter[index] = this.__value;
    		userSelectedValueToFilter.set($userSelectedValueToFilter);
    		$$invalidate(0, index);
    	}

    	$$self.$$set = $$props => {
    		if ("index" in $$props) $$invalidate(0, index = $$props.index);
    		if ("filterType" in $$props) $$invalidate(1, filterType = $$props.filterType);
    	};

    	$$self.$capture_state = () => ({
    		cutWord,
    		filterSongs,
    		userSelectedTagsToGroup,
    		userSelectedValueToFilter,
    		index,
    		filterType,
    		currentArray,
    		$userSelectedTagsToGroup,
    		$userSelectedValueToFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ("index" in $$props) $$invalidate(0, index = $$props.index);
    		if ("filterType" in $$props) $$invalidate(1, filterType = $$props.filterType);
    		if ("currentArray" in $$props) $$invalidate(2, currentArray = $$props.currentArray);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$userSelectedTagsToGroup, $userSelectedValueToFilter, index*/ 137) {
    			 {
    				$$invalidate(2, currentArray = filterSongs($userSelectedTagsToGroup, $userSelectedValueToFilter, index));
    			}
    		}
    	};

    	return [
    		index,
    		filterType,
    		currentArray,
    		$userSelectedValueToFilter,
    		input_change_handler,
    		$$binding_groups,
    		input_change_handler_1
    	];
    }

    class Filter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { index: 0, filterType: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Filter",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get index() {
    		throw new Error("<Filter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Filter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filterType() {
    		throw new Error("<Filter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filterType(value) {
    		throw new Error("<Filter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/includes/Filtering.svelte generated by Svelte v3.29.0 */
    const file$1 = "src/includes/Filtering.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (7:1) {#each $userSelectedTagsToGroup as filter, index (index)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let filter;
    	let current;

    	filter = new Filter({
    			props: {
    				filterType: /*filter*/ ctx[1],
    				index: /*index*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(filter.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(filter, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const filter_changes = {};
    			if (dirty & /*$userSelectedTagsToGroup*/ 1) filter_changes.filterType = /*filter*/ ctx[1];
    			if (dirty & /*$userSelectedTagsToGroup*/ 1) filter_changes.index = /*index*/ ctx[3];
    			filter.$set(filter_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(filter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(7:1) {#each $userSelectedTagsToGroup as filter, index (index)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let filtering_component;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*$userSelectedTagsToGroup*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*index*/ ctx[3];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			filtering_component = element("filtering-component");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(filtering_component, "class", "svelte-1p16jwb");
    			add_location(filtering_component, file$1, 5, 0, 232);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, filtering_component, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(filtering_component, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$userSelectedTagsToGroup*/ 1) {
    				const each_value = /*$userSelectedTagsToGroup*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, filtering_component, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(filtering_component);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $userSelectedTagsToGroup;
    	validate_store(userSelectedTagsToGroup, "userSelectedTagsToGroup");
    	component_subscribe($$self, userSelectedTagsToGroup, $$value => $$invalidate(0, $userSelectedTagsToGroup = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Filtering", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Filtering> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Filter,
    		userSelectedTagsToGroup,
    		$userSelectedTagsToGroup
    	});

    	return [$userSelectedTagsToGroup];
    }

    class Filtering extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Filtering",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.0 */
    const file$2 = "src/App.svelte";

    // (19:1) {#if $songIndex.length>0}
    function create_if_block$1(ctx) {
    	let filter;
    	let current;
    	filter = new Filtering({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(filter.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(filter, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(filter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(19:1) {#if $songIndex.length>0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let current;
    	let if_block = /*$songIndex*/ ctx[0].length > 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Jahmin";
    			t1 = space();
    			if (if_block) if_block.c();
    			add_location(h1, file$2, 15, 1, 461);
    			add_location(main, file$2, 14, 0, 453);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$songIndex*/ ctx[0].length > 0) {
    				if (if_block) {
    					if (dirty & /*$songIndex*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $songIndex;
    	validate_store(songIndex, "songIndex");
    	component_subscribe($$self, songIndex, $$value => $$invalidate(0, $songIndex = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const { ipcRenderer, shell } = require("electron");

    	onMount(() => {
    		ipcRenderer.invoke("get-index", "lol").then(result => {
    			// result = result.slice(0, 10)
    			// console.log(result)
    			set_store_value(songIndex, $songIndex = result, $songIndex);
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Library,
    		Filter: Filtering,
    		songIndex,
    		onMount,
    		ipcRenderer,
    		shell,
    		$songIndex
    	});

    	return [$songIndex];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    //@ts-expect-error
    const app = new App({
        target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
