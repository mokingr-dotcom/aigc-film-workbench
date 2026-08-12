(function initPosterCompositor(root) {
  "use strict";

  const FONT_FAMILIES = {
    "cn-sans": "PingFang SC, Microsoft YaHei, sans-serif",
    "cn-hei": "Heiti SC, STHeiti, PingFang SC, Microsoft YaHei, sans-serif",
    "cn-serif": "Songti SC, STSong, serif",
    "cn-display-serif": "Hiragino Mincho ProN, Songti SC, STSong, serif",
    "cn-kai": "Kaiti SC, STKaiti, serif",
    "cn-fangsong": "FangSong, STFangsong, Kaiti SC, STKaiti, serif",
    "cn-rounded": "Yuanti SC, Hiragino Maru Gothic ProN, PingFang SC, sans-serif",
    "cn-brush": "\"AIGC Ma Shan Zheng\", Kaiti SC, STKaiti, serif",
    "cn-display": "\"AIGC ZCOOL QingKe\", Heiti SC, PingFang SC, sans-serif",
    "cn-playful": "\"AIGC ZCOOL KuaiLe\", Yuanti SC, PingFang SC, sans-serif",
    "en-serif": "Georgia, Times New Roman, serif",
    "en-sans": "Arial, Helvetica, sans-serif",
    "en-condensed": "Arial Narrow, Arial, sans-serif"
  };
  const ALIGNMENTS = ["left", "center", "right"];
  const FONT_STYLE_KEYS = ["serif", "condensed", "bold", "song", "calligraphy", "handwritten", "geometric", "horror", "playful"];
  const TEXT_LAYER_ID = /^text-(?:tagline|cast|date|credits|custom)-\d{1,3}$/;
  const TEXT_ROLE_PRESETS = {
    tagline: { label: "宣传语", text: "在这里填写电影宣传语", y: 0.68, widthRatio: 0.46, fontSizeRatio: 0.025, fontFamily: "cn-sans", fontWeight: 500, fontStyleKey: "bold", letterSpacing: 30 },
    cast: { label: "演员姓名", text: "主演  姓名一  姓名二", y: 0.9, widthRatio: 0.48, fontSizeRatio: 0.016, fontFamily: "cn-sans", fontWeight: 600, fontStyleKey: "bold", letterSpacing: 80 },
    date: { label: "上映日期", text: "敬请期待", y: 0.94, widthRatio: 0.26, fontSizeRatio: 0.018, fontFamily: "cn-sans", fontWeight: 700, fontStyleKey: "bold", letterSpacing: 90 },
    credits: { label: "演职员表", text: "导演 / 编剧 / 摄影 / 出品", y: 0.965, widthRatio: 0.62, fontSizeRatio: 0.011, fontFamily: "cn-sans", fontWeight: 500, fontStyleKey: "condensed", letterSpacing: 35 },
    custom: { label: "自定义文字", text: "双击或在右侧输入文字", y: 0.58, widthRatio: 0.4, fontSizeRatio: 0.03, fontFamily: "cn-sans", fontWeight: 600, fontStyleKey: "bold", letterSpacing: 20 }
  };
  const LAYER_DEFAULTS = {
    "title-cn": { kind: "text", role: "title-cn", label: "中文片名", text: "片名", color: "#f7f3e8", visible: true, locked: false, x: 0.5, y: 0.78, widthRatio: 0.56, fontSizeRatio: 0.075, letterSpacing: 0, lineHeight: 1.05, align: "center", rotation: 0, opacity: 1, fontFamily: "cn-serif", fontWeight: 700, fontStyleKey: "song" },
    "title-en": { kind: "text", role: "title-en", label: "英文副标", text: "FILM TITLE", color: "#f7f3e8", visible: true, locked: false, x: 0.5, y: 0.84, widthRatio: 0.38, fontSizeRatio: 0.022, letterSpacing: 160, lineHeight: 1, align: "center", rotation: 0, opacity: 0.9, fontFamily: "en-sans", fontWeight: 600, fontStyleKey: "bold" },
    "title-image": { visible: true, locked: false, x: 0.5, y: 0.8, widthRatio: 0.58, rotation: 0, opacity: 1 }
  };
  const DEFAULT_POSTER_COMPOSITOR_STATE = {
    sourceAsset: null,
    titleAsset: null,
    outputRatio: "",
    selectedLayer: "title-cn",
    guidesVisible: true,
    snapEnabled: true,
    exportFormat: "png",
    layers: LAYER_DEFAULTS
  };

  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;

  function textDefaultsForRole(role = "custom") {
    const preset = TEXT_ROLE_PRESETS[role] || TEXT_ROLE_PRESETS.custom;
    return {
      kind: "text", role: TEXT_ROLE_PRESETS[role] ? role : "custom", label: preset.label, text: preset.text, color: "#f7f3e8",
      visible: true, locked: false, x: 0.5, y: preset.y, widthRatio: preset.widthRatio,
      fontSizeRatio: preset.fontSizeRatio, letterSpacing: preset.letterSpacing, lineHeight: 1.05,
      align: "center", rotation: 0, opacity: 1, fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight, fontStyleKey: preset.fontStyleKey
    };
  }

  function createPosterTextLayer(role = "custom", index = 1) {
    const safeRole = TEXT_ROLE_PRESETS[role] ? role : "custom";
    const safeIndex = Math.min(999, Math.max(1, Math.round(Number(index) || 1)));
    return { id: `text-${safeRole}-${safeIndex}`, layer: textDefaultsForRole(safeRole) };
  }

  function calculateCenterCrop(width, height, ratio = "") {
    const sourceWidth = Math.max(0, Math.round(Number(width) || 0));
    const sourceHeight = Math.max(0, Math.round(Number(height) || 0));
    const [ratioWidth, ratioHeight] = String(ratio).split(":").map(Number);
    if (!(sourceWidth > 0 && sourceHeight > 0 && ratioWidth > 0 && ratioHeight > 0)) {
      return { width: sourceWidth, height: sourceHeight, offsetX: 0, offsetY: 0 };
    }
    const targetRatio = ratioWidth / ratioHeight;
    const cropWidth = sourceWidth / sourceHeight > targetRatio ? Math.round(sourceHeight * targetRatio) : sourceWidth;
    const cropHeight = sourceWidth / sourceHeight > targetRatio ? sourceHeight : Math.round(sourceWidth / targetRatio);
    return {
      width: cropWidth,
      height: cropHeight,
      offsetX: Math.round((cropWidth - sourceWidth) / 2),
      offsetY: Math.round((cropHeight - sourceHeight) / 2)
    };
  }

  function migratePosterLayerFontStyles(saved = {}, fallbackFontStyle = "serif") {
    const fallback = FONT_STYLE_KEYS.includes(fallbackFontStyle) ? fallbackFontStyle : "serif";
    const layers = { ...(saved.layers || {}) };
    ["title-cn", "title-en"].forEach((id) => {
      const layer = { ...(layers[id] || {}) };
      if (!FONT_STYLE_KEYS.includes(layer.fontStyleKey)) layer.fontStyleKey = fallback;
      layers[id] = layer;
    });
    return { ...saved, layers };
  }

  function normalizeAsset(asset, kind) {
    if (!asset || typeof asset !== "object" || typeof asset.id !== "string" || !asset.id) return null;
    return {
      id: asset.id.slice(0, 160), kind,
      name: String(asset.name || "image").slice(0, 180),
      type: String(asset.type || ""), size: Math.max(0, Number(asset.size) || 0),
      width: Math.max(0, Number(asset.width) || 0), height: Math.max(0, Number(asset.height) || 0),
      transparent: kind === "title" ? Boolean(asset.transparent) : null,
      updatedAt: String(asset.updatedAt || "")
    };
  }

  function normalizePosterLayer(layer = {}, defaults = LAYER_DEFAULTS["title-cn"]) {
    const normalized = {
      visible: layer.visible !== false,
      locked: layer.locked === true,
      x: clamp(layer.x, 0, 1, defaults.x),
      y: clamp(layer.y, 0, 1, defaults.y),
      widthRatio: clamp(layer.widthRatio, 0.02, 1.5, defaults.widthRatio),
      rotation: clamp(layer.rotation, -180, 180, defaults.rotation),
      opacity: clamp(layer.opacity, 0, 1, defaults.opacity)
    };
    if (defaults.fontSizeRatio !== undefined) {
      normalized.kind = "text";
      normalized.role = String(layer.role || defaults.role || "custom").slice(0, 32);
      normalized.label = String(layer.label || defaults.label || "文字图层").trim().slice(0, 40) || "文字图层";
      normalized.text = String(layer.text ?? defaults.text ?? "").slice(0, 2000);
      normalized.color = /^#[0-9a-f]{6}$/i.test(String(layer.color || "")) ? String(layer.color).toLowerCase() : (defaults.color || "#f7f3e8");
      normalized.fontSizeRatio = clamp(layer.fontSizeRatio, 0.005, 0.25, defaults.fontSizeRatio);
      normalized.letterSpacing = clamp(layer.letterSpacing, -200, 1000, defaults.letterSpacing);
      normalized.lineHeight = clamp(layer.lineHeight, 0.7, 3, defaults.lineHeight);
      normalized.align = ALIGNMENTS.includes(layer.align) ? layer.align : defaults.align;
      normalized.fontFamily = FONT_FAMILIES[layer.fontFamily] ? layer.fontFamily : defaults.fontFamily;
      normalized.fontWeight = clamp(layer.fontWeight, 100, 900, defaults.fontWeight);
      normalized.fontStyleKey = FONT_STYLE_KEYS.includes(layer.fontStyleKey) ? layer.fontStyleKey : defaults.fontStyleKey;
    }
    return normalized;
  }

  function normalizePosterCompositorState(saved = {}) {
    const layers = {};
    Object.keys(LAYER_DEFAULTS).forEach((id) => { layers[id] = normalizePosterLayer(saved.layers?.[id], LAYER_DEFAULTS[id]); });
    Object.entries(saved.layers || {}).filter(([id]) => TEXT_LAYER_ID.test(id)).slice(0, 24).forEach(([id, layer]) => {
      const role = TEXT_ROLE_PRESETS[layer?.role] ? layer.role : (id.match(TEXT_LAYER_ID)?.[0].split("-")[1] || "custom");
      layers[id] = normalizePosterLayer(layer, textDefaultsForRole(role));
    });
    return {
      sourceAsset: normalizeAsset(saved.sourceAsset, "source"),
      titleAsset: normalizeAsset(saved.titleAsset, "title"),
      outputRatio: /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(String(saved.outputRatio || "")) ? String(saved.outputRatio) : "",
      selectedLayer: layers[saved.selectedLayer] ? saved.selectedLayer : "title-cn",
      guidesVisible: saved.guidesVisible !== false,
      snapEnabled: saved.snapEnabled !== false,
      exportFormat: saved.exportFormat === "jpg" ? "jpg" : "png",
      layers
    };
  }

  function safePosterExportName(parts = [], extension = "png") {
    const safeParts = parts.map((part) => String(part || "").trim().replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "")).filter(Boolean);
    return `POSTER_${safeParts.join("_")}.${extension === "jpg" ? "jpg" : "png"}`;
  }

  function createPosterCompositor(options = {}) {
    const fabric = root.fabric;
    if (!fabric || !options.canvasElement) throw new Error("海报画布组件尚未加载");
    let state = normalizePosterCompositorState(options.state);
    let canvas = null;
    let sourceObject = null;
    let titleImageObject = null;
    let originalSize = { width: 0, height: 0 };
    let sourceSize = { width: 0, height: 0 };
    let sourceUrl = "";
    let titleUrl = "";
    let history = [];
    let historyIndex = -1;
    let restoring = false;
    let directDragCleanup = () => {};
    let bundledFontsReady = null;
    const listeners = { change: new Set(), textchange: new Set(), selectionchange: new Set(), editrequest: new Set() };
    const textValues = { chinese: options.chinese || "片名", english: options.english || "FILM TITLE" };

    function emit(name, detail) { listeners[name]?.forEach((listener) => listener(detail)); }
    function on(name, listener) { listeners[name]?.add(listener); return () => listeners[name]?.delete(listener); }
    function objectFor(id) { return canvas?.getObjects().find((object) => object.posterLayerId === id) || null; }
    function layerForObject(object) { return object?.posterLayerId ? state.layers[object.posterLayerId] : null; }

    function defaultsFor(id) {
      if (LAYER_DEFAULTS[id]) return LAYER_DEFAULTS[id];
      return textDefaultsForRole(state.layers[id]?.role);
    }

    function ensureBundledFonts() {
      if (!root.document?.fonts) return Promise.resolve();
      if (!bundledFontsReady) {
        bundledFontsReady = Promise.all([
          root.document.fonts.load('64px "AIGC Ma Shan Zheng"', "电影海报"),
          root.document.fonts.load('64px "AIGC ZCOOL KuaiLe"', "电影海报"),
          root.document.fonts.load('64px "AIGC ZCOOL QingKe"', "电影海报")
        ]).catch(() => []);
      }
      return bundledFontsReady;
    }

    function isTextLayer(id) { return Boolean(state.layers[id]?.kind === "text"); }

    function refreshLayerInteractivity() {
      if (!canvas) return;
      canvas.getObjects().forEach((object) => {
        const id = object.posterLayerId;
        if (!id || id === "source") return;
        object.set({ selectable: true, evented: true, hasControls: true });
        object.setCoords();
      });
      const activeLayer = state.layers[state.selectedLayer];
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.cursor = activeLayer?.locked ? "not-allowed" : "grab";
    }

    function serializeObject(id, object) {
      if (!object || !sourceSize.width) return state.layers[id];
      const width = Math.max(1, object.getScaledWidth());
      const patch = {
        ...state.layers[id], x: object.getCenterPoint().x / sourceSize.width, y: object.getCenterPoint().y / sourceSize.height,
        widthRatio: width / sourceSize.width, rotation: object.angle || 0, opacity: object.opacity ?? 1,
        visible: object.visible !== false, locked: state.layers[id].locked
      };
      if (isTextLayer(id)) {
        patch.text = object.text;
        patch.color = /^#[0-9a-f]{6}$/i.test(String(object.fill)) ? String(object.fill).toLowerCase() : state.layers[id].color;
        patch.fontSizeRatio = object.fontSize / sourceSize.width;
        patch.letterSpacing = object.charSpacing || 0;
        patch.lineHeight = object.lineHeight || 1;
        patch.align = object.textAlign || "center";
        patch.fontFamily = state.layers[id].fontFamily;
        patch.fontWeight = Number(object.fontWeight) || state.layers[id].fontWeight;
      }
      return normalizePosterLayer(patch, defaultsFor(id));
    }

    function serialize() {
      const layers = {};
      Object.keys(state.layers).forEach((id) => { layers[id] = serializeObject(id, objectFor(id)); });
      return normalizePosterCompositorState({ ...state, layers });
    }

    function pushHistory() {
      if (restoring || !canvas) return;
      state = serialize();
      history = history.slice(0, historyIndex + 1);
      history.push(JSON.parse(JSON.stringify({ layers: state.layers, outputRatio: state.outputRatio, selectedLayer: state.selectedLayer })));
      if (history.length > 30) history.shift();
      historyIndex = history.length - 1;
      emit("change", serialize());
    }

    function applyLayer(id, layer, object = objectFor(id)) {
      if (!object || !sourceSize.width) return;
      object.set({
        left: layer.x * sourceSize.width, top: layer.y * sourceSize.height, originX: "center", originY: "center",
        angle: layer.rotation, opacity: layer.opacity, visible: layer.visible,
        selectable: true, evented: true, hasControls: true,
        lockMovementX: layer.locked, lockMovementY: layer.locked,
        lockScalingX: layer.locked, lockScalingY: layer.locked, lockRotation: layer.locked,
        lockScalingFlip: true
      });
      if (isTextLayer(id)) {
        if (object.text !== layer.text) object.set({ text: layer.text || " " });
        object.set({ fill: layer.color, fontSize: layer.fontSizeRatio * sourceSize.width, charSpacing: layer.letterSpacing, lineHeight: layer.lineHeight, textAlign: layer.align, fontFamily: FONT_FAMILIES[layer.fontFamily], fontWeight: layer.fontWeight });
        object.dirty = true;
        object.initDimensions?.();
      }
      const baseWidth = Math.max(1, object.width || 1);
      object.scaleToWidth(layer.widthRatio * sourceSize.width);
      if (!Number.isFinite(object.scaleX)) object.set({ scaleX: 1, scaleY: 1 });
      object.setCoords();
    }

    function addTextLayer(id, text) {
      const layer = state.layers[id];
      const object = new fabric.IText(text || layer.text || "文字", {
        posterLayerId: id, fill: layer.color, stroke: "rgba(0,0,0,0.22)", strokeWidth: Math.max(1, sourceSize.width * 0.0008),
        paintFirst: "stroke", splitByGrapheme: true, editable: false, perPixelTargetFind: true, lockUniScaling: true,
        cornerColor: "#d18a48", borderColor: "#d18a48", cornerStyle: "rect", transparentCorners: false
      });
      applyLayer(id, layer, object);
      canvas.add(object);
      object.on("changed", () => {
        state.layers[id].text = object.text;
        if (id === "title-cn") textValues.chinese = object.text;
        if (id === "title-en") textValues.english = object.text;
        emit("textchange", { id, text: object.text });
        pushHistory();
      });
      return object;
    }

    function syncCanvasTextLayers() {
      if (!canvas) return;
      canvas.getObjects()
        .filter((object) => object.posterLayerId && TEXT_LAYER_ID.test(object.posterLayerId) && !state.layers[object.posterLayerId])
        .forEach((object) => canvas.remove(object));
      Object.keys(state.layers).filter(isTextLayer).forEach((id) => {
        if (!objectFor(id)) addTextLayer(id, state.layers[id].text);
      });
    }

    function bindCanvasEvents() {
      canvas.on("selection:created", ({ selected }) => { const id = selected?.[0]?.posterLayerId; if (id) selectLayer(id); });
      canvas.on("selection:updated", ({ selected }) => { const id = selected?.[0]?.posterLayerId; if (id) selectLayer(id); });
      canvas.on("object:modified", ({ target }) => {
        const id = target?.posterLayerId;
        if (id) {
          state.layers[id] = serializeObject(id, target);
          pushHistory();
        }
      });
      canvas.on("object:moving", ({ target }) => {
        if (!state.snapEnabled || !target || !sourceSize.width) return;
        const center = target.getCenterPoint();
        const threshold = Math.min(sourceSize.width, sourceSize.height) * 0.01;
        if (Math.abs(center.x - sourceSize.width / 2) <= threshold) target.set({ left: sourceSize.width / 2 });
        if (Math.abs(center.y - sourceSize.height / 2) <= threshold) target.set({ top: sourceSize.height / 2 });
      });
    }

    function bindDirectLayerDrag() {
      const element = canvas?.upperCanvasEl;
      if (!element) return;
      const documentTarget = element.ownerDocument;
      const windowTarget = documentTarget.defaultView;
      const eventSurface = element.parentElement || element;
      let drag = null;
      let lastLayerClick = { id: "", at: 0 };
      element.draggable = false;
      eventSurface.draggable = false;
      eventSurface.tabIndex = 0;

      function layerAtEvent(event) {
        const scenePoint = typeof canvas.getScenePoint === "function"
          ? canvas.getScenePoint(event)
          : canvas.getPointer(event);
        const object = [...canvas.getObjects()].reverse().find((candidate) => (
          candidate.posterLayerId
          && candidate.posterLayerId !== "source"
          && candidate.visible !== false
          && typeof candidate.containsPoint === "function"
          && candidate.containsPoint(scenePoint)
        ));
        return object?.posterLayerId || "";
      }

      const finish = (event, inputType) => {
        if (!drag || drag.inputType !== inputType) return;
        if (inputType === "pointer" && drag.pointerId !== event.pointerId) return;
        const completed = drag;
        drag = null;
        element.classList.remove("direct-layer-dragging");
        if (inputType === "pointer") {
          try { element.releasePointerCapture?.(completed.pointerId); } catch (error) { /* pointer capture may already be released */ }
        }
        if (completed.moved) {
          state.layers[completed.id] = serializeObject(completed.id, completed.object);
          pushHistory();
        }
        event.preventDefault();
        event.stopImmediatePropagation();
      };

      const start = (event, inputType) => {
        if (event.button !== 0) return;
        if (drag) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        const hitLayerId = layerAtEvent(event);
        if (hitLayerId && hitLayerId !== state.selectedLayer) selectLayer(hitLayerId);
        const id = hitLayerId || state.selectedLayer;
        const layer = state.layers[id];
        const object = objectFor(id);
        if (!layer || !object || layer.locked || layer.visible === false) return;
        const rect = element.getBoundingClientRect();
        drag = {
          id, object, inputType, pointerId: inputType === "pointer" ? event.pointerId : null,
          startX: event.clientX, startY: event.clientY,
          startLeft: object.left, startTop: object.top,
          scaleX: sourceSize.width / rect.width,
          scaleY: sourceSize.height / rect.height,
          moved: false
        };
        if (inputType === "pointer") {
          try { element.setPointerCapture?.(event.pointerId); } catch (error) { /* window listeners keep the drag active */ }
        }
        element.classList.add("direct-layer-dragging");
        event.preventDefault();
        event.stopImmediatePropagation();
      };

      const move = (event, inputType) => {
        if (!drag || drag.inputType !== inputType) return;
        if (inputType === "pointer" && drag.pointerId !== event.pointerId) return;
        const deltaX = (event.clientX - drag.startX) * drag.scaleX;
        const deltaY = (event.clientY - drag.startY) * drag.scaleY;
        if (!drag.moved && Math.hypot(deltaX, deltaY) < 2) return;
        drag.moved = true;
        drag.object.set({
          left: clamp(drag.startLeft + deltaX, 0, sourceSize.width, drag.startLeft),
          top: clamp(drag.startTop + deltaY, 0, sourceSize.height, drag.startTop)
        });
        drag.object.setCoords();
        canvas.requestRenderAll();
        event.preventDefault();
        event.stopImmediatePropagation();
      };

      const onPointerDown = (event) => start(event, "pointer");
      const onPointerMove = (event) => move(event, "pointer");
      const onPointerUp = (event) => finish(event, "pointer");
      const onPointerCancel = (event) => finish(event, "pointer");
      const onMouseDown = (event) => start(event, "mouse");
      const onMouseMove = (event) => move(event, "mouse");
      const onMouseUp = (event) => finish(event, "mouse");
      const onNativeDragStart = (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const onClick = (event) => {
        const hitLayerId = layerAtEvent(event);
        if (drag && !drag.moved) {
          drag = null;
          element.classList.remove("direct-layer-dragging");
        }
        if (!hitLayerId) {
          lastLayerClick = { id: "", at: 0 };
          eventSurface.focus({ preventScroll: true });
          return;
        }
        selectLayer(hitLayerId);
        const now = performance.now();
        const repeatedClick = lastLayerClick.id === hitLayerId && now - lastLayerClick.at <= 420;
        lastLayerClick = { id: hitLayerId, at: now };
        if (repeatedClick && isTextLayer(hitLayerId)) {
          enterTextEditing(hitLayerId);
          lastLayerClick = { id: "", at: 0 };
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        eventSurface.focus({ preventScroll: true });
      };
      const onDoubleClick = (event) => {
        const hitLayerId = layerAtEvent(event);
        if (!hitLayerId || !isTextLayer(hitLayerId)) return;
        drag = null;
        element.classList.remove("direct-layer-dragging");
        lastLayerClick = { id: "", at: 0 };
        selectLayer(hitLayerId);
        enterTextEditing(hitLayerId);
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const onKeyDown = (event) => {
        if ((event.key === "Delete" || event.key === "Backspace") && TEXT_LAYER_ID.test(state.selectedLayer)) {
          removeLayer(state.selectedLayer);
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        const directions = {
          ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
        };
        const direction = directions[event.key];
        const layer = state.layers[state.selectedLayer];
        if (!direction || !layer || layer.locked || layer.visible === false) return;
        const step = event.shiftKey ? 0.02 : 0.005;
        updateLayer(state.selectedLayer, {
          x: clamp(layer.x + direction[0] * step, 0, 1, layer.x),
          y: clamp(layer.y + direction[1] * step, 0, 1, layer.y)
        });
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      eventSurface.addEventListener("pointerdown", onPointerDown, true);
      documentTarget.addEventListener("pointermove", onPointerMove, true);
      documentTarget.addEventListener("pointerup", onPointerUp, true);
      documentTarget.addEventListener("pointercancel", onPointerCancel, true);
      windowTarget?.addEventListener("pointermove", onPointerMove, true);
      windowTarget?.addEventListener("pointerup", onPointerUp, true);
      windowTarget?.addEventListener("pointercancel", onPointerCancel, true);
      eventSurface.addEventListener("mousedown", onMouseDown, true);
      eventSurface.addEventListener("click", onClick, true);
      eventSurface.addEventListener("dblclick", onDoubleClick, true);
      eventSurface.addEventListener("keydown", onKeyDown, true);
      eventSurface.addEventListener("dragstart", onNativeDragStart, true);
      documentTarget.addEventListener("mousemove", onMouseMove, true);
      documentTarget.addEventListener("mouseup", onMouseUp, true);
      windowTarget?.addEventListener("mousemove", onMouseMove, true);
      windowTarget?.addEventListener("mouseup", onMouseUp, true);
      directDragCleanup = () => {
        eventSurface.removeEventListener("pointerdown", onPointerDown, true);
        documentTarget.removeEventListener("pointermove", onPointerMove, true);
        documentTarget.removeEventListener("pointerup", onPointerUp, true);
        documentTarget.removeEventListener("pointercancel", onPointerCancel, true);
        windowTarget?.removeEventListener("pointermove", onPointerMove, true);
        windowTarget?.removeEventListener("pointerup", onPointerUp, true);
        windowTarget?.removeEventListener("pointercancel", onPointerCancel, true);
        eventSurface.removeEventListener("mousedown", onMouseDown, true);
        eventSurface.removeEventListener("click", onClick, true);
        eventSurface.removeEventListener("dblclick", onDoubleClick, true);
        eventSurface.removeEventListener("keydown", onKeyDown, true);
        eventSurface.removeEventListener("dragstart", onNativeDragStart, true);
        documentTarget.removeEventListener("mousemove", onMouseMove, true);
        documentTarget.removeEventListener("mouseup", onMouseUp, true);
        windowTarget?.removeEventListener("mousemove", onMouseMove, true);
        windowTarget?.removeEventListener("mouseup", onMouseUp, true);
      };
    }

    async function loadFabricImage(url) {
      return fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    }

    function applyOutputGeometry() {
      if (!canvas || !sourceObject || !originalSize.width || !originalSize.height) return;
      const crop = calculateCenterCrop(originalSize.width, originalSize.height, state.outputRatio);
      sourceSize = { width: crop.width, height: crop.height };
      canvas.setDimensions(sourceSize);
      sourceObject.set({
        left: crop.offsetX,
        top: crop.offsetY,
        originX: "left",
        originY: "top",
        scaleX: originalSize.width / Math.max(1, sourceObject.width),
        scaleY: originalSize.height / Math.max(1, sourceObject.height)
      });
      sourceObject.setCoords();
      canvas.sendObjectToBack(sourceObject);
      Object.keys(state.layers).forEach((id) => {
        const layer = state.layers[id];
        if (!layer) return;
        state.layers[id] = normalizePosterLayer({
          ...layer,
          x: clamp(layer.x, 0.04, 0.96, 0.5),
          y: clamp(layer.y, 0.04, 0.96, 0.5)
        }, defaultsFor(id));
        applyLayer(id, state.layers[id]);
      });
      canvas.requestRenderAll();
      resizePreview();
    }

    async function setSource({ url, width, height }) {
      if (!url || !width || !height) throw new Error("海报底图信息不完整");
      await ensureBundledFonts();
      sourceUrl = url;
      originalSize = { width, height };
      const crop = calculateCenterCrop(width, height, state.outputRatio);
      sourceSize = { width: crop.width, height: crop.height };
      directDragCleanup();
      directDragCleanup = () => {};
      if (canvas) canvas.dispose();
      canvas = new fabric.Canvas(options.canvasElement, { preserveObjectStacking: true, selection: false, perPixelTargetFind: true, targetFindTolerance: 4, enableRetinaScaling: false });
      canvas.setDimensions(sourceSize);
      sourceObject = await loadFabricImage(url);
      sourceObject.set({ left: crop.offsetX, top: crop.offsetY, originX: "left", originY: "top", selectable: false, evented: false, excludeFromExport: false, posterLayerId: "source" });
      sourceObject.scaleX = width / sourceObject.width;
      sourceObject.scaleY = height / sourceObject.height;
      canvas.add(sourceObject);
      canvas.sendObjectToBack(sourceObject);
      state.layers["title-cn"].text = textValues.chinese;
      state.layers["title-en"].text = textValues.english;
      Object.keys(state.layers).filter(isTextLayer).forEach((id) => addTextLayer(id, state.layers[id].text));
      bindCanvasEvents();
      bindDirectLayerDrag();
      if (titleUrl) await setTitleAsset({ url: titleUrl });
      else selectLayer(state.selectedLayer);
      canvas.requestRenderAll();
      history = [];
      historyIndex = -1;
      pushHistory();
      resizePreview();
      return serialize();
    }

    function setOutputRatio(ratio = "") {
      if (!canvas || !originalSize.width) return serialize();
      state = serialize();
      const nextRatio = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(String(ratio)) ? String(ratio) : "";
      const nextCrop = calculateCenterCrop(originalSize.width, originalSize.height, nextRatio);
      if (state.outputRatio === nextRatio && sourceSize.width === nextCrop.width && sourceSize.height === nextCrop.height) return serialize();
      state.outputRatio = nextRatio;
      applyOutputGeometry();
      pushHistory();
      return serialize();
    }

    async function setTitleAsset({ url }) {
      titleUrl = url || "";
      if (!canvas || !url) return;
      if (titleImageObject) canvas.remove(titleImageObject);
      titleImageObject = await loadFabricImage(url);
      titleImageObject.set({ posterLayerId: "title-image", perPixelTargetFind: true, lockUniScaling: true, cornerColor: "#d18a48", borderColor: "#d18a48", cornerStyle: "rect", transparentCorners: false });
      applyLayer("title-image", state.layers["title-image"], titleImageObject);
      canvas.add(titleImageObject);
      selectLayer("title-image");
      canvas.requestRenderAll();
      pushHistory();
    }

    function removeTitleAsset() {
      titleUrl = "";
      if (canvas && titleImageObject) canvas.remove(titleImageObject);
      titleImageObject = null;
      state.titleAsset = null;
      if (state.selectedLayer === "title-image") selectLayer("title-cn");
      pushHistory();
    }

    function setTexts({ chinese, english } = {}) {
      if (typeof chinese === "string") textValues.chinese = chinese;
      if (typeof english === "string") textValues.english = english;
      const cn = objectFor("title-cn");
      const en = objectFor("title-en");
      if (typeof chinese === "string") state.layers["title-cn"].text = chinese || "片名";
      if (typeof english === "string") state.layers["title-en"].text = english || "FILM TITLE";
      if (cn && typeof chinese === "string" && cn.text !== chinese) {
        cn.set({ text: state.layers["title-cn"].text });
        applyLayer("title-cn", state.layers["title-cn"], cn);
      }
      if (en && typeof english === "string" && en.text !== english) {
        en.set({ text: state.layers["title-en"].text });
        applyLayer("title-en", state.layers["title-en"], en);
      }
      canvas?.requestRenderAll();
    }

    function selectLayer(id) {
      if (!state.layers[id]) return;
      state.selectedLayer = id;
      const object = objectFor(id);
      refreshLayerInteractivity();
      if (canvas && object) canvas.setActiveObject(object);
      emit("selectionchange", { id, layer: state.layers[id] });
      canvas?.requestRenderAll();
    }

    function finishTextEditing() {
      if (!canvas) return;
      canvas.getObjects().forEach((object) => {
        if (object.isEditing && typeof object.exitEditing === "function") object.exitEditing();
      });
      canvas.requestRenderAll();
    }

    function enterTextEditing(id = state.selectedLayer) {
      const object = objectFor(id);
      if (!object || !isTextLayer(id)) return false;
      finishTextEditing();
      selectLayer(id);
      emit("editrequest", { id, text: object.text });
      canvas.requestRenderAll();
      return true;
    }

    function insertLineBreak(id = state.selectedLayer) {
      if (!isTextLayer(id)) return false;
      return setLayerText(id, `${state.layers[id].text || ""}\n`);
    }

    function updateLayer(id, patch = {}) {
      if (!state.layers[id]) return;
      state.layers[id] = normalizePosterLayer({ ...state.layers[id], ...patch }, defaultsFor(id));
      applyLayer(id, state.layers[id]);
      canvas?.requestRenderAll();
      pushHistory();
    }

    function setLayerVisible(id, visible) { updateLayer(id, { visible: Boolean(visible) }); }
    function setLayerLocked(id, locked) { updateLayer(id, { locked: Boolean(locked) }); }
    function setLayerText(id, text) {
      if (!isTextLayer(id)) return false;
      const nextText = String(text ?? "").slice(0, 2000);
      state.layers[id].text = nextText;
      const object = objectFor(id);
      if (object && object.text !== nextText) {
        object.set({ text: nextText || " " });
        applyLayer(id, state.layers[id], object);
      }
      if (id === "title-cn") textValues.chinese = nextText;
      if (id === "title-en") textValues.english = nextText;
      emit("textchange", { id, text: nextText });
      canvas?.requestRenderAll();
      pushHistory();
      return true;
    }
    function nextTextLayer(role) {
      let index = 1;
      while (state.layers[`text-${role}-${index}`] && index < 999) index += 1;
      return createPosterTextLayer(role, index);
    }
    function addText(role = "custom") {
      if (Object.keys(state.layers).filter(TEXT_LAYER_ID.test.bind(TEXT_LAYER_ID)).length >= 24) return "";
      const created = nextTextLayer(TEXT_ROLE_PRESETS[role] ? role : "custom");
      state.layers[created.id] = normalizePosterLayer(created.layer, created.layer);
      if (canvas) addTextLayer(created.id, created.layer.text);
      selectLayer(created.id);
      pushHistory();
      return created.id;
    }
    function duplicateLayer(id = state.selectedLayer) {
      if (!isTextLayer(id)) return "";
      const role = TEXT_ROLE_PRESETS[state.layers[id].role] ? state.layers[id].role : "custom";
      const created = nextTextLayer(role);
      state.layers[created.id] = normalizePosterLayer({ ...state.layers[id], label: `${state.layers[id].label}副本`, x: clamp(state.layers[id].x + 0.03, 0, 1, 0.5), y: clamp(state.layers[id].y + 0.03, 0, 1, 0.5), locked: false }, created.layer);
      if (canvas) addTextLayer(created.id, state.layers[created.id].text);
      selectLayer(created.id);
      pushHistory();
      return created.id;
    }
    function removeLayer(id = state.selectedLayer) {
      if (!TEXT_LAYER_ID.test(id) || !state.layers[id]) return false;
      const object = objectFor(id);
      if (canvas && object) canvas.remove(object);
      delete state.layers[id];
      state.selectedLayer = "title-cn";
      selectLayer("title-cn");
      pushHistory();
      return true;
    }
    function resetLayer(id) {
      if (!state.layers[id]) return;
      const defaults = defaultsFor(id);
      updateLayer(id, { ...defaults, text: state.layers[id].text, label: state.layers[id].label });
    }
    function moveLayerToPreset(id, preset) {
      const positions = { top: [0.5, 0.14], center: [0.5, 0.5], bottom: [0.5, 0.84], "left-bottom": [0.28, 0.84], "right-bottom": [0.72, 0.84] };
      const position = positions[preset];
      if (position) updateLayer(id, { x: position[0], y: position[1] });
    }

    function restoreHistory(nextIndex) {
      if (!history[nextIndex]) return;
      restoring = true;
      const snapshot = JSON.parse(JSON.stringify(history[nextIndex]));
      state.layers = snapshot.layers || snapshot;
      state.outputRatio = typeof snapshot.outputRatio === "string" ? snapshot.outputRatio : state.outputRatio;
      state.selectedLayer = state.layers[snapshot.selectedLayer] ? snapshot.selectedLayer : "title-cn";
      syncCanvasTextLayers();
      applyOutputGeometry();
      historyIndex = nextIndex;
      canvas?.requestRenderAll();
      restoring = false;
      emit("change", serialize());
      Object.keys(state.layers).filter(isTextLayer).forEach((id) => emit("textchange", { id, text: state.layers[id].text }));
    }
    function undo() { restoreHistory(historyIndex - 1); }
    function redo() { restoreHistory(historyIndex + 1); }

    function resizePreview() {
      if (!canvas || !options.stageElement || !sourceSize.width) return;
      const availableWidth = Math.max(240, options.stageElement.clientWidth - 28);
      const availableHeight = Math.max(260, options.stageElement.clientHeight - 28);
      const scale = Math.min(availableWidth / sourceSize.width, availableHeight / sourceSize.height);
      const width = Math.round(sourceSize.width * scale);
      const height = Math.round(sourceSize.height * scale);
      canvas.setDimensions({ width, height }, { cssOnly: true });
      canvas.calcOffset();
    }

    function setPreviewScale(mode = "fit") {
      if (!canvas || !sourceSize.width) return;
      if (mode === "100") {
        canvas.setDimensions({ width: sourceSize.width, height: sourceSize.height }, { cssOnly: true });
        canvas.calcOffset();
        return;
      }
      resizePreview();
    }

    async function exportBlob({ format = state.exportFormat, quality = 0.92 } = {}) {
      if (!canvas || !sourceSize.width) throw new Error("请先上传海报底图");
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const outputCanvas = canvas.toCanvasElement(1);
      const type = format === "jpg" ? "image/jpeg" : "image/png";
      return new Promise((resolve, reject) => outputCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("海报导出失败")), type, format === "jpg" ? quality : undefined));
    }

    function destroy() { directDragCleanup(); directDragCleanup = () => {}; canvas?.dispose(); canvas = null; Object.values(listeners).forEach((group) => group.clear()); }

    return { on, setSource, setOutputRatio, setTitleAsset, removeTitleAsset, setTexts, selectLayer, finishTextEditing, enterTextEditing, insertLineBreak, updateLayer, setLayerVisible, setLayerLocked, setLayerText, addText, duplicateLayer, removeLayer, resetLayer, moveLayerToPreset, undo, redo, resizePreview, setPreviewScale, exportBlob, serialize, destroy, getSourceSize: () => ({ ...sourceSize }), getOriginalSize: () => ({ ...originalSize }), getState: () => serialize(), getHistoryStatus: () => ({ canUndo: historyIndex > 0, canRedo: historyIndex >= 0 && historyIndex < history.length - 1 }) };
  }

  const api = { FONT_FAMILIES, FONT_STYLE_KEYS, TEXT_ROLE_PRESETS, LAYER_DEFAULTS, DEFAULT_POSTER_COMPOSITOR_STATE, calculateCenterCrop, createPosterTextLayer, migratePosterLayerFontStyles, normalizePosterLayer, normalizePosterCompositorState, safePosterExportName, createPosterCompositor };
  root.aigcPosterCompositor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
