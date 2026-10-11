//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, g = h.trustedTypes, _ = g ? g.emptyScript : "", v = h.reactiveElementPolyfillSupport, y = (e, t) => e, b = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _ : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, x = (e, t) => !l(e, t), S = {
	attribute: !0,
	type: String,
	converter: b,
	reflect: !1,
	useDefault: !1,
	hasChanged: x
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var C = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = S) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? S;
	}
	static _$Ei() {
		if (this.hasOwnProperty(y("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(y("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(y("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? b : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? b : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? x)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[y("elementProperties")] = /* @__PURE__ */ new Map(), C[y("finalized")] = /* @__PURE__ */ new Map(), v?.({ ReactiveElement: C }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var w = globalThis, T = (e) => e, E = w.trustedTypes, D = E ? E.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, O = "$lit$", k = `lit$${Math.random().toFixed(9).slice(2)}$`, A = "?" + k, ee = `<${A}>`, j = document, M = () => j.createComment(""), N = (e) => e === null || typeof e != "object" && typeof e != "function", te = Array.isArray, ne = (e) => te(e) || typeof e?.[Symbol.iterator] == "function", re = "[ 	\n\f\r]", P = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ie = /-->/g, ae = />/g, F = RegExp(`>|${re}(?:([^\\s"'>=/]+)(${re}*=${re}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), oe = /'/g, se = /"/g, ce = /^(?:script|style|textarea|title)$/i, I = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), L = Symbol.for("lit-noChange"), R = Symbol.for("lit-nothing"), le = /* @__PURE__ */ new WeakMap(), z = j.createTreeWalker(j, 129);
function ue(e, t) {
	if (!te(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return D === void 0 ? t : D.createHTML(t);
}
var de = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = P;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === P ? c[1] === "!--" ? o = ie : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = F) : (ce.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = F) : o = ae : o === F ? c[0] === ">" ? (o = i ?? P, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? F : c[3] === "\"" ? se : oe) : o === se || o === oe ? o = F : o === ie || o === ae ? o = P : (o = F, i = void 0);
		let d = o === F && e[t + 1].startsWith("/>") ? " " : "";
		a += o === P ? n + ee : l >= 0 ? (r.push(s), n.slice(0, l) + O + n.slice(l) + k + d) : n + k + (l === -2 ? t : d);
	}
	return [ue(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, fe = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = de(t, n);
		if (this.el = e.createElement(l, r), z.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = z.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(O)) {
					let t = u[o++], n = i.getAttribute(e).split(k), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? me : r[1] === "?" ? he : r[1] === "@" ? ge : H
					}), i.removeAttribute(e);
				} else e.startsWith(k) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ce.test(i.tagName)) {
					let e = i.textContent.split(k), t = e.length - 1;
					if (t > 0) {
						i.textContent = E ? E.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], M()), z.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], M());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === A) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(k, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += k.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = j.createElement("template");
		return n.innerHTML = e, n;
	}
};
function B(e, t, n = e, r) {
	if (t === L) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = N(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = B(e, i._$AS(e, t.values), i, r)), t;
}
var pe = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? j).importNode(t, !0);
		z.currentNode = r;
		let i = z.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new V(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new _e(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = z.nextNode(), a++);
		}
		return z.currentNode = j, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, V = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = R, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = B(this, e, t), N(e) ? e === R || e == null || e === "" ? (this._$AH !== R && this._$AR(), this._$AH = R) : e !== this._$AH && e !== L && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ne(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== R && N(this._$AH) ? this._$AA.nextSibling.data = e : this.T(j.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = fe.createElement(ue(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new pe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = le.get(e.strings);
		return t === void 0 && le.set(e.strings, t = new fe(e)), t;
	}
	k(t) {
		te(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(M()), this.O(M()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = T(e).nextSibling;
			T(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, H = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = R, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = R;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = B(this, e, t, 0), a = !N(e) || e !== this._$AH && e !== L, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = B(this, r[n + o], t, o), s === L && (s = this._$AH[o]), a ||= !N(s) || s !== this._$AH[o], s === R ? e = R : e !== R && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === R ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, me = class extends H {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === R ? void 0 : e;
	}
}, he = class extends H {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== R);
	}
}, ge = class extends H {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = B(this, e, t, 0) ?? R) === L) return;
		let n = this._$AH, r = e === R && n !== R || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== R && (n === R || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, _e = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		B(this, e);
	}
}, ve = {
	M: O,
	P: k,
	A,
	C: 1,
	L: de,
	R: pe,
	D: ne,
	V: B,
	I: V,
	H,
	N: he,
	U: ge,
	B: me,
	F: _e
}, ye = w.litHtmlPolyfillSupport;
ye?.(fe, V), (w.litHtmlVersions ??= []).push("3.3.3");
var be = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new V(t.insertBefore(M(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, xe = globalThis, U = class extends C {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = be(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return L;
	}
};
U._$litElement$ = !0, U.finalized = !0, xe.litElementHydrateSupport?.({ LitElement: U });
var Se = xe.litElementPolyfillSupport;
Se?.({ LitElement: U }), (xe.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/lit-html/directive.js
var Ce = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), we = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: Te } = ve, Ee = {}, De = (e, t = Ee) => e._$AH = t, Oe = Ce(class extends we {
	constructor() {
		super(...arguments), this.key = R;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (De(e), this.key = t), n;
	}
}), ke = o`
:host{display:block}
ha-card{overflow:hidden;border-radius:var(--ha-card-border-radius,12px);background:#020617}
/* The box is the size container: everything inside is sized in cqh/cqw, so the card
   looks the same full screen (panel view) and scaled down in a section (16:9). */
.rl-box{container-type:size;width:100%;aspect-ratio:16/9}
.rl-box.rl-panel{aspect-ratio:auto;height:calc(100vh - var(--header-height,56px))}
.rl-wrap{position:relative;height:100%;overflow:hidden;font-family:var(--ha-font-family-body,system-ui,sans-serif);
  background:radial-gradient(circle at 50% 30%,#1e293b,#020617);color:#fff;display:flex;flex-direction:column}
.rl-tick{height:5cqh;min-height:34px;background:#0b1220;border-bottom:3px solid #dc2626;overflow:hidden;
  white-space:nowrap;display:flex;align-items:center;font-size:2.4cqh}
.rl-tick-in{display:inline-block;padding-left:100%;animation:rl-marq linear infinite}
@keyframes rl-marq{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.rl-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5cqh}
.rl-comp{font-size:2.4cqh;letter-spacing:.4em;color:#94a3b8}
.rl-row{display:flex;align-items:center;justify-content:center;gap:4cqw;width:100%}
.rl-team{display:flex;flex-direction:column;align-items:center;gap:1.5cqh;width:28cqw}
.rl-logo{height:24cqh;width:24cqh;object-fit:contain;filter:drop-shadow(0 6px 18px rgba(0,0,0,.7))}
.rl-init{height:24cqh;width:24cqh;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:8cqh;font-weight:900}
.rl-name{font-size:4cqh;font-weight:800;text-align:center;text-transform:uppercase}
.rl-score{font-size:18cqh;font-weight:900;font-variant-numeric:tabular-nums;line-height:1;white-space:nowrap}
.rl-state{font-size:3.2cqh;font-weight:700}
.rl-live{background:#dc2626;border-radius:999px;padding:.4cqh 1.6cqh;margin-right:1.2cqh;animation:rl-pulse 1.4s infinite}
@keyframes rl-pulse{50%{opacity:.45}}
.rl-last{font-size:3cqh;color:#cbd5e1}
.rl-chan{font-size:2.4cqh;color:#4ade80;font-weight:700}
.rl-wm{position:absolute;inset:0;margin:auto;height:72cqh;max-width:80cqw;object-fit:contain;opacity:.06;filter:grayscale(1) brightness(2);pointer-events:none;z-index:0}
.rl-tick,.rl-main{position:relative;z-index:1}
.rl-prov{color:#fde68a}
.rl-bar{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:2cqw;min-height:7cqh;padding:1cqh 2cqw;background:rgba(2,6,23,.85);border-top:3px solid #c8102e;font-size:2.4cqh}
.rl-bar img{height:4.5cqh;width:4.5cqh;object-fit:contain}
.rl-bar small{color:#94a3b8;letter-spacing:.3em;font-size:1.6cqh}
.rl-bar b{font-size:2.8cqh}
.rl-provtag{font-size:1.8cqh;color:#fbbf24;letter-spacing:.2em}
.rl-sb{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto minmax(0,1fr);grid-template-rows:20cqh auto;row-gap:2.5cqh;align-items:center;width:98cqw;margin-top:3cqh}
.rl-sbt{position:relative;z-index:0;height:100%;display:flex;align-items:center;gap:1.5cqw;padding:0 1.5cqw;font-size:3.4cqh;font-weight:900;text-transform:uppercase;letter-spacing:.02em;min-width:0}
.rl-sbt::before{content:'';position:absolute;inset:0;z-index:-1}
.rl-sbh::before{background:linear-gradient(90deg,transparent,var(--hc) 35%);clip-path:polygon(5% 0,100% 0,100% 100%,0 100%)}
.rl-sba::before{background:linear-gradient(270deg,transparent,var(--ac) 35%);clip-path:polygon(0 0,95% 0,100% 100%,0 100%)}
.rl-sbt span{flex:1;min-width:0;overflow:hidden;line-height:1.1;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;text-shadow:0 3px 0 rgba(0,0,0,.5)}
.rl-sbh span{text-align:right}
.rl-sbt img{flex:none;height:23cqh;width:23cqh;object-fit:contain;filter:drop-shadow(0 1cqh 2cqh rgba(0,0,0,.6))}
.rl-sbt .rl-init{flex:none;height:18cqh;width:18cqh;font-size:6cqh}
.rl-sbs{height:100%;min-width:15cqh;padding:0 2cqh;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#0b1220;font-size:14cqh;font-weight:900;font-variant-numeric:tabular-nums;line-height:1}
.rl-sbsh{box-shadow:inset 0 1cqh 0 var(--hc)}.rl-sbsa{box-shadow:inset 0 1cqh 0 var(--ac)}
.rl-clock{height:100%;min-width:18cqh;padding:0 2cqh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqh;background:#f8fafc;color:#0f172a}
.rl-clock b{font-size:6.5cqh;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
.rl-clock small{font-size:2.2cqh;font-weight:800;letter-spacing:.2em;color:#475569}
.rl-clock .rl-live{font-size:1.8cqh;color:#fff;margin:0}
.rl-bump{animation:rl-bump 1.4s ease}
@keyframes rl-bump{20%{transform:scale(1.35);color:#fde047}40%{transform:scale(.95)}60%{transform:scale(1.15);color:#fde047}}
.rl-sbd{display:flex;flex-direction:column;gap:1.4cqh;font-size:2.8cqh;color:#cbd5e1;padding:0 1.5cqw}
.rl-sbd>div{display:flex;flex-wrap:wrap;gap:.6cqh 1.5cqw}
.rl-sbd b{color:#fff;font-size:3.4cqh}
.rl-sbdh{grid-column:1;align-items:flex-end}.rl-sbdh>div{justify-content:flex-end}.rl-sbda{grid-column:5;align-items:flex-start}
.rl-bon{padding:.5cqh 1.4cqh;border-radius:.8cqh;background:#fbbf24;color:#111;font-size:2cqh;font-weight:900;letter-spacing:.12em;white-space:nowrap}
.rl-bon.rl-on{background:transparent;color:#fbbf24;outline:2px dashed #fbbf24;outline-offset:-2px}
.rl-next{margin-top:2cqh;padding:1.6cqh 3cqh;border:1px solid #334155;border-radius:2cqh;background:rgba(15,23,42,.7);text-align:center;font-size:2.8cqh}
.rl-next b{color:#fff}.rl-next small{display:block;color:#94a3b8;letter-spacing:.3em;font-size:1.8cqh}
.rl-ov{--t0:0s;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;background:radial-gradient(circle,var(--c) 0%,rgba(0,0,0,.94) 72%);
  animation:rl-ov 20s linear forwards;z-index:5}
.rl-ov.rl-iscard{--t0:1.3s}
@keyframes rl-ov{0%{opacity:0;transform:scale(1.3)}3%{opacity:1;transform:scale(1)}95%{opacity:1}
  100%{opacity:0;visibility:hidden}}
.rl-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rl-burst{position:absolute;width:160cqmax;height:160cqmax;
  background:repeating-conic-gradient(rgba(255,255,255,.13) 0deg 8deg,transparent 8deg 22deg);
  animation:rl-spin 20s linear;animation-delay:calc(0s - var(--age))}
@keyframes rl-spin{to{transform:rotate(400deg)}}
.rl-rays2{position:absolute;width:160cqmax;height:160cqmax;opacity:.45;
  background:repeating-conic-gradient(rgba(255,255,255,.25) 0deg 3deg,transparent 3deg 17deg);
  background:repeating-conic-gradient(color-mix(in srgb,var(--c) 60%,#fff) 0deg 3deg,transparent 3deg 17deg);
  animation:rl-spin2 26s linear infinite;animation-delay:calc(0s - var(--age))}
@keyframes rl-spin2{to{transform:rotate(-360deg)}}
.rl-ring{position:absolute;inset:0;margin:auto;width:30cqmin;height:30cqmin;border-radius:50%;
  border:.8cqmin solid rgba(255,255,255,.75);box-shadow:0 0 4cqmin var(--c),inset 0 0 4cqmin var(--c);
  animation:rl-ring 2.4s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rl-ring{from{transform:scale(.1);opacity:1}to{transform:scale(5);opacity:0}}
.rl-beam{position:absolute;bottom:-5cqh;width:22cqw;height:130cqh;transform-origin:50% 100%;
  background:linear-gradient(to top,rgba(255,255,255,.4),rgba(255,255,255,0) 85%);
  clip-path:polygon(42% 100%,58% 100%,100% 0,0 0);
  animation:rl-beam 3.2s ease-in-out infinite alternate;animation-delay:calc(0s - var(--age))}
.rl-beam.rl-l{left:2cqw}.rl-beam.rl-r{right:2cqw;animation-name:rl-beam-r}
@keyframes rl-beam{from{transform:rotate(-35deg)}to{transform:rotate(25deg)}}
@keyframes rl-beam-r{from{transform:rotate(35deg)}to{transform:rotate(-25deg)}}
.rl-cf{position:absolute;top:0;height:1.4cqw;border-radius:2px;z-index:2;animation:rl-fall 4s linear infinite}
@keyframes rl-fall{from{transform:translateY(-8cqh) rotate(0) rotateX(0)}
  to{transform:translateY(108cqh) rotate(540deg) rotateX(720deg)}}
.rl-strobe{position:absolute;inset:0;background:radial-gradient(circle,transparent 25%,var(--c) 110%);
  animation:rl-strobe .9s ease-in-out infinite alternate;animation-delay:calc(0s - var(--age))}
@keyframes rl-strobe{from{opacity:.15}to{opacity:.75}}
.rl-whistle{position:absolute;width:46cqh;z-index:3;filter:drop-shadow(0 1cqh 2cqh rgba(0,0,0,.7));
  animation:rl-whistle 1.5s ease both;animation-delay:calc(0s - var(--age))}
@keyframes rl-whistle{0%{opacity:0;transform:scale(0) rotate(-40deg)}14%{opacity:1;transform:scale(1.15) rotate(8deg)}
  24%,44%,64%{transform:scale(1) rotate(-7deg)}34%,54%,74%{transform:scale(1.06) rotate(7deg)}
  85%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
.rl-wave{animation:rl-wave .45s ease-in-out infinite}
@keyframes rl-wave{0%,100%{opacity:0}50%{opacity:1}}
.rl-ovlogo{position:relative;height:26cqh;animation:rl-pop 1s ease both;animation-delay:calc(var(--t0) - var(--age))}
@keyframes rl-pop{0%{transform:scale(0) rotate(-200deg)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
.rl-ovtxt{position:relative;white-space:nowrap;font-weight:900;letter-spacing:.04em;text-align:center;
  font-size:min(17cqh,calc(84cqw / var(--n) / .72));text-shadow:0 0 40px var(--c),0 8px 0 #000;
  animation:rl-fade .4s ease both,rl-shake .45s ease 6,rl-beat 1.2s ease infinite;
  animation-delay:calc(var(--t0) - var(--age)),calc(var(--t0) - var(--age)),calc(var(--t0) + 2.7s - var(--age))}
@keyframes rl-beat{50%{transform:scale(1.06)}}
@keyframes rl-shake{25%{transform:rotate(-3deg) scale(1.08)}75%{transform:rotate(3deg) scale(1.08)}}
@keyframes rl-fade{from{opacity:0;transform:translateY(2cqh)}}
.rl-ovsub{position:relative;font-size:4.5cqh;font-weight:800;margin-top:2cqh;text-shadow:0 3px 0 #000;
  animation:rl-fade .5s ease both;animation-delay:calc(var(--t0) + .6s - var(--age))}
.rl-ov.rl-hasph{flex-direction:row;justify-content:center;gap:2cqw}
.rl-phw{position:relative;align-self:flex-end;margin-bottom:-2cqh}
.rl-ph{display:block;height:92cqh;filter:drop-shadow(0 0 3cqh var(--c)) drop-shadow(0 2cqh 3cqh rgba(0,0,0,.85));
  animation:rl-in 1s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:calc(var(--t0) + .25s - var(--age))}
@keyframes rl-in{0%{opacity:0;transform:translateX(-35cqw) scale(.85)}100%{opacity:1;transform:none}}
.rl-col{position:relative;display:flex;flex-direction:column;align-items:flex-start;max-width:52cqw}
.rl-hasph .rl-ovlogo{height:15cqh}
.rl-hasph .rl-ovtxt{font-size:min(14cqh,calc(46cqw / var(--n) / .72));text-align:left;transform-origin:left center}
.rl-band{position:relative;margin-top:2cqh;padding:1.2cqh 5cqh 1.2cqh 3cqh;background:var(--c);color:var(--fg);white-space:nowrap;
  font-size:min(6cqh,calc(44cqw / var(--n) / .7));font-weight:900;text-transform:uppercase;letter-spacing:.02em;
  clip-path:polygon(0 0,100% 0,94% 100%,0 100%);
  animation:rl-band .7s ease both;animation-delay:calc(var(--t0) + .9s - var(--age))}
@keyframes rl-band{from{clip-path:polygon(0 0,0 0,0 100%,0 100%)}}
.rl-hasph .rl-ovsub{margin-top:1.5cqh;animation-delay:calc(var(--t0) + 1.4s - var(--age))}
.rl-card{position:relative;width:20cqh;height:28cqh;margin-bottom:3cqh;border-radius:1.4cqh;
  border:.5cqh solid rgba(255,255,255,.35);overflow:hidden;background:var(--c);
  background:linear-gradient(150deg,color-mix(in srgb,var(--c) 55%,#fff),var(--c) 45%,color-mix(in srgb,var(--c) 70%,#000));
  box-shadow:0 0 5cqh var(--c),0 2cqh 4cqh rgba(0,0,0,.6);
  animation:rl-card-in .8s cubic-bezier(.2,1.3,.4,1) both,rl-card-glow 1s ease-in-out infinite alternate;
  animation-delay:calc(var(--t0) + .6s - var(--age)),calc(var(--t0) + 1.4s - var(--age))}
.rl-card::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.5) 45%,transparent 55%)}
.rl-phw .rl-card{position:absolute;top:3cqh;right:2cqh;margin:0}
@keyframes rl-card-in{from{opacity:0;transform:translate(30cqw,-70cqh) rotate(-80deg) rotateY(180deg) scale(1.8)}
  to{opacity:1;transform:rotate(12deg)}}
@keyframes rl-card-glow{from{transform:rotate(12deg)}
  to{transform:rotate(12deg) scale(1.05);box-shadow:0 0 10cqh 2cqh var(--c),0 2cqh 4cqh rgba(0,0,0,.6)}}
/* .rl-calm: the card honours the device "reduce motion" setting (option force_motion off). */
@media (prefers-reduced-motion:reduce){.rl-calm :is(.rl-tick-in,.rl-live,.rl-bump,.rl-burst,.rl-rays2,.rl-ovtxt,
  .rl-ovlogo,.rl-ph,.rl-band,.rl-beam,.rl-card,.rl-strobe,.rl-ovsub){animation:none}
  .rl-calm :is(.rl-ring,.rl-cf,.rl-whistle){display:none}}
`, W = {
	top14: "TOP 14",
	champions_cup: "CHAMPIONS CUP",
	challenge_cup: "CHALLENGE CUP"
}, Ae = {
	scheduled: "À venir",
	first_half: "1re mi-temps",
	half_time: "Mi-temps",
	second_half: "2e mi-temps",
	extra_time: "Prolongations",
	finished: "Terminé",
	postponed: "Reporté",
	cancelled: "Annulé",
	unknown: ""
}, G = [
	"first_half",
	"half_time",
	"second_half",
	"extra_time"
], je = [
	[
		"try",
		"essai",
		"essais"
	],
	[
		"conversion",
		"transfo",
		"transfos"
	],
	[
		"penalty_goal",
		"pénalité",
		"pénalités"
	],
	[
		"drop_goal",
		"drop",
		"drops"
	]
], K = (e) => e.toLocaleTimeString("fr-FR", {
	hour: "2-digit",
	minute: "2-digit"
}).replace(":", "h"), q = (e) => e.toLocaleDateString("fr-FR", {
	weekday: "long",
	day: "numeric",
	month: "long"
}), J = (e) => e.target.style.display = "none", Me = (e) => !!e && !["unknown", "unavailable"].includes(e.state);
function Ne(e, t = /* @__PURE__ */ new Date()) {
	let n = Math.round((e.getTime() - t.getTime()) / 6e4);
	return n <= 0 ? `Coup d'envoi ${K(e)}` : n < 60 ? `Coup d'envoi dans ${n} min` : n < 720 ? `Coup d'envoi dans ${Math.floor(n / 60)} h ${String(n % 60).padStart(2, "0")}` : `${q(e)} • ${K(e)}`;
}
function Y(e, t, n, r = "rl-logo") {
	return e ? I`<img class=${r} src=${e} alt="" @error=${J} />` : I`<div class="${r} rl-init" style="background:${n || "#334155"}">${(t || "?").slice(0, 3).toUpperCase()}</div>`;
}
var X = class {
	constructor(e) {
		this.hass = e, this.all = Object.values(e.entities ?? {}).filter((e) => e.platform === "rugby_live");
	}
	resolve(e) {
		return e === "followed" ? this.followed() : e === "favorite" ? this.teams()[0] : e || void 0;
	}
	pick(e, t) {
		let n = this.resolve(e);
		return n ? this.all.find((e) => e.device_id === n && e.translation_key === t)?.entity_id : void 0;
	}
	state(e, t) {
		let n = this.pick(e, t);
		return n ? this.hass.states[n] : void 0;
	}
	devicesWith(e) {
		return [...new Set(this.all.filter((t) => t.translation_key === e).map((e) => e.device_id || ""))].filter(Boolean);
	}
	followed() {
		return this.devicesWith("animation")[0];
	}
	teams() {
		let e = new Set(this.devicesWith("score")), t = this.followed();
		return this.devicesWith("next_match").filter((n) => e.has(n) && n !== t);
	}
	competitions() {
		return this.devicesWith("live_matches");
	}
	teamId(e) {
		return this.state(e, "match_status")?.attributes.team_id ?? this.state(e, "next_match")?.attributes.team_id;
	}
};
function Z(e, t, n) {
	return !e || !t || e.entities !== t.entities || n.some((n) => n && e.states[n] !== t.states[n]);
}
var Q = { device: { filter: { integration: "rugby_live" } } }, $ = o`
  :host { display: block; }
  ha-card { padding: 16px; overflow: hidden; position: relative; }
  .rl-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--secondary-text-color); }
  .rl-live { display: inline-block; background: #dc2626; color: #fff; border-radius: 999px; padding: 1px 8px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em; animation: rl-pulse 1.4s infinite; }
  @keyframes rl-pulse { 50% { opacity: 0.45; } }
  .rl-logo { width: 40px; height: 40px; object-fit: contain; flex: none; }
  .rl-init { border-radius: 50%; display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 12px; }
  .rl-empty { color: var(--secondary-text-color); text-align: center; padding: 8px 0; }
  .rl-muted { color: var(--secondary-text-color); }
  .rl-fav { font-weight: 700; }
  @media (prefers-reduced-motion: reduce) { .rl-live, .rl-flash { animation: none; } }
`, Pe, Fe = {
	ticker: !0,
	watermark: !0,
	breakdown: !0,
	bonus: !0,
	animations: !0,
	force_motion: !1
}, Ie = {
	top14: "Top 14",
	champions_cup: "Champions Cup",
	challenge_cup: "Challenge Cup"
}, Le = {
	first_half: "1re MT",
	second_half: "2e MT",
	extra_time: "PROLONG."
}, Re = [
	"dim.",
	"lun.",
	"mar.",
	"mer.",
	"jeu.",
	"ven.",
	"sam."
], ze = {
	try: "ESSAI !",
	conversion: "TRANSFORMATION",
	penalty_goal: "PÉNALITÉ",
	drop_goal: "DROP !",
	yellow_card: "CARTON JAUNE",
	red_card: "CARTON ROUGE",
	kickoff: "COUP D'ENVOI",
	half_time: "MI-TEMPS",
	second_half: "REPRISE",
	extra_time: "PROLONGATIONS",
	full_time: "FIN DU MATCH",
	revoked: "ACTION ANNULÉE"
}, Be = {
	try: "Essai",
	conversion: "Transformation",
	penalty_goal: "Pénalité",
	drop_goal: "Drop",
	yellow_card: "Carton jaune",
	red_card: "Carton rouge"
}, Ve = [
	"try",
	"conversion",
	"penalty_goal",
	"drop_goal"
], He = class extends U {
	constructor(...e) {
		super(...e), this.isPanel = !1, this._config = { type: "custom:rugby-live-direct-card" }, this._score = {
			key: "",
			h: 0,
			a: 0,
			ph: !1,
			pa: !1,
			bh: 0,
			ba: 0
		};
	}
	setConfig(e) {
		if (!e) throw Error("Configuration invalide");
		this._config = e;
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		let e = (e) => ({
			name: e,
			selector: { boolean: {} }
		}), t = {
			device: "Match suivi (appareil)",
			favorite: "Équipe favorite (prochain match, vidéos spéciales)",
			ticker: "Bandeau des autres matchs",
			watermark: "Logo de la compétition en filigrane",
			breakdown: "Détail des points (essais, transformations…)",
			bonus: "Bonus Top 14",
			animations: "Animations des actions",
			force_motion: "Animer même si l'appareil demande moins d'animations"
		};
		return {
			schema: [
				{
					name: "device",
					selector: { device: { filter: { integration: "rugby_live" } } }
				},
				{
					name: "favorite",
					selector: { device: { filter: { integration: "rugby_live" } } }
				},
				{
					type: "grid",
					name: "",
					schema: [
						"ticker",
						"watermark",
						"breakdown",
						"bonus",
						"animations",
						"force_motion"
					].map(e)
				}
			],
			computeLabel: (e) => t[e.name],
			computeHelper: (e) => e.name === "device" || e.name === "favorite" ? "Vide : choisi automatiquement." : void 0
		};
	}
	getCardSize() {
		return 8;
	}
	getGridOptions() {
		return {
			columns: "full",
			min_columns: 6
		};
	}
	get cfg() {
		return {
			...Fe,
			...this._config
		};
	}
	_ids() {
		let e = Object.values(this.hass?.entities ?? {}).filter((e) => e.platform === "rugby_live"), t = this._config.device || e.find((e) => e.translation_key === "animation")?.device_id, n = this._config.favorite || e.find((n) => n.translation_key === "next_match" && n.device_id !== t && e.some((e) => e.device_id === n.device_id && e.translation_key === "score"))?.device_id, r = (t, n) => t ? e.find((e) => e.device_id === t && e.translation_key === n)?.entity_id : void 0;
		return {
			status: r(t, "match_status"),
			score: r(t, "score"),
			minute: r(t, "minute"),
			last: r(t, "last_event"),
			anim: r(t, "animation"),
			next: r(n, "next_match"),
			live: e.filter((e) => e.translation_key === "live_matches").map((e) => e.entity_id)
		};
	}
	shouldUpdate(e) {
		if (!e.has("hass") || e.size > 1) return !0;
		let t = e.get("hass");
		if (!t || t.entities !== this.hass?.entities) return !0;
		let n = this._ids();
		return [
			n.status,
			n.score,
			n.minute,
			n.last,
			n.anim,
			n.next,
			...n.live
		].some((e) => e && t.states[e] !== this.hass.states[e]);
	}
	render() {
		if (!this.hass) return R;
		let e = this.cfg, t = this._ids(), n = (e) => e ? this.hass.states[e] : void 0, r = n(t.status), i = r ? r.state : "no_match", a = r?.attributes ?? {}, o = n(t.score)?.attributes ?? {}, s = n(t.anim), c = n(t.next), l = c?.attributes.team_id, u = e.watermark && Ie[a.competition] ? I`<img class="rl-wm" src="/local/images/rugby/competitions/${encodeURIComponent(Ie[a.competition])}.svg" @error=${J} />` : R, d = e.animations ? this._overlay(s, o, l) : R;
		return I`<ha-card>
      <div class="rl-box ${this.isPanel ? "rl-panel" : ""}">
        <div class="rl-wrap ${e.force_motion ? "" : "rl-calm"}">
          ${u}${e.ticker ? this._ticker(a, t.live) : R}
          <div class="rl-main">${this._main(i, a, o, c, s)}</div>
          ${d}
        </div>
      </div>
    </ha-card>`;
	}
	_ticker(e, t) {
		let n = e.matchday;
		if (n ||= t.flatMap((e) => this.hass.states[e]?.attributes.matches ?? []), !n.length) return R;
		let r = n.map((e) => {
			let t = new Date(e.kickoff);
			return e.status === "scheduled" ? I`${e.home_name} – ${e.away_name} <b>${Re[t.getDay()]} ${K(t)}</b>` : I`${e.home_name} <b>${e.home_score} - ${e.away_score}</b> ${e.away_name}
            <span style="color:#f87171">${G.includes(e.status) ? e.minute || "" : "Fin"}</span>`;
		}), i = r.map((e, t) => I`${t ? I`&nbsp;&nbsp;•&nbsp;&nbsp;` : R}${e}`), a = Math.max(25, r.length * 7);
		return I`<div class="rl-tick"><div class="rl-tick-in" style="animation-duration:${a}s;animation-delay:-${(Date.now() / 1e3 % a).toFixed(1)}s">
      ${i} &nbsp;&nbsp;•&nbsp;&nbsp; ${i}</div></div>`;
	}
	_main(e, t, n, r, i) {
		let a = Me(r) ? r.attributes : null;
		if (e === "no_match") {
			if (!a) return I`<div class="rl-state" style="color:#94a3b8">Aucun match pour le moment</div>`;
			let e = new Date(r.state), t = a.home_away === "home", n = t ? [
				a.team_logo,
				a.team_name,
				a.team_color
			] : [
				a.opponent_logo,
				a.opponent_name,
				a.opponent_color
			], i = t ? [
				a.opponent_logo,
				a.opponent_name,
				a.opponent_color
			] : [
				a.team_logo,
				a.team_name,
				a.team_color
			];
			return I`<div class="rl-comp">PROCHAIN MATCH DE ${(a.team_name || "").toUpperCase()} • ${W[a.competition] || ""}</div>
        <div class="rl-row">
          <div class="rl-team">${Y(n[0], n[1], n[2])}<div class="rl-name">${n[1] || ""}</div></div>
          <div class="rl-score"><span style="color:#64748b">VS</span></div>
          <div class="rl-team">${Y(i[0], i[1], i[2])}<div class="rl-name">${i[1] || ""}</div></div>
        </div>
        <div class="rl-state" style="color:#4ade80">${q(e)} • ${K(e)}</div>
        <div class="rl-last">${a.venue || ""}</div>
        ${a.channel ? I`<div class="rl-chan">📺 ${a.channel}</div>` : R}`;
		}
		let o = G.includes(e), s = this._ids(), c = s.minute ? this.hass.states[s.minute] : void 0, l = s.last ? this.hass.states[s.last] : void 0, u = c?.attributes.display ?? "", d = t.channel && e !== "finished" ? I`<div class="rl-chan">📺 ${t.channel}</div>` : R;
		if (e === "scheduled") {
			let e = new Date(t.kickoff), r = e.toDateString() === (/* @__PURE__ */ new Date()).toDateString() ? `Coup d'envoi ${K(e)}` : `${q(e)} • ${K(e)}`;
			return I`<div class="rl-comp">${W[t.competition] || ""}</div>
        <div class="rl-row">
          <div class="rl-team">${Y(n.home_logo, n.home_name, n.home_color)}<div class="rl-name">${n.home_name || ""}</div></div>
          <div class="rl-score"><span style="color:#64748b">VS</span></div>
          <div class="rl-team">${Y(n.away_logo, n.away_name, n.away_color)}<div class="rl-name">${n.away_name || ""}</div></div>
        </div>
        <div class="rl-state"><span style="color:#4ade80">${r}</span></div>${d}`;
		}
		let f = c && !isNaN(parseInt(c.state)) ? parseInt(c.state) : null, p = l?.attributes.minute, m = o && f !== null && p != null && f - p <= 3 && l && l.state && l.state !== "unknown" ? I`<div class="rl-last">${l.state}</div>` : R, h = n.provisional ? I`<div class="rl-provtag">SCORE EN ATTENTE DE VALIDATION</div>` : R, g = R;
		if (e === "finished" && a) {
			let e = new Date(r.state), t = a.home_away === "home" ? `${a.team_name} – ${a.opponent_name}` : `${a.opponent_name} – ${a.team_name}`;
			g = I`<div class="rl-next"><small>PROCHAIN MATCH • ${W[a.competition] || ""}</small><b>${t}</b><br />
        ${q(e)} • ${K(e)}${a.channel ? ` • 📺 ${a.channel}` : ""}</div>`;
		}
		let _ = n.home_score ?? 0, v = n.away_score ?? 0, y = n.counters ?? {}, b = o && e !== "half_time" ? I`<span class="rl-live">LIVE</span><b>${u}</b><small>${Le[e] || ""}</small>` : I`<b>${e === "half_time" ? "MT" : e === "finished" ? "FIN" : ""}</b>
          <small>${e === "half_time" ? "MI-TEMPS" : (Ae[e] || "").toUpperCase()}</small>`, x = (e) => this.cfg.breakdown ? je.filter(([t]) => e?.[t]).map(([t, n, r]) => I`<span><b>${e[t]}</b> ${e[t] > 1 ? r : n}</span>`) : R, S = (n, r, i, a) => {
			if (!this.cfg.bonus || t.competition !== "top14") return R;
			let o = n > r && i - a >= 3 ? "BONUS OFFENSIF" : n < r && r - n <= 5 ? "BONUS DÉFENSIF" : "";
			return o ? I`<span class="rl-bon ${e === "finished" ? "" : "rl-on"}">${o}</span>` : R;
		}, C = (e) => e?.try ?? 0, w = this._bump(`${n.home_id}-${n.away_id}`, _, v, !!i && i.state !== "idle"), T = n.provisional ? "rl-prov" : "", E = (e, t, n) => Oe(`${e}${n}`, I`<div class="rl-sbs rl-sbs${e} ${T} ${n ? "rl-bump" : ""}">${t}</div>`);
		return I`<div class="rl-comp">${W[t.competition] || ""}</div>
      <div class="rl-sb" style="--hc:${n.home_color || "#334155"};--ac:${n.away_color || "#334155"}">
        <div class="rl-sbt rl-sbh">${Y(n.home_logo, n.home_name, n.home_color, "")}<span>${n.home_name || ""}</span></div>
        ${E("h", _, w.h)}
        <div class="rl-clock">${b}</div>
        ${E("a", v, w.a)}
        <div class="rl-sbt rl-sba"><span>${n.away_name || ""}</span>${Y(n.away_logo, n.away_name, n.away_color, "")}</div>
        <div class="rl-sbd rl-sbdh"><div>${x(y.home)}</div>${S(_, v, C(y.home), C(y.away))}</div>
        <div class="rl-sbd rl-sbda"><div>${x(y.away)}</div>${S(v, _, C(y.away), C(y.home))}</div>
      </div>
      ${h}${m}${d}${g}`;
	}
	_bump(e, t, n, r) {
		let i = this._score;
		return i.key !== e && Object.assign(i, {
			key: e,
			h: t,
			a: n,
			ph: !1,
			pa: !1
		}), i.h !== t && (i.ph = !0), i.a !== n && (i.pa = !0), i.h = t, i.a = n, !r && i.ph && (i.bh++, i.ph = !1), !r && i.pa && (i.ba++, i.pa = !1), {
			h: i.bh,
			a: i.ba
		};
	}
	_overlay(e, t, n) {
		let r = e ? e.state : "idle", i = e?.attributes ?? {}, a = (i.duration || 20) * 1e3, o = i.started_at ? Date.now() - Date.parse(i.started_at) : NaN;
		if (r === "idle" || isNaN(o) || o < 0 || o >= a) return R;
		let s = i.team_id, c = !!s && s === t.home_id, l = r === "yellow_card" || r === "red_card", u = Ve.includes(r), d = !l && !u, f = c ? t.home_color : s ? t.away_color : null, p = c ? t.home_logo : s ? t.away_logo : null, m = r === "yellow_card" ? "#eab308" : r === "red_card" ? "#dc2626" : !d && f || "#334155", h = r === "yellow_card" ? "#111" : "#fff", g = `/local/rugby_live/anim/${n && s === n && u ? r + "_toulouse" : r}.mp4#t=${(o / 1e3 % 6).toFixed(1)}`, _ = ze[r] || r, v = i.minute ? `${i.minute}'` : "", y = o / 1e3, b = i.background ?? [], x = [
			0,
			.8,
			1.6
		].map((e) => I`<div class="rl-ring" style="animation-delay:-${(y + e).toFixed(2)}s"></div>`), S = [
			m,
			"#ffffff",
			"#fbbf24"
		], C = l || !b.includes("confetti") ? R : Array.from({ length: 36 }, (e, t) => I`<i class="rl-cf" style="left:${t * 37 % 100}%;width:${(.6 + t % 3 * .3).toFixed(1)}cqw;background:${S[t % 3]};animation-duration:${(3 + t % 5 * .6).toFixed(1)}s;animation-delay:-${(y + t * .53).toFixed(2)}s"></i>`), w = l ? I`<div class="rl-strobe"></div>${x}` : I`${b.includes("rays") ? I`<div class="rl-burst" style="animation-duration:${a}ms"></div><div class="rl-rays2"></div>` : R}
          ${b.includes("beams") ? I`<div class="rl-beam rl-l"></div><div class="rl-beam rl-r"></div>` : R}
          ${b.includes("rings") ? x : R}`, T = d ? null : i.player_photo, E = p && !d ? I`<img class="rl-ovlogo" src=${p} @error=${J} />` : R, D = l ? I`<div class="rl-card"></div>` : R, O = I`<div class="rl-ovtxt" style="--n:${_.length}">${_}</div>`, k = [
			r === "revoked" && Be[i.revoked_type],
			i.player || i.team_name,
			v
		].filter(Boolean).join(" • "), A = T ? I`<div class="rl-phw"><img class="rl-ph" src=${T} @error=${J} />${D}</div>
          <div class="rl-col">${E}${O}
            <div class="rl-band" style="--n:${String(i.player || "").length}">${i.player}</div>
            <div class="rl-ovsub">${[i.team_name, v].filter(Boolean).join(" • ")}</div></div>` : I`${l ? D : E}${O}<div class="rl-ovsub">${k}</div>`, ee = l ? I`<svg class="rl-whistle" viewBox="0 0 180 100" aria-hidden="true">
          <circle cx="16" cy="34" r="9" fill="none" stroke="#cbd5e1" stroke-width="4" />
          <rect x="46" y="26" width="92" height="24" rx="6" fill="#e2e8f0" />
          <circle cx="50" cy="60" r="32" fill="#e2e8f0" /><circle cx="50" cy="60" r="11" fill="#475569" />
          <rect x="96" y="30" width="16" height="7" rx="2" fill="#475569" />
          <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">
            <path class="rl-wave" d="M148 26 q8 12 0 24" />
            <path class="rl-wave" style="animation-delay:.12s" d="M158 18 q14 20 0 40" />
            <path class="rl-wave" style="animation-delay:.24s" d="M168 10 q20 28 0 56" /></g></svg>` : R;
		return Oe(i.started_at, I`<div class="rl-ov ${T ? "rl-hasph" : ""} ${l ? "rl-iscard" : ""}"
      style="--c:${m};--fg:${h};--age:${o}ms;animation-duration:${a}ms;animation-delay:-${o}ms">
      <video class="rl-vid" src=${g} autoplay muted loop playsinline @error=${J}></video>
      ${w}${A}${C}${ee}</div>`);
	}
};
Pe = He, Pe.styles = ke, Pe.properties = {
	hass: { attribute: !1 },
	isPanel: { attribute: !1 },
	_config: { state: !0 }
};
//#endregion
//#region src/fixtures-card.ts
var Ue, We = class extends U {
	constructor(...e) {
		super(...e), this._config = { type: "custom:rugby-live-fixtures-card" };
	}
	setConfig(e) {
		this._config = e;
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		let e = {
			device: "Compétition ou équipe (appareil)",
			count_upcoming: "Matchs à venir",
			count_results: "Derniers résultats"
		};
		return {
			schema: [{
				name: "device",
				selector: Q
			}, {
				type: "grid",
				name: "",
				schema: [{
					name: "count_upcoming",
					selector: { number: {
						min: 0,
						max: 30,
						mode: "box"
					} }
				}, {
					name: "count_results",
					selector: { number: {
						min: 0,
						max: 30,
						mode: "box"
					} }
				}]
			}],
			computeLabel: (t) => e[t.name],
			computeHelper: (e) => e.name === "device" ? "Vide : première compétition." : void 0
		};
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	_sources(e) {
		let t = this._config.device || e.competitions()[0], n = e.pick(t, "live_matches") !== void 0;
		return {
			device: t,
			competition: n,
			ids: (n ? [t] : e.competitions()).map((t) => e.pick(t, "next_match")).filter((e) => !!e)
		};
	}
	shouldUpdate(e) {
		return !e.has("hass") || e.size > 1 || !this.hass || Z(e.get("hass"), this.hass, this._sources(new X(this.hass)).ids);
	}
	render() {
		if (!this.hass) return R;
		let e = {
			count_upcoming: 6,
			count_results: 4,
			...this._config
		}, t = new X(this.hass), n = this._sources(t), r = n.competition ? void 0 : t.teamId(n.device), i = new Set(t.teams().map((e) => t.teamId(e)).filter(Boolean)), a = /* @__PURE__ */ new Set(), o = n.ids.flatMap((e) => this.hass.states[e]?.attributes.fixtures ?? []).filter((e) => !r || e.home_id === r || e.away_id === r).filter((e) => !a.has(e.match_id) && !!a.add(e.match_id)).sort((e, t) => Date.parse(e.kickoff) - Date.parse(t.kickoff)), s = o.filter((e) => G.includes(e.status)), c = o.filter((e) => e.status === "scheduled").slice(0, e.count_upcoming), l = o.filter((e) => e.status === "finished").slice(-e.count_results).reverse(), u = n.competition ? W[o[0]?.competition] || "Calendrier" : this.hass.states[t.pick(n.device, "next_match") ?? ""]?.attributes.team_name || "Calendrier", d = (e, t) => t.length ? I`<div class="rl-sec">${e}</div>${this._days(t, i, !n.competition)}` : R;
		return I`<ha-card>
      <div class="rl-h"><span>${u}</span>${s.length ? I`<span class="rl-live">LIVE</span>` : R}</div>
      ${o.length ? I`${d("En direct", s)}${d("À venir", c)}${d("Résultats", l)}` : I`<div class="rl-empty">Aucun match dans les prochains jours</div>`}
    </ha-card>`;
	}
	_days(e, t, n) {
		let r = "";
		return e.map((e) => {
			let i = new Date(e.kickoff), a = q(i), o = a === r ? R : I`<div class="rl-day">${a}</div>`;
			r = a;
			let s = e.status === "scheduled" ? K(i) : `${e.home_score} - ${e.away_score}`;
			return I`${o}<div class="rl-m">
        <div class="rl-t ${t.has(e.home_id) ? "rl-fav" : ""}">${Y(e.home_logo, e.home_name, e.home_color)}<span>${e.home_name}</span></div>
        <div class="rl-mid ${e.status === "scheduled" ? "rl-time" : ""} ${G.includes(e.status) ? "rl-red" : ""}">${s}</div>
        <div class="rl-t rl-r ${t.has(e.away_id) ? "rl-fav" : ""}"><span>${e.away_name}</span>${Y(e.away_logo, e.away_name, e.away_color)}</div>
        ${n && e.competition || e.status === "scheduled" && e.channel ? I`<div class="rl-sub">${[n && W[e.competition], e.status === "scheduled" && e.channel && `📺 ${e.channel}`].filter(Boolean).join(" • ")}</div>` : R}
      </div>`;
		});
	}
};
Ue = We, Ue.properties = {
	hass: { attribute: !1 },
	_config: { state: !0 }
}, Ue.styles = [$, o`
    .rl-sec { margin: 12px 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary-color); }
    .rl-sec:first-of-type { margin-top: 0; }
    .rl-day { margin-top: 6px; font-size: 12px; color: var(--secondary-text-color); }
    .rl-day::first-letter { text-transform: uppercase; }
    .rl-m { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 2px 10px;
      padding: 6px 0; border-bottom: 1px solid var(--divider-color); }
    .rl-t { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; }
    .rl-t span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-r { justify-content: flex-end; text-align: right; }
    .rl-t .rl-logo { width: 24px; height: 24px; }
    .rl-t .rl-init { font-size: 9px; }
    .rl-mid { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center; min-width: 52px; }
    .rl-time { font-weight: 600; color: var(--secondary-text-color); }
    .rl-red { color: #dc2626; }
    .rl-sub { grid-column: 1 / -1; text-align: center; font-size: 12px; color: var(--secondary-text-color); }
  `];
//#endregion
//#region src/multiplex-card.ts
var Ge, Ke = class extends U {
	constructor(...e) {
		super(...e), this._config = { type: "custom:rugby-live-multiplex-card" };
	}
	setConfig(e) {
		this._config = e;
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		let e = {
			devices: "Compétitions (appareils)",
			show_finished: "Afficher les matchs terminés",
			compact: "Compact"
		};
		return {
			schema: [{
				name: "devices",
				selector: { device: {
					...Q.device,
					multiple: !0
				} }
			}, {
				type: "grid",
				name: "",
				schema: ["show_finished", "compact"].map((e) => ({
					name: e,
					selector: { boolean: {} }
				}))
			}],
			computeLabel: (t) => e[t.name],
			computeHelper: (e) => e.name === "devices" ? "Vide : toutes les compétitions." : void 0
		};
	}
	getCardSize() {
		return 5;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	_ids(e) {
		return (this._config.devices?.length ? this._config.devices : e.competitions()).map((t) => e.pick(t, "live_matches")).filter((e) => !!e);
	}
	shouldUpdate(e) {
		return !e.has("hass") || e.size > 1 || !this.hass || Z(e.get("hass"), this.hass, this._ids(new X(this.hass)));
	}
	render() {
		if (!this.hass) return R;
		let e = {
			show_finished: !0,
			compact: !1,
			...this._config
		}, t = new X(this.hass), n = new Set(t.teams().map((e) => t.teamId(e)).filter(Boolean)), r = this._ids(t).map((e) => this.hass.states[e]?.attributes.matches ?? []).map((t) => t.filter((t) => e.show_finished || t.status !== "finished")).filter((e) => e.length), i = r.length ? r.map((e) => I`<div class="rl-group">
          <div class="rl-h"><span>${W[e[0].competition] || ""}</span>
            <span>${e.some((e) => G.includes(e.status)) ? I`<span class="rl-live">LIVE</span>` : R}</span></div>
          ${e.map((e) => this._match(e, n))}</div>`) : I`<div class="rl-empty">Aucun match aujourd'hui</div>`;
		return I`<ha-card class=${e.compact ? "rl-compact" : ""}>${i}</ha-card>`;
	}
	_match(e, t) {
		let n = G.includes(e.status), r = e.status === "half_time" ? "MT" : n ? e.minute || "" : e.status === "finished" ? "Fin" : e.status === "scheduled" ? K(new Date(e.kickoff)) : "", i = e.status === "scheduled" ? I`<span class="rl-muted">-</span>` : I`${e.home_score} - ${e.away_score}`;
		return I`<div class="rl-match ${n ? "rl-on" : ""}">
      <div class="rl-when ${n ? "rl-red" : ""}">${r}</div>
      <div class="rl-t ${t.has(e.home_id) ? "rl-fav" : ""}">${Y(e.home_logo, e.home_name, e.home_color)}<span>${e.home_name}</span></div>
      <div class="rl-sc ${e.provisional ? "rl-prov" : ""}">${i}</div>
      <div class="rl-t rl-r ${t.has(e.away_id) ? "rl-fav" : ""}"><span>${e.away_name}</span>${Y(e.away_logo, e.away_name, e.away_color)}</div>
      ${n && e.last_event ? I`<div class="rl-ev">${e.last_event}</div>` : R}
      ${e.status === "scheduled" && e.channel ? I`<div class="rl-ev">📺 ${e.channel}</div>` : R}
    </div>`;
	}
};
Ge = Ke, Ge.properties = {
	hass: { attribute: !1 },
	_config: { state: !0 }
}, Ge.styles = [$, o`
    .rl-group + .rl-group { margin-top: 16px; }
    .rl-match { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto minmax(0, 1fr); align-items: center;
      gap: 4px 10px; padding: 8px 0; border-top: 1px solid var(--divider-color); }
    .rl-when { font-size: 12px; font-weight: 700; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
    .rl-red { color: #dc2626; }
    .rl-t { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; }
    .rl-t span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-r { justify-content: flex-end; text-align: right; }
    .rl-t .rl-logo { width: 26px; height: 26px; }
    .rl-t .rl-init { font-size: 9px; }
    .rl-sc { font-weight: 800; font-size: 17px; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center; min-width: 52px; }
    .rl-prov { color: var(--warning-color, #f59e0b); }
    .rl-ev { grid-column: 2 / -1; font-size: 12px; color: var(--secondary-text-color); text-align: center; }
    .rl-compact .rl-match { padding: 5px 0; }
    .rl-compact .rl-t .rl-logo { width: 20px; height: 20px; }
  `];
//#endregion
//#region src/scoreboard-card.ts
var qe, Je = [
	"match_status",
	"score",
	"minute",
	"last_event",
	"sin_bin",
	"next_match"
], Ye = class extends U {
	constructor(...e) {
		super(...e), this._config = { type: "custom:rugby-live-scoreboard-card" };
	}
	setConfig(e) {
		this._config = e;
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		let e = {
			device: "Équipe (appareil)",
			show_logos: "Logos",
			show_counters: "Compteurs (essais, cartons…)",
			compact: "Compact"
		};
		return {
			schema: [{
				name: "device",
				selector: Q
			}, {
				type: "grid",
				name: "",
				schema: [
					"show_logos",
					"show_counters",
					"compact"
				].map((e) => ({
					name: e,
					selector: { boolean: {} }
				}))
			}],
			computeLabel: (t) => e[t.name],
			computeHelper: (e) => e.name === "device" ? "Vide : première équipe favorite." : void 0
		};
	}
	getCardSize() {
		return 3;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	_device(e) {
		return this._config.device || e.teams()[0] || e.followed();
	}
	shouldUpdate(e) {
		if (!e.has("hass") || e.size > 1 || !this.hass) return !0;
		let t = new X(this.hass), n = this._device(t);
		return Z(e.get("hass"), this.hass, Je.map((e) => t.pick(n, e)));
	}
	render() {
		if (!this.hass) return R;
		let e = {
			show_logos: !0,
			show_counters: !0,
			compact: !1,
			...this._config
		}, t = new X(this.hass), n = this._device(t), r = t.state(n, "match_status"), i = r?.state ?? "no_match", a = (t) => I`<ha-card class=${e.compact ? "rl-compact" : ""}>${t}</ha-card>`;
		if (!r || i === "no_match" || i === "unavailable") {
			let r = t.state(n, "next_match");
			if (!Me(r)) return a(I`<div class="rl-empty">Aucun match prévu</div>`);
			let i = r.attributes, [o, s] = i.home_away === "home" ? ["team", "opponent"] : ["opponent", "team"];
			return a(I`<div class="rl-h"><span>Prochain match • ${W[i.competition] || ""}</span></div>
        ${this._row(e.show_logos, i[`${o}_logo`], i[`${o}_name`], i[`${o}_color`], I`<span class="rl-vs">VS</span>`, i[`${s}_logo`], i[`${s}_name`], i[`${s}_color`])}
        <div class="rl-foot">${Ne(new Date(r.state))}${i.channel ? ` • 📺 ${i.channel}` : ""}</div>`);
		}
		let o = r.attributes, s = t.state(n, "score")?.attributes ?? {}, c = t.state(n, "minute")?.attributes.display ?? "", l = G.includes(i), u = i === "half_time" ? I`<span class="rl-badge">MI-TEMPS</span>` : l ? I`<span class="rl-live">LIVE</span> <b class="rl-min">${c}</b>` : i === "finished" ? I`<span class="rl-badge">TERMINÉ</span>` : i === "scheduled" ? I`<span>${Ne(new Date(o.kickoff))}</span>` : I`<span>${i}</span>`, d = i === "scheduled" ? I`<span class="rl-vs">VS</span>` : I`<span class=${s.provisional ? "rl-prov" : ""}>${s.home_score ?? 0}<span class="rl-dash">-</span>${s.away_score ?? 0}</span>`, f = s.counters ?? {}, p = this._sinbin(t.state(n, "sin_bin"), o.home_away), m = e.show_counters && i !== "scheduled" ? I`<div class="rl-cnt"><div>${this._counters(f.home)}</div><div></div><div>${this._counters(f.away)}</div></div>` : R;
		return a(I`${this._flash(t.state(n, "last_event"), s, o.home_away)}
      <div class="rl-h"><span>${W[o.competition] || ""}</span><span>${u}</span></div>
      ${this._row(e.show_logos, s.home_logo, s.home_name, s.home_color, d, s.away_logo, s.away_name, s.away_color)}
      ${m}
      ${p.length ? I`<div class="rl-sinbin">${p.map((e) => I`<span><i class="rl-yc"></i>${e}</span>`)}</div>` : R}
      ${i === "scheduled" && (o.venue || o.channel) ? I`<div class="rl-foot">${[o.venue, o.channel && `📺 ${o.channel}`].filter(Boolean).join(" • ")}</div>` : R}`);
	}
	_row(e, t, n, r, i, a, o, s) {
		return I`<div class="rl-row">
      <div class="rl-team">${e ? Y(t, n, r) : R}<span>${n || ""}</span></div>
      <div class="rl-score">${i}</div>
      <div class="rl-team rl-away"><span>${o || ""}</span>${e ? Y(a, o, s) : R}</div>
    </div>`;
	}
	_counters(e) {
		let t = je.filter(([t]) => e?.[t]).map(([t, n, r]) => I`<span><b>${e[t]}</b> ${e[t] > 1 ? r : n}</span>`), n = [...Array.from({ length: e?.yellow_card ?? 0 }, () => I`<i class="rl-yc" title="Carton jaune"></i>`), ...Array.from({ length: e?.red_card ?? 0 }, () => I`<i class="rl-rc" title="Carton rouge"></i>`)];
		return I`${t}${n.length ? I`<span class="rl-cards">${n}</span>` : R}`;
	}
	_sinbin(e, t) {
		if (!e || e.state !== "on") return [];
		let n = e.attributes, r = (e) => `${e.name || "Joueur"} → ${e.until_minute}'`;
		if (n.home_players || n.away_players) return [...n.home_players ?? [], ...n.away_players ?? []].map(r);
		let [i, a] = t === "away" ? ["opponent_players", "players"] : ["players", "opponent_players"];
		return [...n[i] ?? [], ...n[a] ?? []].map(r);
	}
	_flash(e, t, n) {
		if (!e?.last_changed || Date.now() - Date.parse(e.last_changed) > 4e3) return R;
		let r = e.attributes.side, i = r ? r === "home" || r === "team" && n !== "away" || r === "opponent" && n === "away" ? t.home_color : t.away_color : null;
		return Oe(e.last_changed, I`<div class="rl-flash" style="--c:${i || "var(--primary-color)"}"></div>`);
	}
};
qe = Ye, qe.properties = {
	hass: { attribute: !1 },
	_config: { state: !0 }
}, qe.styles = [$, o`
    .rl-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px; }
    .rl-team { display: flex; align-items: center; gap: 10px; min-width: 0; font-weight: 700; font-size: 15px; }
    .rl-team span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-away { justify-content: flex-end; text-align: right; }
    .rl-score { font-size: 34px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; line-height: 1; }
    .rl-dash { color: var(--secondary-text-color); margin: 0 6px; }
    .rl-vs { color: var(--secondary-text-color); font-size: 20px; }
    .rl-prov { color: var(--warning-color, #f59e0b); }
    .rl-min { color: var(--primary-text-color); margin-left: 4px; }
    .rl-badge { background: var(--secondary-background-color); border-radius: 999px; padding: 1px 8px; }
    .rl-cnt { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 12px; margin-top: 10px;
      font-size: 12px; color: var(--secondary-text-color); }
    .rl-cnt > div { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
    .rl-cnt > div:last-child { justify-content: flex-end; }
    .rl-cnt b { color: var(--primary-text-color); }
    .rl-cards { display: inline-flex; gap: 3px; }
    .rl-yc, .rl-rc { display: inline-block; width: 9px; height: 13px; border-radius: 2px; background: #eab308; vertical-align: -2px; margin-right: 4px; }
    .rl-rc { background: #dc2626; }
    .rl-sinbin { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; font-size: 13px; }
    .rl-foot { margin-top: 10px; font-size: 13px; color: var(--secondary-text-color); text-align: center; }
    .rl-flash { position: absolute; inset: 0; pointer-events: none; background: var(--c); opacity: 0; animation: rl-flash 1.6s ease-out; }
    @keyframes rl-flash { 15% { opacity: 0.35; } 100% { opacity: 0; } }
    .rl-compact { padding: 10px 12px; }
    .rl-compact .rl-logo { width: 28px; height: 28px; }
    .rl-compact .rl-score { font-size: 26px; }
    .rl-compact .rl-team { font-size: 13px; }
  `];
//#endregion
//#region src/timeline-card.ts
var Xe, Ze = {
	try: "mdi:rugby",
	conversion: "mdi:numeric-2-circle",
	penalty_goal: "mdi:numeric-3-circle",
	drop_goal: "mdi:numeric-3-box",
	yellow_card: "mdi:card",
	red_card: "mdi:card",
	sub_on: "mdi:swap-horizontal",
	sub_off: "mdi:swap-horizontal"
}, Qe = {
	yellow_card: "#eab308",
	red_card: "#dc2626"
}, $e = class extends U {
	constructor(...e) {
		super(...e), this._config = { type: "custom:rugby-live-timeline-card" };
	}
	setConfig(e) {
		this._config = e;
	}
	static getStubConfig() {
		return {};
	}
	static getConfigForm() {
		let e = {
			device: "Match (appareil)",
			show_subs: "Afficher les remplacements",
			limit: "Nombre d'actions"
		};
		return {
			schema: [{
				name: "device",
				selector: Q
			}, {
				type: "grid",
				name: "",
				schema: [{
					name: "show_subs",
					selector: { boolean: {} }
				}, {
					name: "limit",
					selector: { number: {
						min: 3,
						max: 60,
						mode: "box"
					} }
				}]
			}],
			computeLabel: (t) => e[t.name],
			computeHelper: (e) => e.name === "device" ? "Vide : Match suivi." : void 0
		};
	}
	getCardSize() {
		return 5;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	_device(e) {
		return this._config.device || e.followed();
	}
	shouldUpdate(e) {
		if (!e.has("hass") || e.size > 1 || !this.hass) return !0;
		let t = new X(this.hass), n = this._device(t);
		return Z(e.get("hass"), this.hass, [t.pick(n, "last_event"), t.pick(n, "score")]);
	}
	render() {
		if (!this.hass) return R;
		let e = {
			show_subs: !1,
			limit: 15,
			...this._config
		}, t = new X(this.hass), n = this._device(t), r = t.state(n, "score")?.attributes ?? {}, i = t.state(n, "match_status")?.attributes ?? {}, a = (t.state(n, "last_event")?.attributes.events ?? []).filter((t) => e.show_subs || !String(t.type).startsWith("sub_")).slice(-e.limit).reverse(), o = (e) => (e === "home" ? r.home_color : e === "away" ? r.away_color : null) || "var(--divider-color)", s = r.home_name ? `${r.home_name} – ${r.away_name}` : "";
		return I`<ha-card>
      <div class="rl-h"><span>${W[i.competition] ? `${W[i.competition]} • ` : ""}${s}</span></div>
      ${a.length ? I`<ol class="rl-list">${a.map((e) => I`<li style="--c:${o(e.side)}">
            <span class="rl-min">${e.minute == null ? "" : `${e.minute}'`}</span>
            <ha-icon icon=${Ze[e.type] || "mdi:circle-small"} style=${Qe[e.type] ? `color:${Qe[e.type]}` : ""}></ha-icon>
            <span class="rl-what"><b>${e.label}</b>${e.player ? I` — ${e.player}` : R}
              <small>${e.team || ""}</small></span></li>`)}</ol>` : I`<div class="rl-empty">Aucune action pour le moment</div>`}
    </ha-card>`;
	}
};
Xe = $e, Xe.properties = {
	hass: { attribute: !1 },
	_config: { state: !0 }
}, Xe.styles = [$, o`
    .rl-list { list-style: none; margin: 0; padding: 0; }
    .rl-list li { display: grid; grid-template-columns: 36px 24px minmax(0, 1fr); align-items: center; gap: 10px;
      padding: 7px 0 7px 10px; border-left: 4px solid var(--c); border-top: 1px solid var(--divider-color); }
    .rl-list li:first-child { border-top: none; }
    .rl-min { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--secondary-text-color); }
    ha-icon { --mdc-icon-size: 22px; color: var(--primary-text-color); }
    .rl-what { min-width: 0; font-size: 14px; }
    .rl-what small { display: block; color: var(--secondary-text-color); font-size: 12px; }
  `];
//#endregion
//#region src/main.ts
var et = [
	[
		"rugby-live-direct-card",
		He,
		"Rugby Live – Direct",
		"Tableau de score plein écran, bandeau des matchs et animations des actions (essais, cartons…)."
	],
	[
		"rugby-live-scoreboard-card",
		Ye,
		"Rugby Live – Score",
		"Score d'une équipe favorite : match en cours ou prochain match, compteurs, cartons."
	],
	[
		"rugby-live-multiplex-card",
		Ke,
		"Rugby Live – Multiplex",
		"Tous les matchs du jour en direct, une ou plusieurs compétitions."
	],
	[
		"rugby-live-timeline-card",
		$e,
		"Rugby Live – Fil du match",
		"Frise des actions du match, la plus récente en haut."
	],
	[
		"rugby-live-fixtures-card",
		We,
		"Rugby Live – Calendrier",
		"Prochains matchs et derniers résultats d'une compétition ou d'une équipe."
	]
];
for (let [e, t, n, r] of et) customElements.get(e) || customElements.define(e, t), window.customCards = window.customCards || [], window.customCards.some((t) => t.type === e) || window.customCards.push({
	type: e,
	name: n,
	description: r,
	documentationURL: "https://github.com/Kenny3231/rugby_live-ha"
});
//#endregion
