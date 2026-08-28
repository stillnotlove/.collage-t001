"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function CollageEditor() {
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [canvasRatio, setCanvasRatio] = useState("4 / 5");
  const [background, setBackground] = useState("#f3f1eb");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const dragState = useRef(null);

  const selected = useMemo(
    () => layers.find((layer) => layer.id === selectedId) ?? null,
    [layers, selectedId]
  );

  useEffect(() => {
    return () => {
      layers.forEach((layer) => {
        if (layer.localObjectUrl) URL.revokeObjectURL(layer.src);
      });
    };
  }, []);

  async function addLocalFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!files.length) {
      alert("Выберите JPG, PNG, WEBP, GIF или другой файл изображения.");
      return;
    }

    const newLayers = [];

    for (const file of files) {
      const src = URL.createObjectURL(file);

      try {
        const dimensions = await readImageDimensions(src);
        const maxBase = 38;
        const ratio = dimensions.width / dimensions.height;
        const width = ratio >= 1 ? maxBase : clamp(maxBase * ratio, 18, maxBase);
        const height = ratio >= 1 ? clamp(maxBase / ratio, 18, maxBase) : maxBase;

        newLayers.push({
          id: createId(),
          src,
          localObjectUrl: true,
          name: file.name,
          x: 50,
          y: 50,
          width,
          height,
          rotation: 0,
          opacity: 1,
          z: Date.now() + newLayers.length
        });
      } catch {
        URL.revokeObjectURL(src);
      }
    }

    if (!newLayers.length) {
      alert("Файл выбран, но браузер не смог прочитать изображение.");
      return;
    }

    setLayers((prev) => [...prev, ...newLayers]);
    setSelectedId(newLayers[newLayers.length - 1].id);
  }

  async function addRemoteImage(url) {
    if (!url?.trim()) return;

    const proxied = `/api/image-proxy?url=${encodeURIComponent(url.trim())}`;

    try {
      const dimensions = await readImageDimensions(proxied);
      const ratio = dimensions.width / dimensions.height;
      const width = ratio >= 1 ? 38 : clamp(38 * ratio, 18, 38);
      const height = ratio >= 1 ? clamp(38 / ratio, 18, 38) : 38;

      const layer = {
        id: createId(),
        src: proxied,
        name: "remote image",
        x: 50,
        y: 50,
        width,
        height,
        rotation: 0,
        opacity: 1,
        z: Date.now()
      };

      setLayers((prev) => [...prev, layer]);
      setSelectedId(layer.id);
    } catch {
      alert("Не удалось загрузить картинку через proxy.");
    }
  }

  function updateLayer(id, patch) {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
    );
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.localObjectUrl) URL.revokeObjectURL(selected.src);
    setLayers((prev) => prev.filter((l) => l.id !== selected.id));
    setSelectedId(null);
  }

  function bringToFront() {
    if (!selected) return;
    const z = Math.max(0, ...layers.map((l) => l.z || 0)) + 1;
    updateLayer(selected.id, { z });
  }

  function shuffle() {
    setLayers((prev) =>
      prev.map((layer, index) => ({
        ...layer,
        x: 12 + Math.random() * 76,
        y: 12 + Math.random() * 76,
        rotation: -12 + Math.random() * 24,
        z: Date.now() + index
      }))
    );
  }

  function pointerDown(event, layer) {
    event.preventDefault();
    setSelectedId(layer.id);

    const rect = canvasRef.current.getBoundingClientRect();
    dragState.current = {
      id: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      rect
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    const drag = dragState.current;
    if (!drag) return;

    const dx = ((event.clientX - drag.startClientX) / drag.rect.width) * 100;
    const dy = ((event.clientY - drag.startClientY) / drag.rect.height) * 100;

    updateLayer(drag.id, {
      x: clamp(drag.startX + dx, 0, 100),
      y: clamp(drag.startY + dy, 0, 100)
    });
  }

  function pointerUp() {
    dragState.current = null;
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDraggingOver(false);
    addLocalFiles(event.dataTransfer.files);
  }

  return (
    <main className="shell">
      <aside className="panel leftPanel">
        <div className="brand">COLLAGE TOOLS</div>

        <button className="primary" onClick={() => fileInputRef.current?.click()}>
          + Add image
        </button>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            addLocalFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="section">
          <div className="sectionTitle">Canvas</div>
          <select value={canvasRatio} onChange={(e) => setCanvasRatio(e.target.value)}>
            <option value="1 / 1">1:1</option>
            <option value="4 / 5">4:5</option>
            <option value="9 / 16">9:16</option>
            <option value="16 / 9">16:9</option>
            <option value="3 / 2">3:2</option>
          </select>

          <label>
            Background
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </label>
        </div>

        <div className="section">
          <div className="sectionTitle">Remote image test</div>
          <RemoteImageForm onAdd={addRemoteImage} />
        </div>

        <div className="section">
          <button onClick={shuffle}>Shuffle composition</button>
        </div>
      </aside>

      <section className="workspace">
        <div className="topbar">
          <span>{layers.length} image{layers.length === 1 ? "" : "s"}</span>
          <span>Local uploads work without a server</span>
        </div>

        <div
          className={`canvasWrap ${isDraggingOver ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={onDrop}
        >
          <div
            ref={canvasRef}
            className="canvas"
            style={{ aspectRatio: canvasRatio, background }}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onPointerLeave={pointerUp}
            onClick={() => setSelectedId(null)}
          >
            {!layers.length && (
              <div className="empty">
                <strong>Drop images here</strong>
                <span>or press “Add image”</span>
              </div>
            )}

            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`layer ${selectedId === layer.id ? "selected" : ""}`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  zIndex: layer.z,
                  opacity: layer.opacity,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`
                }}
                onPointerDown={(event) => pointerDown(event, layer)}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={layer.src} alt={layer.name || ""} draggable={false} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="panel rightPanel">
        <div className="sectionTitle">Selected image</div>

        {!selected ? (
          <div className="muted">Выберите картинку на холсте.</div>
        ) : (
          <>
            <div className="filename">{selected.name}</div>

            <Range
              label="Width"
              min="8"
              max="90"
              value={selected.width}
              onChange={(v) => updateLayer(selected.id, { width: Number(v) })}
            />
            <Range
              label="Height"
              min="8"
              max="90"
              value={selected.height}
              onChange={(v) => updateLayer(selected.id, { height: Number(v) })}
            />
            <Range
              label="Rotation"
              min="-45"
              max="45"
              value={selected.rotation}
              onChange={(v) => updateLayer(selected.id, { rotation: Number(v) })}
            />
            <Range
              label="Opacity"
              min="0.1"
              max="1"
              step="0.05"
              value={selected.opacity}
              onChange={(v) => updateLayer(selected.id, { opacity: Number(v) })}
            />

            <button onClick={bringToFront}>Bring to front</button>
            <button className="danger" onClick={removeSelected}>
              Delete
            </button>
          </>
        )}
      </aside>
    </main>
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

function Range({ label, value, onChange, ...props }) {
  return (
    <label className="rangeRow">
      <span>
        {label}
        <b>{Number(value).toFixed(label === "Opacity" ? 2 : 0)}</b>
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

function readImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = reject;
    img.src = src;
  });
}
