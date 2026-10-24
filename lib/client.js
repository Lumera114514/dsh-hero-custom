window.__ModuleLoader__.load({
	id: "dsh-hero-custom",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");
		var useState = React.useState;
		var useSyncExternalStore = React.useSyncExternalStore;

		// ============================================================
		// helpers
		// ============================================================
		function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
		function hexToRgba(hex, alpha) {
			var h = String(hex || "#000000").replace("#", "");
			if (h.length === 3) h = h.split("").map((c) => c + c).join("");
			if (h.length !== 6) h = "000000";
			var n = parseInt(h, 16);
			var a = Math.max(0, Math.min(1, alpha == null ? 1 : alpha));
			return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + a + ")";
		}
		function deepMerge(base, extra) {
			var out = {};
			for (var k in base) out[k] = base[k];
			if (!extra || typeof extra !== "object") return out;
			for (var k2 in extra) {
				var v = extra[k2];
				if (v != null && typeof v === "object" && !Array.isArray(v) && typeof base[k2] === "object" && base[k2] != null) {
					out[k2] = deepMerge(base[k2], v);
				} else if (v !== undefined) {
					out[k2] = v;
				}
			}
			return out;
		}

		// ============================================================
		// defaults + store
		// ============================================================
		var DEFAULTS = {
			master: true,
			hero: {
				enabled: true,
				headline: "探索未至之境",
				preview: "预览版",
				size: 0,            // px; 0 = 默认
				color: "",          // "" = 默认
				font: "",           // "" = 默认
				posX: 0, posY: 0,   // px 偏移
				glow: { enabled: false, color: "#5b8cff", radius: 16, intensity: 1 },
				effect: "none",     // none | flow | pulse | rainbow
				fish: { size: 0, color: "", effect: "none" },  // 标题前鲸鱼图标
			},
		};

		var state = { settings: JSON.parse(JSON.stringify(DEFAULTS)), loaded: false };
		var listeners = new Set();
		function notify() { for (var fn of [...listeners]) { try { fn() } catch (e) {} } }
		function setState(patch) { state = Object.assign({}, state, patch); notify(); }
		function setDeep(path, value) {
			var parts = path.split(".");
			var cur = state.settings;
			for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
			cur[parts[parts.length - 1]] = value;
			state = Object.assign({}, state);
			notify();
		}
		function getSnapshot() { return state; }
		function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
		function useStore() { return useSyncExternalStore(subscribe, getSnapshot); }

		// ============================================================
		// persistence (host file)
		// ============================================================
		var saveTimer = 0;
		function persist() {
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(function () {
				saveTimer = 0;
				try {
					fetch("/dsh-hero-custom/settings", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(state.settings),
					}).catch(function () {});
				} catch (e) {}
			}, 400);
		}

		// ============================================================
		// css
		// ============================================================
		var CSS = `
			/* ===== settings page ===== */
			.uie-hc-settings { display: flex; flex-direction: column; gap: 10px; }
			.uie-hc-card { border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); background: var(--dsw-alias-bg-layer-2, #fff); border-radius: 12px; overflow: hidden; }
			.uie-hc-card-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; }
			.uie-hc-card-ico { font-size: 15px; }
			.uie-hc-card-title { font-weight: 600; font-size: 13px; line-height: 20px; flex: 1; }
			.uie-hc-card-desc { display: block; color: var(--dsw-alias-label-tertiary, #8b93a1); font-weight: 400; font-size: 12px; }
			.uie-hc-card-body { padding: 4px 12px 12px; }
			.uie-hc-card-body-inner { display: flex; flex-direction: column; gap: 8px; }
			.uie-hc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
			.uie-hc-row-head { flex: 1; min-width: 0; }
			.uie-hc-row-label { font-size: 13px; line-height: 18px; color: var(--dsw-alias-label-primary, #1f2328); }
			.uie-hc-row-desc { display: block; color: var(--dsw-alias-label-tertiary, #8b93a1); font-size: 12px; line-height: 16px; }
			.uie-hc-row-ctl { display: flex; align-items: center; gap: 6px; flex: none; }
			.uie-hc-input { background: var(--dsw-alias-bg-layer-1, #fff); border: 1px solid var(--dsw-alias-border-l3, #d9dde3); color: var(--dsw-alias-label-primary, #1f2328); border-radius: 8px; padding: 5px 9px; font-size: 13px; width: 150px; }
			.uie-hc-input[type="number"] { width: 72px; }
			.uie-hc-input[type="range"] { width: 130px; accent-color: var(--dsw-alias-brand-primary, #4f6ef7); }
			.uie-hc-val { color: var(--dsw-alias-label-tertiary, #8b93a1); font-size: 12px; min-width: 30px; text-align: right; font-variant-numeric: tabular-nums; }
			.uie-hc-colorwrap { display: inline-flex; align-items: center; gap: 6px; }
			.uie-hc-colorwrap input[type="color"] { width: 30px; height: 24px; border: 1px solid var(--dsw-alias-border-l3, #d9dde3); border-radius: 6px; padding: 0; background: transparent; cursor: pointer; }
			.uie-hc-switch { position: relative; display: inline-flex; width: 34px; height: 20px; flex: none; cursor: pointer; }
			.uie-hc-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
			.uie-hc-switch .track { position: absolute; inset: 0; background: var(--dsw-alias-interactive-bg-hover, #e5e7eb); border-radius: 999px; transition: background 0.15s; }
			.uie-hc-switch .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.15s; }
			.uie-hc-switch input:checked + .track { background: var(--dsw-alias-brand-primary, #4f6ef7); }
			.uie-hc-switch input:checked + .track + .knob { transform: translateX(14px); }
			.uie-hc-chip { border: 1px solid var(--dsw-alias-border-l3, #d9dde3); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-secondary, #6b7280); border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
			.uie-hc-chip.active { border-color: var(--dsw-alias-brand-primary, #4f6ef7); color: var(--dsw-alias-brand-primary, #4f6ef7); font-weight: 600; }
			.uie-hc-btn { border: 1px solid var(--dsw-alias-border-l3, #d9dde3); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #1f2328); border-radius: 8px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
			.uie-hc-btn.primary { background: var(--dsw-alias-brand-primary, #4f6ef7); border-color: transparent; color: #fff; }
			.uie-hc-group { border: 1px dashed var(--dsw-alias-border-l2, #e5e7eb); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; }

			/* ===== hero effects ===== */
			@keyframes uie-hc-flow-kf { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
			@keyframes uie-hc-pulse-kf { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
			@keyframes uie-hc-rainbow-kf { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
			.uie-hc-effect-flow {
				background: linear-gradient(90deg, var(--uie-hc-glow, #5b8cff), #ffffff, var(--uie-hc-glow, #5b8cff));
				background-size: 200% 100%;
				-webkit-background-clip: text;
				background-clip: text;
				color: transparent !important;
				animation: uie-hc-flow-kf 3s linear infinite;
			}
			.uie-hc-effect-pulse { animation: uie-hc-pulse-kf 2.4s ease-in-out infinite; }
			.uie-hc-effect-rainbow { animation: uie-hc-rainbow-kf 7s linear infinite; }

			/* ===== fish (whale) icon effects ===== */
			@keyframes uie-hc-fish-swim-kf { 0%, 100% { transform: translate(0) rotate(0deg); } 35% { transform: translate(-1px, -1px) rotate(-5deg); } 70% { transform: translate(1px) rotate(3deg); } }
			@keyframes uie-hc-fish-bounce-kf { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
			@keyframes uie-hc-fish-spin-kf { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
			@keyframes uie-hc-fish-wiggle-kf { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
			@keyframes uie-hc-fish-pulse-kf { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
			.uie-hc-fish-swim { animation: uie-hc-fish-swim-kf 2.6s ease-in-out infinite !important; }
			.uie-hc-fish-bounce { animation: uie-hc-fish-bounce-kf 1.6s ease-in-out infinite !important; }
			.uie-hc-fish-spin { animation: uie-hc-fish-spin-kf 4s linear infinite !important; }
			.uie-hc-fish-wiggle { animation: uie-hc-fish-wiggle-kf 1.2s ease-in-out infinite !important; }
			.uie-hc-fish-pulse { animation: uie-hc-fish-pulse-kf 2s ease-in-out infinite !important; }
		`;

		var styleTag = null;
		function ensureCss() {
			if (styleTag) return;
			styleTag = document.createElement("style");
			styleTag.setAttribute("data-plugin", "@local/dsh-hero-custom");
			styleTag.textContent = CSS;
			document.head.appendChild(styleTag);
		}
		function disposeCss() {
			if (styleTag && styleTag.parentNode) styleTag.parentNode.removeChild(styleTag);
			styleTag = null;
		}

		// ============================================================
		// pure logic (exported via __test for unit tests)
		// ============================================================
		function glowShadow(glow) {
			if (!glow || !glow.enabled) return "";
			var color = glow.color || "#5b8cff";
			var r = clamp(glow.radius == null ? 16 : glow.radius, 0, 60);
			var n = clamp(glow.intensity == null ? 1 : glow.intensity, 1, 4);
			var parts = [];
			for (var i = 1; i <= n; i++) {
				var rr = Math.max(1, Math.round((r * i) / n));
				parts.push("0 0 " + rr + "px " + hexToRgba(color, 0.9 / i));
			}
			return parts.join(", ");
		}
		function effectClass(effect) {
			if (effect === "flow") return "uie-hc-effect-flow";
			if (effect === "pulse") return "uie-hc-effect-pulse";
			if (effect === "rainbow") return "uie-hc-effect-rainbow";
			return "";
		}
		var EFFECT_CLASSES = ["uie-hc-effect-flow", "uie-hc-effect-pulse", "uie-hc-effect-rainbow"];

		function fishEffectClass(effect) {
			if (effect === "swim") return "uie-hc-fish-swim";
			if (effect === "bounce") return "uie-hc-fish-bounce";
			if (effect === "spin") return "uie-hc-fish-spin";
			if (effect === "wiggle") return "uie-hc-fish-wiggle";
			if (effect === "pulse") return "uie-hc-fish-pulse";
			return "";
		}
		var FISH_EFFECT_CLASSES = ["uie-hc-fish-swim", "uie-hc-fish-bounce", "uie-hc-fish-spin", "uie-hc-fish-wiggle", "uie-hc-fish-pulse"];
		var FISH_RATIO = 17.04 / 23.16; // FishLogo width:height ratio

		// Apply one hero element (headline / preview badge / fish icon).
		// el may be a real DOM element or a test fake exposing the same surface.
		function applyHeroSettings(el, kind, hero) {
			if (!el || !hero) return;
			// fish (whale) icon
			if (kind === "fish") {
				var f = hero.fish || {};
				// The app renders the hero whale as an <svg class="..._fish">; its
				// inline width/height win over the svg attributes, so a jsdom fake
				// without .style still gets the attributes.
				function setSizeAttr(el, name, value) {
					if (el.style) {
						el.style[name] = value;
					} else if (el.setAttribute) {
						el.setAttribute(name, String(value).replace("px", ""));
					}
				}
				if (f.size) {
					setSizeAttr(el, "width", f.size + "px");
					setSizeAttr(el, "height", (Math.round(f.size * FISH_RATIO * 100) / 100) + "px");
				} else {
					setSizeAttr(el, "width", "");
					setSizeAttr(el, "height", "");
				}
				if (el.style) el.style.color = f.color || "";
				// The app's own hero whale is a static mark that only wiggles on
				// hover (hitbox CSS + an SMIL <animate> child). A configured effect
				// wins; "none" leaves the app behaviour untouched.
				var fec = fishEffectClass(f.effect);
				var fcur = el.getAttribute ? el.getAttribute("data-uie-hc-fish-effect") || "" : "";
				if (fcur !== fec) {
					if (el.classList) {
						for (var fi = 0; fi < FISH_EFFECT_CLASSES.length; fi++) el.classList.remove(FISH_EFFECT_CLASSES[fi]);
						if (fec) el.classList.add(fec);
					}
					if (el.setAttribute) el.setAttribute("data-uie-hc-fish-effect", fec);
				}
				return;
			}			// text
			var text = kind === "headline" ? hero.headline : hero.preview;
			if (typeof text === "string" && text.length > 0) {
				if (el.textContent !== text) el.textContent = text;
				if (kind === "preview" && el.style) el.style.display = "";
			} else if (kind === "preview" && el.style) {
				el.style.display = "none";
			}
			if (kind !== "headline") return;
			// size / font
			if (el.style) {
				el.style.fontSize = hero.size ? hero.size + "px" : "";
				el.style.fontFamily = hero.font || "";
				// position
				el.style.transform = (hero.posX || hero.posY) ? "translate(" + hero.posX + "px, " + hero.posY + "px)" : "";
				// glow / color (flow effect owns both via gradient)
				var isFlow = hero.effect === "flow";
				if (isFlow) {
					el.style.setProperty("--uie-hc-glow", hero.glow && hero.glow.enabled ? hero.glow.color : "#5b8cff");
					el.style.textShadow = "";
					el.style.color = "";
				} else {
					el.style.color = hero.color || "";
					el.style.textShadow = glowShadow(hero.glow);
				}
			}
			// effect class
			var ec = effectClass(hero.effect);
			var cur = el.getAttribute ? el.getAttribute("data-uie-hc-effect") || "" : "";
			if (cur !== ec) {
				if (el.classList) {
					for (var i = 0; i < EFFECT_CLASSES.length; i++) el.classList.remove(EFFECT_CLASSES[i]);
					if (ec) el.classList.add(ec);
				}
				if (el.setAttribute) el.setAttribute("data-uie-hc-effect", ec);
			}
		}

		// ============================================================
		// apply to live DOM
		// ============================================================
		// Version-tolerant hero hooks. DSH renames its CSS-module class prefixes
		// between builds (pXSMma_* -> zNic4G_*), so match on the stable role suffix
		// and keep the historical names working on older builds. The _effect suffix
		// is excluded so the plugin's own effect classes never self-match.
		var SEL_HEADLINE = ".pXSMma_headlineText, [class*=\"_headlineText\"]";
		var SEL_PREVIEW = ".pXSMma_previewBadge, [class*=\"_previewBadge\"]";
		var SEL_FISH = ".pXSMma_fish, [class*=\"_fish\"]:not([class*=\"_fishEffect\"]):not([class*=\"_fishHitbox\"])";
		var SEL_HERO_ROOT = "[class*=\"_headline\"]";
		var SEL_CONV_ROOT = ".uPhUma_root, [class*=\"_root\"][class*=\"_header\"]";

		function heroScanRoot() {
			try { return document.querySelector(SEL_HERO_ROOT) || document; } catch (e) { return document; }
		}
		// The hero renders inside the conversation root; bound the watcher there so
		// sidebar/composer/task churn no longer triggers a full-document rescan.
		function heroWatchTarget() {
			try { return document.querySelector(SEL_CONV_ROOT) || document.body || null; } catch (e) { return document.body || null; }
		}
		function heroQueryAll(sel, root) {
			var out = [];
			function push(el) { if (el && el.nodeType === 1) out.push(el); }
			try {
				if (root && root.nodeType === 1 && root.matches && root.matches(sel)) push(root);
				if (root && root.querySelectorAll) {
					var list = root.querySelectorAll(sel);
					for (var i = 0; i < list.length; i++) push(list[i]);
				} else if (document.querySelectorAll) {
					var list2 = document.querySelectorAll(sel);
					for (var j = 0; j < list2.length; j++) push(list2[j]);
				}
			} catch (e) {}
			return out;
		}
		var heroNode = null;
		function applyHero() {
			var s = state.settings;
			var on = s.master && s.hero.enabled;
			if (!on) return;
			var sig = JSON.stringify(s.hero);
			var root = heroScanRoot();
			var sawHeadline = false;
			var sawPreview = false;
			function revisit(el) {
				if (!el || !el.getAttribute) return;
				var kind = el.getAttribute("data-uie-hc");
				if (kind === "headline") sawHeadline = true;
				else if (kind === "preview") sawPreview = true;
				var mark = el.getAttribute("data-uie-hc-sig");
				// React may swap the whale node, or rewrite its inline width/height;
				// revisit it on every pass so the animation class survives.
				applyHeroSettings(el, kind, s.hero);
				if (mark !== sig) el.setAttribute("data-uie-hc-sig", sig);
			}
			function claim(el, kind) {
				if (!el || (el.getAttribute && el.getAttribute("data-uie-hc"))) {
					if (el) revisit(el);
					return;
				}
				// content and styles first, then the marker
				rememberOriginal(el);
				applyHeroSettings(el, kind, s.hero);				if (el.setAttribute) {
					el.setAttribute("data-uie-hc", kind);
					el.setAttribute("data-uie-hc-sig", sig);
				}
				if (kind === "headline") sawHeadline = true;
				else if (kind === "preview") sawPreview = true;
			}
			heroQueryAll(SEL_HEADLINE, root).forEach(function (el) { claim(el, "headline"); });
			heroQueryAll(SEL_PREVIEW, root).forEach(function (el) { claim(el, "preview"); });
			heroQueryAll(SEL_FISH, root).forEach(function (el) { claim(el, "fish"); });
			heroQueryAll("[data-uie-hc]", root).forEach(revisit);
			// Cheap bounded fallback: only when a surface is still unclaimed, at most
			// every 4s, and only inside the hero block (never the whole document).
			if ((!sawHeadline || !sawPreview) && root !== document) {
				var cands = heroQueryAll("span, div, h1, h2, h3, p", root);
				for (var ci = 0; ci < cands.length; ci++) {
					var cand = cands[ci];
					if (cand.children && cand.children.length > 0) continue;
					if (cand.getAttribute && cand.getAttribute("data-uie-hc")) continue;
					var txt = (cand.textContent || "").replace(/\s+/g, " ").trim();
					if (!txt) continue;
					if (!sawHeadline && (txt === "探索未至之境" || (txt.indexOf("探索未至之境") >= 0 && txt.length < 24))) {
						claim(cand, "headline");
						sawHeadline = true;
					} else if (!sawPreview && txt === "预览版") {
						claim(cand, "preview");
						sawPreview = true;
					}
					if (sawHeadline && sawPreview) break;
				}
			}
			lastHeroSig = sig;
			heroNode = root === document ? null : root;
			heroRefs = new Set();
			if (root && root !== document && root.querySelectorAll) {
				try {
					var marked = root.querySelectorAll("[data-uie-hc]");
					for (var hi = 0; hi < marked.length; hi++) heroRefs.add(marked[hi]);
				} catch (e) {}
			}
		}
		var lastHeroSig = null;

		// Applied hero elements, so a remount (new session / new workspace) can be
		// detected even when the replacement node lands outside the old watch target.
		var heroRefs = new Set();
		// The app's own text before the plugin rewrote it, restored on disable/cleanup.
		function rememberOriginal(el) {
			if (!el || !el.getAttribute || el.getAttribute("data-uie-hc-orig") !== null) return;
			try { el.setAttribute("data-uie-hc-orig", JSON.stringify([el.textContent == null ? "" : el.textContent])); } catch (e) {}
		}
		function undoElement(el) {
			if (!el) return;
			try {
				var raw = el.getAttribute && el.getAttribute("data-uie-hc-orig");
				if (raw) {
					var orig = JSON.parse(raw);
					if (typeof orig[0] === "string" && el.textContent !== orig[0]) el.textContent = orig[0];
				}
				if (el.style) {
					el.style.width = "";
					el.style.height = "";
					el.style.color = "";
					el.style.fontSize = "";
					el.style.fontFamily = "";
					el.style.transform = "";
					el.style.textShadow = "";
					el.style.display = "";
					if (el.style.removeProperty) el.style.removeProperty("--uie-hc-glow");
				}
				if (el.classList) {
					for (var i = 0; i < EFFECT_CLASSES.length; i++) el.classList.remove(EFFECT_CLASSES[i]);
					for (var j = 0; j < FISH_EFFECT_CLASSES.length; j++) el.classList.remove(FISH_EFFECT_CLASSES[j]);
				}
				if (el.removeAttribute) {
					el.removeAttribute("data-uie-hc");
					el.removeAttribute("data-uie-hc-effect");
					el.removeAttribute("data-uie-hc-fish-effect");
					el.removeAttribute("data-uie-hc-sig");
					el.removeAttribute("data-uie-hc-orig");
				}
			} catch (e) {}
		}
		function undoAll() {
			try { heroRefs.forEach(function (el) { undoElement(el); }); } catch (e) {}
			try { document.querySelectorAll("[data-uie-hc]").forEach(undoElement); } catch (e) {}
			heroRefs = new Set();
			lastHeroSig = null;
		}
		function applyAll() {
			try { applyHero(); } catch (e) { console.error("[dsh-hero-custom] apply failed", e); }
		}

		// ============================================================
		// React: settings page
		// ============================================================
		function Switch(props) {
			return React.createElement("label", { className: "uie-hc-switch", title: props.title || "" },
				React.createElement("input", { type: "checkbox", checked: props.checked, onChange: function (e) { props.onChange(e.target.checked); } }),
				React.createElement("span", { className: "track" }),
				React.createElement("span", { className: "knob" })
			);
		}
		function Row(props) {
			return React.createElement("div", { className: "uie-hc-row" },
				React.createElement("div", { className: "uie-hc-row-head" },
					React.createElement("span", { className: "uie-hc-row-label" }, props.label),
					props.desc ? React.createElement("span", { className: "uie-hc-row-desc" }, props.desc) : null
				),
				React.createElement("div", { className: "uie-hc-row-ctl" }, props.children)
			);
		}
		function Slider(props) {
			return React.createElement(Row, { label: props.label, desc: props.desc },
				React.createElement("input", { type: "range", min: String(props.min), max: String(props.max), step: String(props.step || 1), value: String(props.value), onChange: function (e) { props.onChange(Number(e.target.value)); } }),
				React.createElement("span", { className: "uie-hc-val" }, String(props.value) + (props.unit || ""))
			);
		}
		function ToggleRow(props) {
			return React.createElement("div", { className: "uie-hc-row", style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
				React.createElement("span", null,
					React.createElement("span", { className: "uie-hc-row-label" }, props.label),
					props.desc ? React.createElement("div", { className: "uie-hc-row-desc" }, props.desc) : null
				),
				React.createElement(Switch, { checked: props.checked, onChange: props.onChange })
			);
		}
		function ColorField(props) {
			return React.createElement(Row, { label: props.label },
				React.createElement("span", { className: "uie-hc-colorwrap" },
					React.createElement("input", { type: "color", value: props.value, onChange: function (e) { props.onChange(e.target.value); } }),
					React.createElement("span", { className: "uie-hc-val" }, props.value)
				)
			);
		}
		function TextField(props) {
			return React.createElement(Row, { label: props.label, desc: props.desc },
				React.createElement("input", { className: "uie-hc-input", type: "text", value: props.value || "", placeholder: props.placeholder || "", onChange: function (e) { props.onChange(e.target.value); } })
			);
		}
		function NumField(props) {
			return React.createElement(Row, { label: props.label, desc: props.desc },
				React.createElement("input", { className: "uie-hc-input", type: "number", min: String(props.min), max: String(props.max), value: props.value === "" ? "" : String(props.value), placeholder: props.placeholder || "", onChange: function (e) { props.onChange(e.target.value === "" ? "" : clamp(Number(e.target.value), props.min, props.max)); } }),
				props.unit ? React.createElement("span", { className: "uie-hc-val" }, props.unit) : null
			);
		}
		function Card(props) {
			var open = useState(props.open !== false)[0];
			var setOpen = useState(null)[1];
			return React.createElement("div", { className: "uie-hc-card" },
				React.createElement("div", { className: "uie-hc-card-head", onClick: function () { setOpen(!open); } },
					React.createElement("span", { className: "uie-hc-card-ico" }, props.icon),
					React.createElement("span", { className: "uie-hc-card-title" }, props.title,
						props.desc ? React.createElement("span", { className: "uie-hc-card-desc" }, props.desc) : null
					),
					React.createElement("span", { onClick: function (e) { e.stopPropagation(); } },
						React.createElement(Switch, { checked: props.enabled, onChange: props.onToggle })
					)
				),
				props.enabled ? React.createElement("div", { className: "uie-hc-card-body" },
					React.createElement("div", { className: "uie-hc-card-body-inner" }, props.children)
				) : null
			);
		}

		var FONT_PRESETS = [
			["默认", ""],
			["楷体", "KaiTi, STKaiti, serif"],
			["宋体", "SimSun, serif"],
			["黑体", "SimHei, sans-serif"],
			["圆体", "Yuanti SC, YouYuan, sans-serif"],
			["等线", "DengXian, sans-serif"],
			["无衬线", "PingFang SC, Microsoft YaHei, sans-serif"],
		];
		var EFFECTS = [["none", "无"], ["flow", "流光"], ["pulse", "呼吸"], ["rainbow", "彩虹"]];
		var FISH_EFFECTS = [["none", "无"], ["swim", "游动"], ["bounce", "弹跳"], ["spin", "旋转"], ["wiggle", "摇摆"], ["pulse", "脉冲"]];

		function SettingsPage(props) {
			var s = useStore();
			var h = s.settings.hero;
			var set = function (path) { return function (value) { setDeep(path, value); }; };
			var resetHero = function () {
				state.settings.hero = JSON.parse(JSON.stringify(DEFAULTS.hero));
				state = Object.assign({}, state);
				notify();
			};
			var fontPreset = FONT_PRESETS.some(function (f) { return f[1] !== "" && h.font === f[1]; }) ? h.font : "";

			return React.createElement("div", { className: "uie-hc-settings" },
				React.createElement(Card, {
					icon: "✨",
					title: "主界面标题",
					desc: "「探索未至之境预览版」",
					enabled: s.settings.master && h.enabled,
					onToggle: set("hero.enabled"),
				},
					React.createElement(TextField, { label: "主标题文字", value: h.headline, onChange: set("hero.headline") }),
					React.createElement(TextField, { label: "徽标文字", desc: "留空则隐藏「预览版」徽标", value: h.preview, onChange: set("hero.preview") }),
					React.createElement(NumField, { label: "字号", desc: "0 为默认 (26px)", value: h.size, min: 0, max: 96, unit: "px", onChange: set("hero.size") }),
					React.createElement(ColorField, { label: "颜色", value: h.color || "#e2e8f0", onChange: set("hero.color") }),
					React.createElement(Row, { label: "字体" },
						React.createElement("input", { className: "uie-hc-input", type: "text", value: h.font || "", placeholder: "如 KaiTi, serif", onChange: set("hero.font") })
					),
					React.createElement("div", { className: "uie-hc-row-ctl", style: { justifyContent: "flex-start", flexWrap: "wrap", flex: "none" } },
						FONT_PRESETS.map(function (f) {
							return React.createElement("button", { key: f[0], className: "uie-hc-chip" + (fontPreset === f[1] && f[1] !== "" ? " active" : ""), onClick: function () { setDeep("hero.font", f[1]); }, style: { fontFamily: f[1] || undefined } }, f[0]);
						})
					),
					React.createElement("div", { className: "uie-hc-group" },
						React.createElement(ToggleRow, { label: "文字光效", desc: "霓虹辉光（流光特效下自动使用辉光颜色）", checked: h.glow.enabled, onChange: set("hero.glow.enabled") }),
						h.glow.enabled ? React.createElement(ColorField, { label: "辉光颜色", value: h.glow.color || "#5b8cff", onChange: set("hero.glow.color") }) : null,
						h.glow.enabled ? React.createElement(Slider, { label: "辉光半径", value: h.glow.radius, min: 0, max: 60, unit: "px", onChange: set("hero.glow.radius") }) : null,
						h.glow.enabled ? React.createElement(Slider, { label: "辉光强度", value: h.glow.intensity, min: 1, max: 4, onChange: set("hero.glow.intensity") }) : null
					),
					React.createElement(Row, { label: "位置偏移", desc: "相对默认位置（负值为左/上）" },
						React.createElement("div", { className: "uie-hc-row-ctl" },
							React.createElement("span", { className: "uie-hc-val" }, "X"),
							React.createElement("input", { className: "uie-hc-input", type: "number", min: "-300", max: "300", value: String(h.posX), onChange: function (e) { setDeep("hero.posX", clamp(Number(e.target.value), -300, 300)); } }),
							React.createElement("span", { className: "uie-hc-val" }, "Y"),
							React.createElement("input", { className: "uie-hc-input", type: "number", min: "-300", max: "300", value: String(h.posY), onChange: function (e) { setDeep("hero.posY", clamp(Number(e.target.value), -300, 300)); } })
						)
					),
					React.createElement(Row, { label: "特效" },
						React.createElement("div", { className: "uie-hc-row-ctl", style: { justifyContent: "flex-start", flexWrap: "wrap" } },
							EFFECTS.map(function (ef) {
								return React.createElement("button", { key: ef[0], className: "uie-hc-chip" + (h.effect === ef[0] ? " active" : ""), onClick: function () { setDeep("hero.effect", ef[0]); } }, ef[1]);
							})
						)
					),
					React.createElement("div", { className: "uie-hc-group" },
						React.createElement(Row, { label: "鲸鱼图标", desc: "标题前的图标" },
							React.createElement("div", { className: "uie-hc-row-ctl", style: { justifyContent: "flex-start", flexWrap: "wrap" } },
								FISH_EFFECTS.map(function (fe) {
									return React.createElement("button", { key: fe[0], className: "uie-hc-chip" + ((h.fish && h.fish.effect) === fe[0] ? " active" : ""), onClick: function () { setDeep("hero.fish.effect", fe[0]); } }, fe[1]);
								})
							)
						),
						React.createElement(NumField, { label: "图标大小", desc: "0 为默认 (24px)", value: h.fish && h.fish.size, min: 0, max: 96, unit: "px", onChange: set("hero.fish.size") }),
						React.createElement(ColorField, { label: "图标颜色", value: (h.fish && h.fish.color) || "#e2e8f0", onChange: set("hero.fish.color") })
					),
					React.createElement("div", { className: "uie-hc-row" },
						React.createElement("button", { className: "uie-hc-btn primary", onClick: resetHero }, "恢复默认"),
						React.createElement("span", { className: "uie-hc-row-desc" }, "改动即时预览，自动保存")
					)
				)
			);
		}

		// ============================================================
		// apply
		// ============================================================
		function apply(ctx) {
			ensureCss();

			// store subscription -> apply + persist
			ctx.effect(function () {
				return subscribe(function () { applyAll(); persist(); });
			}, "dsh-hero-custom: store");

			// Watcher: the hero text and whale are React-owned, so a re-render can
			// replace them at any time (new session, workspace switch, theme change).
			// Watch the document but only work when a mutation touches a hero node,
			// and re-scan as soon as an applied node is detached.
			ctx.effect(function () {
				var moTimer = 0;
				var HERO_NODE = SEL_HEADLINE + ", " + SEL_PREVIEW + ", " + SEL_FISH;
				function isHeroNode(node) {
					if (!node || node.nodeType !== 1) return false;
					try {
						if (node.matches && node.matches(HERO_NODE)) return true;
						if (node.querySelector && node.querySelector(HERO_NODE)) return true;
					} catch (e) {}
					return false;
				}
				function anyDetached() {
					if (heroRefs.size === 0) return false;
					var detached = false;
					try { heroRefs.forEach(function (el) { if (el && el.isConnected === false) detached = true; }); } catch (e) {}
					return detached;
				}
				function onMutated(records) {
					var relevant = anyDetached();
					for (var i = 0; !relevant && i < records.length; i++) {
						var rec = records[i];
						if (rec.type === "characterData") {
							var pe = rec.target && rec.target.parentNode;
							if (pe && heroRefs.has(pe)) relevant = true;
							continue;
						}
						if (heroRefs.has(rec.target)) { relevant = true; break; }
						var added = rec.addedNodes || [];
						for (var a = 0; a < added.length; a++) {
							if (isHeroNode(added[a]) || (added[a].nodeType === 3 && added[a].parentNode && heroRefs.has(added[a].parentNode))) { relevant = true; break; }
						}
						if (relevant) break;
						var removed = rec.removedNodes || [];
						for (var r = 0; r < removed.length; r++) {
							var node = removed[r];
							if (heroRefs.has(node)) { relevant = true; break; }
							if (node && node.nodeType === 1 && node.querySelectorAll) {
								try {
									var marked = node.querySelectorAll("[data-uie-hc]");
									for (var m = 0; m < marked.length; m++) if (heroRefs.has(marked[m])) { relevant = true; break; }
								} catch (e) {}
							}
							if (relevant) break;
						}
					}
					if (!relevant) return;
					if (moTimer) return;
					moTimer = setTimeout(function () {
						moTimer = 0;
						applyAll();
					}, 120);
				}
				var mo = new MutationObserver(onMutated);
				try { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
				var iv = setInterval(function () {
					if (anyDetached()) applyAll();
				}, 2000);
				return function () {
					mo.disconnect();
					clearInterval(iv);
					if (moTimer) clearTimeout(moTimer);
				};
			}, "dsh-hero-custom: watcher");

			// Slow safety net: a cheap no-op while the markup is unchanged.
			ctx.effect(function () {
				applyAll();
				var iv = setInterval(applyAll, 2000);
				return function () { clearInterval(iv); };
			}, "dsh-hero-custom: tick");
			// load persisted settings
			try {
				fetch("/dsh-hero-custom/settings").then(function (r) { return r.json() }).then(function (saved) {
					if (saved && typeof saved === "object") {
						state.settings = deepMerge(DEFAULTS, saved);
						state = Object.assign({}, state, { loaded: true });
						notify();
					}
				}).catch(function () {});
			} catch (e) {}

			// settings section
			ctx.slots.inject("settings.section", function () {
				return ctx.slots.register({
					name: "settings.section",
					id: "hero-custom",
					order: 55,
					label: "主界面标题",
				}, function (props) {
					return React.createElement(SettingsPage, props);
				});
			});

			return function cleanup() {
				disposeCss();
				undoAll();
			};
		}

		module.exports = {
			inject: ["slots"],
			apply,
			__test: {
				DEFAULTS, deepMerge, glowShadow, effectClass, fishEffectClass, applyHeroSettings, hexToRgba, clamp,
				applyAll: function () { applyAll(); },
				undoAll: function () { undoAll(); },
				setSettings: function (saved) {
					state.settings = deepMerge(DEFAULTS, saved || {});
					state = Object.assign({}, state, { loaded: true });
					notify();
				},
				getState: function () { return state; },
			},
		};
		return module.exports;
	}
});
