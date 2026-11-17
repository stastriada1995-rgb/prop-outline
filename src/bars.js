import OBR, { buildShape, buildText, buildPath } from "@owlbear-rodeo/sdk";
import { ID, STATS_KEY } from "./constants.js";

// Полоска хитов и значок КД над токеном.
// Рисуются локальными элементами: у каждого клиента свои, в сцену не сохраняются.
// Мастер видит у всех, игрок — только у токенов с галочкой «Показывать игрокам».

const TAG = `${ID}/bar`; // метка наших локальных элементов
const drawn = new Map(); // id токена → отпечаток того, что нарисовано

let role = "PLAYER";
let busy = false;
let pending = false;

const hpColor = (r) => (r > 0.5 ? "#2e9d4f" : r > 0.25 ? "#d99a1e" : "#c9302c");

// Скруглённый прямоугольник («таблетка») в локальных координатах фигуры.
// Команды пути: 0 MOVE, 1 LINE, 3 CONIC (дуга), 5 CLOSE
const K = Math.SQRT1_2;
function pill(w, h) {
  const r = Math.min(h / 2, w / 2);
  return [
    [0, r, 0], [1, w - r, 0], [3, w, 0, w, r, K],
    [1, w, h - r], [3, w, h, w - r, h, K],
    [1, r, h], [3, 0, h, 0, h - r, K],
    [1, 0, r], [3, 0, 0, r, 0, K], [5],
  ];
}

function fingerprint(item, st) {
  return JSON.stringify([
    st.hp, st.hpMax, st.hpTemp, st.ac, st.showBar, item.visible, role,
    item.scale, item.rotation, item.image?.width, item.image?.height, item.grid?.dpi,
  ]);
}

function wanted(item) {
  const st = item.metadata[STATS_KEY];
  if (!st || (st.hpMax == null && st.ac == null)) return null;
  if (item.layer !== "CHARACTER" && item.layer !== "MOUNT") return null;
  if (role !== "GM" && (!st.showBar || item.visible === false)) return null;
  return st;
}

async function buildFor(item, st, dpi) {
  const b = await OBR.scene.items.getItemBounds([item.id]);
  const unit = dpi; // размер клетки в мировых единицах
  const barW = Math.max(b.width * 0.72, unit * 0.6);
  const barH = unit * 0.13;
  const x0 = b.center.x - barW / 2;
  const y0 = b.min.y - barH * 0.05; // полоска почти целиком лежит на верхнем краю токена
  const out = [];
  const base = (builder) =>
    builder
      .attachedTo(item.id)
      .disableAttachmentBehavior(["ROTATION", "SCALE", "LOCKED", "COPY"])
      .layer("ATTACHMENT")
      .locked(true)
      .disableHit(true)
      .visible(true)
      .metadata({ [TAG]: item.id });
  const bar = (x, w, color, opacity, z) =>
    base(buildPath()).commands(pill(w, barH)).position({ x, y: y0 })
      .fillColor(color).fillOpacity(opacity).strokeWidth(0).strokeOpacity(0).zIndex(z).build();

  if (st.hpMax != null) {
    const max = Math.max(1, st.hpMax);
    const hp = Math.max(0, st.hp ?? max);
    const temp = Math.max(0, st.hpTemp || 0);
    const r = Math.min(1, hp / max);
    out.push(bar(x0, barW, "#14161d", 0.75, 1));
    if (r > 0) out.push(bar(x0, Math.max(barW * r, barH), hpColor(r), 1, 2));
    if (temp > 0) {
      const tw = Math.max(barW * Math.min(1, temp / max), barH);
      const tx = Math.min(x0 + barW * r - barH / 2, x0 + barW - tw); // заходит на край хитов
      out.push(bar(Math.max(x0, tx), tw, "#1e88c8", 1, 3));
    }
    out.push(base(buildText()).textType("PLAIN")
      .plainText(`${hp}/${max}${temp ? ` +${temp}` : ""}`)
      .width(barW).height(barH).position({ x: x0, y: y0 })
      .textAlign("CENTER").textAlignVertical("MIDDLE").padding(0)
      .fontSize(barH * 0.8).fontWeight(700).fillColor("#ffffff")
      .strokeWidth(0).strokeOpacity(0).lineHeight(1)
      .zIndex(4).build());
  }

  if (st.ac != null) {
    const d = unit * 0.18;
    const hasBar = st.hpMax != null;
    const cx = hasBar ? x0 + barW + d * 0.65 : b.max.x - d * 0.2;
    const cy = hasBar ? y0 + barH / 2 : b.min.y + d / 2;
    out.push(base(buildShape()).shapeType("CIRCLE").width(d).height(d)
      .position({ x: cx, y: cy }).fillColor("#4b55a8").fillOpacity(1)
      .strokeWidth(0).strokeOpacity(0).zIndex(5).build());
    out.push(base(buildText()).textType("PLAIN").plainText(String(st.ac))
      .width(d).height(d).position({ x: cx - d / 2, y: cy - d / 2 })
      .textAlign("CENTER").textAlignVertical("MIDDLE").padding(0)
      .fontSize(d * 0.56).fontWeight(700).fillColor("#ffffff")
      .strokeWidth(0).strokeOpacity(0).lineHeight(1)
      .zIndex(6).build());
  }
  return out;
}

async function sync() {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    const ready = await OBR.scene.isReady();
    const items = ready ? await OBR.scene.items.getItems() : [];
    const dpi = ready ? await OBR.scene.grid.getDpi() : 150;
    const want = new Map();
    for (const it of items) {
      const st = wanted(it);
      if (st) want.set(it.id, { it, st, fp: fingerprint(it, st) });
    }
    const toDelete = [...drawn.keys()].filter((id) => !want.has(id) || want.get(id).fp !== drawn.get(id));
    if (toDelete.length) {
      const del = new Set(toDelete);
      const locals = await OBR.scene.local.getItems((i) => del.has(i.metadata?.[TAG]));
      if (locals.length) await OBR.scene.local.deleteItems(locals.map((i) => i.id));
      toDelete.forEach((id) => drawn.delete(id));
    }
    const toAdd = [];
    for (const [id, w] of want) {
      if (drawn.has(id)) continue;
      toAdd.push(...(await buildFor(w.it, w.st, dpi)));
      drawn.set(id, w.fp);
    }
    if (toAdd.length) await OBR.scene.local.addItems(toAdd);
  } catch (e) {
    console.warn("Полоска хитов:", e);
  } finally {
    busy = false;
    if (pending) { pending = false; sync(); }
  }
}

async function clearAll() {
  drawn.clear();
  try {
    const locals = await OBR.scene.local.getItems((i) => i.metadata?.[TAG] !== undefined);
    if (locals.length) await OBR.scene.local.deleteItems(locals.map((i) => i.id));
  } catch { /* сцена закрыта */ }
}

export async function startBars() {
  role = await OBR.player.getRole();
  OBR.player.onChange(async (p) => {
    if (p.role !== role) { role = p.role; await clearAll(); sync(); }
  });
  OBR.scene.items.onChange(() => sync());
  OBR.scene.grid.onChange(() => { clearAll().then(sync); });
  OBR.scene.onReadyChange((r) => { drawn.clear(); if (r) sync(); });
  if (await OBR.scene.isReady()) { await clearAll(); sync(); }
}
