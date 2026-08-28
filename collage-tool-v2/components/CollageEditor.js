"use client";

import { useMemo, useRef, useState } from "react";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const DEFAULT_EFFECTS = {
  grain: 0,
  noise: 0,
  scratches: 0,
  threshold: 0,
  fade: 0
};

const BLENDS = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity"
];

const SHAPES = [
  ["rect", "Rectangle"],
  ["circle", "Circle"],
  ["ellipse", "Ellipse"],
  ["triangle", "Triangle"],
  ["star", "Star"],
  ["cross", "Cross"],
  ["line", "Line"]
];

export default function CollageEditor() {
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [ratio, setRatio] = useState("4 / 5");
  const [background, setBackground] = useState("#f1eee6");
  const [showShapes, setShowShapes] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);

  const fileInput = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const selected = useMemo(
    () => layers.find((l) => l.id === selectedId) ?? null,
    [layers, selectedId]
  );

  function setLayer(id, patch) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  function setEffect(id, key, value) {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, effects: { ...DEFAULT_EFFECTS, ...l.effects, [key]: value } }
          : l
      )
    );
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    const additions = [];
    for (const file of files) {
      const src = URL.createObjectURL(file);
      try {
        const dim = await imageSize(src);
        const ar = dim.width / dim.height;
        const width = ar >= 1 ? 38 : clamp(38 * ar, 18, 38);
        const height = ar >= 1 ? clamp(38 / ar, 18, 38) : 38;

        additions.push({
          id: makeId(),
          type: "image",
          src,
          localObjectUrl: true,
          name: file.name,
          x: 50,
          y: 50,
          width,
          height,
          rotation: 0,
          opacity: 1,
          blend: "normal",
          effects: { ...DEFAULT_EFFECTS },
          z: Date.now() + additions.length
        });
      } catch {
        URL.revokeObjectURL(src);
      }
    }

    if (!additions.length) return;
    setLayers((prev) => [...prev, ...additions]);
    setSelectedId(additions.at(-1).id);
  }

  function addShape(shape) {
    const layer = {
      id: makeId(),
      type: "shape",
      shape,
      x: 50,
      y: 50,
      width: shape === "line" ? 44 : 28,
      height: shape === "line" ? 5 : shape === "ellipse" ? 20 : 28,
      rotation: 0,
      opacity: 1,
      blend: "normal",
      fill: "#151515",
      stroke: "#151515",
      strokeWidth: 0,
      z: Date.now()
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
    setShowShapes(false);
  }

  function addText() {
    const layer = {
      id: makeId(),
      type: "text",
      text: "YOUR TEXT",
      x: 50,
      y: 50,
      width: 55,
      height: 18,
      rotation: 0,
      opacity: 1,
      blend: "normal",
      color: "#151515",
      fontSize: 62,
      fontWeight: 800,
      letterSpacing: -2,
      textAlign: "center",
      z: Date.now()
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }

  async function addRemoteImage(raw) {
    if (!raw?.trim()) return;
    const src = `/api/image-proxy?url=${encodeURIComponent(raw.trim())}`;
    try {
      const dim = await imageSize(src);
      const ar = dim.width / dim.height;
      const width = ar >= 1 ? 38 : clamp(38 * ar, 18, 38);
      const height = ar >= 1 ? clamp(38 / ar, 18, 38) : 38;

      const layer = {
        id: makeId(),
        type: "image",
        src,
        name: "Remote image",
        x: 50,
        y: 50,
        width,
        height,
        rotation: 0,
        opacity: 1,
        blend: "normal",
        effects: { ...DEFAULT_EFFECTS },
        z: Date.now()
      };
      setLayers((prev) => [...prev, layer]);
      setSelectedId(layer.id);
    } catch {
      alert("Не удалось загрузить изображение через proxy");
    }
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.localObjectUrl) URL.revokeObjectURL(selected.src);
    setLayers((prev) => prev.filter((l) => l.id !== selected.id));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = {
      ...selected,
      id: makeId(),
      x: clamp(selected.x + 4, 0, 100),
      y: clamp(selected.y + 4, 0, 100),
      z: Date.now()
    };
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function bringToFront() {
    if (!selected) return;
    const top = Math.max(0, ...layers.map((l) => l.z || 0)) + 1;
    setLayer(selected.id, { z: top });
  }

  function sendToBack() {
    if (!selected) return;
    const bottom = Math.min(0, ...layers.map((l) => l.z || 0)) - 1;
    setLayer(selected.id, { z: bottom });
  }

  function shuffle() {
    setLayers((prev) =>
      prev.map((l, i) => ({
        ...l,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        rotation: -15 + Math.random() * 30,
        z: Date.now() + i
      }))
    );
  }

  function pointerDown(e, layer) {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(layer.id);

    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      id: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      rect
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function pointerMove(e) {
    const d = dragRef.current;
    if (!d) return;

    const dx = ((e.clientX - d.startClientX) / d.rect.width) * 100;
    const dy = ((e.clientY - d.startClientY) / d.rect.height) * 100;

    setLayer(d.id, {
      x: clamp(d.startX + dx, 0, 100),
      y: clamp(d.startY + dy, 0, 100)
    });
  }

  function pointerUp() {
    dragRef.current = null;
  }

  return (
    <main className="shell">
      <aside className="panel leftPanel">
        <div className="brand">COLLAGE TOOL</div>

        <button className="primary" onClick={() => fileInput.current?.click()}>
          + Image
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/*"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="addRow">
          <button onClick={() => setShowShapes((v) => !v)}>+ Shape</button>
          <button onClick={addText}>+ Text</button>
        </div>

        {showShapes && (
          <div className="shapeGrid">
            {SHAPES.map(([id, label]) => (
              <button key={id} onClick={() => addShape(id)}>
                <span className={`shapeIcon ${id}`} />
                {label}
              </button>
            ))}
          </div>
        )}

        <section className="section">
          <div className="sectionTitle">Canvas</div>
          <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option value="1 / 1">1:1</option>
            <option value="4 / 5">4:5</option>
            <option value="9 / 16">9:16</option>
            <option value="16 / 9">16:9</option>
            <option value="3 / 2">3:2</option>
          </select>

          <label className="field">
            Background
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </label>
        </section>

        <section className="section">
          <div className="sectionTitle">Remote image</div>
          <RemoteImageForm onAdd={addRemoteImage} />
        </section>

        <section className="section">
          <button onClick={shuffle}>Shuffle composition</button>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <span>{layers.length} layers</span>
          <span>Image · Shape · Text · Distress · Blend</span>
        </header>

        <div
          className={`canvasWrap ${draggingOver ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDraggingOver(true);
          }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDraggingOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div
            ref={canvasRef}
            className="canvas"
            style={{ aspectRatio: ratio, background }}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onPointerLeave={pointerUp}
            onClick={() => setSelectedId(null)}
          >
            {!layers.length && (
              <div className="empty">
                <strong>Drop images here</strong>
                <span>or build from shapes and text</span>
              </div>
            )}

            {layers.map((layer) => (
              <Layer
                key={layer.id}
                layer={layer}
                selected={selectedId === layer.id}
                onPointerDown={(e) => pointerDown(e, layer)}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="panel rightPanel">
        <div className="sectionTitle">Selected layer</div>

        {!selected ? (
          <div className="muted">Select a layer on canvas.</div>
        ) : (
          <>
            <div className="layerType">
              {selected.type.toUpperCase()}
              <span>{selected.name || selected.shape || ""}</span>
            </div>

            {selected.type === "text" && (
              <section className="controlGroup">
                <label className="field">
                  Text
                  <textarea
                    value={selected.text}
                    onChange={(e) => setLayer(selected.id, { text: e.target.value })}
                  />
                </label>

                <Range
                  label="Font size"
                  min="12"
                  max="180"
                  value={selected.fontSize}
                  onChange={(v) => setLayer(selected.id, { fontSize: Number(v) })}
                />
                <Range
                  label="Weight"
                  min="100"
                  max="900"
                  step="100"
                  value={selected.fontWeight}
                  onChange={(v) => setLayer(selected.id, { fontWeight: Number(v) })}
                />
                <Range
                  label="Tracking"
                  min="-8"
                  max="24"
                  value={selected.letterSpacing}
                  onChange={(v) => setLayer(selected.id, { letterSpacing: Number(v) })}
                />

                <label className="field">
                  Color
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => setLayer(selected.id, { color: e.target.value })}
                  />
                </label>
              </section>
            )}

            {selected.type === "shape" && (
              <section className="controlGroup">
                <label className="field">
                  Fill
                  <input
                    type="color"
                    value={selected.fill}
                    onChange={(e) => setLayer(selected.id, { fill: e.target.value })}
                  />
                </label>
                <label className="field">
                  Stroke
                  <input
                    type="color"
                    value={selected.stroke}
                    onChange={(e) => setLayer(selected.id, { stroke: e.target.value })}
                  />
                </label>
                <Range
                  label="Stroke"
                  min="0"
                  max="20"
                  value={selected.strokeWidth}
                  onChange={(v) => setLayer(selected.id, { strokeWidth: Number(v) })}
                />
              </section>
            )}

            <section className="controlGroup">
              <div className="sectionTitle">Transform</div>
              <Range
                label="Width"
                min="5"
                max="100"
                value={selected.width}
                onChange={(v) => setLayer(selected.id, { width: Number(v) })}
              />
              <Range
                label="Height"
                min="3"
                max="100"
                value={selected.height}
                onChange={(v) => setLayer(selected.id, { height: Number(v) })}
              />
              <Range
                label="Rotation"
                min="-180"
                max="180"
                value={selected.rotation}
                onChange={(v) => setLayer(selected.id, { rotation: Number(v) })}
              />
              <Range
                label="Opacity"
                min="0.05"
                max="1"
                step="0.05"
                value={selected.opacity}
                decimals={2}
                onChange={(v) => setLayer(selected.id, { opacity: Number(v) })}
              />
            </section>

            <section className="controlGroup">
              <div className="sectionTitle">Blend mode</div>
              <select
                value={selected.blend || "normal"}
                onChange={(e) => setLayer(selected.id, { blend: e.target.value })}
              >
                {BLENDS.map((blend) => (
                  <option value={blend} key={blend}>
                    {pretty(blend)}
                  </option>
                ))}
              </select>
            </section>

            {selected.type === "image" && (
              <section className="controlGroup">
                <div className="sectionTitle">Distress</div>
                <Range
                  label="Grain"
                  min="0"
                  max="100"
                  value={selected.effects?.grain ?? 0}
                  onChange={(v) => setEffect(selected.id, "grain", Number(v))}
                />
                <Range
                  label="Noise"
                  min="0"
                  max="100"
                  value={selected.effects?.noise ?? 0}
                  onChange={(v) => setEffect(selected.id, "noise", Number(v))}
                />
                <Range
                  label="Scratches"
                  min="0"
                  max="100"
                  value={selected.effects?.scratches ?? 0}
                  onChange={(v) => setEffect(selected.id, "scratches", Number(v))}
                />
                <Range
                  label="Threshold"
                  min="0"
                  max="100"
                  value={selected.effects?.threshold ?? 0}
                  onChange={(v) => setEffect(selected.id, "threshold", Number(v))}
                />
                <Range
                  label="Fade"
                  min="0"
                  max="100"
                  value={selected.effects?.fade ?? 0}
                  onChange={(v) => setEffect(selected.id, "fade", Number(v))}
                />

                <button
                  onClick={() =>
                    setLayer(selected.id, { effects: { ...DEFAULT_EFFECTS } })
                  }
                >
                  Reset distress
                </button>
              </section>
            )}

            <section className="layerActions">
              <button onClick={bringToFront}>Front</button>
              <button onClick={sendToBack}>Back</button>
              <button onClick={duplicateSelected}>Duplicate</button>
              <button className="danger" onClick={removeSelected}>Delete</button>
            </section>
          </>
        )}
      </aside>
    </main>
  );
}

function Layer({ layer, selected, onPointerDown }) {
  const base = {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    opacity: layer.opacity,
    zIndex: layer.z,
    mixBlendMode: layer.blend || "normal",
    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`
  };

  if (layer.type === "image") {
    const fx = { ...DEFAULT_EFFECTS, ...layer.effects };
    const thresholdAmount = fx.threshold / 100;
    const fadeAmount = fx.fade / 100;

    const filter = [
      thresholdAmount > 0
        ? `grayscale(${thresholdAmount}) contrast(${1 + thresholdAmount * 7})`
        : "",
      fadeAmount > 0
        ? `saturate(${1 - fadeAmount * 0.75}) contrast(${1 - fadeAmount * 0.25}) brightness(${1 + fadeAmount * 0.12})`
        : ""
    ].filter(Boolean).join(" ");

    return (
      <div
        className={`layer imageLayer ${selected ? "selected" : ""}`}
        style={base}
        onPointerDown={onPointerDown}
      >
        <img
          src={layer.src}
          alt={layer.name || ""}
          draggable={false}
          style={{ filter: filter || "none" }}
        />
        <DistressOverlay effects={fx} />
      </div>
    );
  }

  if (layer.type === "text") {
    return (
      <div
        className={`layer textLayer ${selected ? "selected" : ""}`}
        style={{
          ...base,
          color: layer.color,
          fontSize: `${layer.fontSize}px`,
          fontWeight: layer.fontWeight,
          letterSpacing: `${layer.letterSpacing}px`,
          textAlign: layer.textAlign || "center"
        }}
        onPointerDown={onPointerDown}
      >
        {layer.text}
      </div>
    );
  }

  return (
    <div
      className={`layer shapeLayer ${selected ? "selected" : ""}`}
      style={base}
      onPointerDown={onPointerDown}
    >
      <ShapeVisual layer={layer} />
    </div>
  );
}

function DistressOverlay({ effects }) {
  return (
    <>
      {effects.grain > 0 && (
        <div
          className="fxOverlay grainFx"
          style={{ opacity: effects.grain / 165 }}
        />
      )}
      {effects.noise > 0 && (
        <div
          className="fxOverlay noiseFx"
          style={{ opacity: effects.noise / 145 }}
        />
      )}
      {effects.scratches > 0 && (
        <div
          className="fxOverlay scratchesFx"
          style={{ opacity: effects.scratches / 150 }}
        />
      )}
      {effects.fade > 0 && (
        <div
          className="fxOverlay fadeFx"
          style={{ opacity: effects.fade / 260 }}
        />
      )}
    </>
  );
}

function ShapeVisual({ layer }) {
  const common = {
    "--shape-fill": layer.fill,
    "--shape-stroke": layer.stroke,
    "--shape-stroke-width": `${layer.strokeWidth}px`
  };

  if (layer.shape === "triangle") {
    return <div className="shape triangleShape" style={common} />;
  }

  if (layer.shape === "star") {
    return <div className="shape starShape" style={common}>★</div>;
  }

  if (layer.shape === "cross") {
    return <div className="shape crossShape" style={common}><i /><b /></div>;
  }

  if (layer.shape === "line") {
    return <div className="shape lineShape" style={common} />;
  }

  return (
    <div
      className={`shape ${layer.shape}Shape`}
      style={{
        ...common,
        background: layer.fill,
        border: `${layer.strokeWidth}px solid ${layer.stroke}`
      }}
    />
  );
}

function Range({ label, value, onChange, decimals = 0, ...props }) {
  return (
    <label className="rangeRow">
      <span>
        {label}
        <b>{Number(value).toFixed(decimals)}</b>
      </span>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}

function RemoteImageForm({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(value);
      }}
    >
      <input
        className="urlInput"
        placeholder="https://..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Add URL</button>
    </form>
  );
}

function imageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = reject;
    img.src = src;
  });
}

function pretty(value) {
  return value
    .split("-")
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join(" ");
}
