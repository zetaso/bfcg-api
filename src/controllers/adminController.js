import sharp from "sharp";

// All handlers here run behind requireAdmin and use req.db (the admin's own Supabase client),
// so Row Level Security is the final authority on every read and write.

const SERVICE_FIELDS = [
  "slug",
  "title",
  "short_description",
  "full_description",
  "price_text",
  "duration_text",
  "image_url",
  "is_active",
  "display_order",
];
const HIGHLIGHT_FIELDS = ["item_type", "title", "content", "display_order"];
const HIGHLIGHT_TYPES = ["benefit", "step", "faq"];

// originals straight from a camera are often 5–15 MB; they are shrunk before storing
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600; // px; covers the widest on-page use (~800px) at 2x density
const WEBP_QUALITY = 80;
export const IMAGE_LIMITS = { fileSize: MAX_IMAGE_BYTES };

const httpError = (status, message) => Object.assign(new Error(message), { status });

const pick = (body, fields) =>
  Object.fromEntries(fields.filter((f) => body?.[f] !== undefined).map((f) => [f, body[f]]));

// empty strings from forms become null for optional text columns
const nullifyEmpty = (row, fields) => {
  for (const f of fields) if (row[f] === "") row[f] = null;
  return row;
};

export const slugify = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const one = (data, what) => {
  if (!data || data.length === 0) throw httpError(404, `${what} no encontrado.`);
  return data[0];
};

const fromDb = (error) => {
  if (!error) return;
  if (error.code === "23505") throw httpError(409, "Ya existe un registro con ese identificador (slug).");
  throw error;
};

// ── Site settings ──────────────────────────────────────────────────────────────

export const listSettings = async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from("site_settings")
      .select("key, section, kind, label, value, display_order, updated_at")
      .order("section")
      .order("display_order");
    fromDb(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

/** Body: { values: { "hero.title": "…", … } }. Only existing keys are updated; nothing is created. */
export const updateSettings = async (req, res, next) => {
  try {
    const values = req.body?.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw httpError(400, "Formato inválido: se esperaba { values: { clave: valor } }.");
    }

    const entries = Object.entries(values);
    if (entries.some(([, v]) => typeof v !== "string")) {
      throw httpError(400, "Todos los valores deben ser texto.");
    }

    const results = await Promise.all(
      entries.map(([key, value]) =>
        req.db.from("site_settings").update({ value }).eq("key", key).select("key"),
      ),
    );
    results.forEach(({ error }) => fromDb(error));

    const missing = entries.filter((_, i) => !results[i].data?.length).map(([k]) => k);
    res.json({ updated: entries.length - missing.length, missing });
  } catch (err) {
    next(err);
  }
};

// ── Services ───────────────────────────────────────────────────────────────────

const SERVICE_SELECT = "*, highlights:service_highlights (*)";

export const listServices = async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from("services")
      .select(SERVICE_SELECT)
      .order("display_order")
      .order("display_order", { referencedTable: "service_highlights" });
    fromDb(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getServiceById = async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from("services")
      .select(SERVICE_SELECT)
      .eq("id", req.params.id)
      .order("display_order", { referencedTable: "service_highlights" });
    fromDb(error);
    res.json({ data: one(data, "Servicio") });
  } catch (err) {
    next(err);
  }
};

export const createService = async (req, res, next) => {
  try {
    const row = nullifyEmpty(pick(req.body, SERVICE_FIELDS), ["full_description", "price_text", "duration_text", "image_url"]);
    if (!row.title?.trim()) throw httpError(400, "El título es obligatorio.");
    if (!row.short_description?.trim()) throw httpError(400, "La descripción corta es obligatoria.");
    row.slug = slugify(row.slug || row.title);
    if (!row.slug) throw httpError(400, "No se pudo generar un identificador (slug) válido.");

    if (row.display_order === undefined) {
      const { data: last } = await req.db
        .from("services")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);
      row.display_order = (last?.[0]?.display_order ?? 0) + 1;
    }

    const { data, error } = await req.db.from("services").insert([row]).select(SERVICE_SELECT);
    fromDb(error);
    res.status(201).json({ data: one(data, "Servicio") });
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const row = nullifyEmpty(pick(req.body, SERVICE_FIELDS), ["full_description", "price_text", "duration_text", "image_url"]);
    if (row.title !== undefined && !row.title.trim()) throw httpError(400, "El título es obligatorio.");
    if (row.short_description !== undefined && !row.short_description.trim()) {
      throw httpError(400, "La descripción corta es obligatoria.");
    }
    if (row.slug !== undefined) {
      row.slug = slugify(row.slug);
      if (!row.slug) throw httpError(400, "El identificador (slug) no es válido.");
    }

    const { data, error } = await req.db
      .from("services")
      .update(row)
      .eq("id", req.params.id)
      .select(SERVICE_SELECT);
    fromDb(error);
    res.json({ data: one(data, "Servicio") });
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const { data, error } = await req.db.from("services").delete().eq("id", req.params.id).select("id");
    fromDb(error);
    one(data, "Servicio");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

/** Body: { ids: [id1, id2, …] } in the desired order. */
export const reorderServices = async (req, res, next) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, "Se esperaba { ids: [...] }.");
    const results = await Promise.all(
      ids.map((id, i) => req.db.from("services").update({ display_order: i + 1 }).eq("id", id)),
    );
    results.forEach(({ error }) => fromDb(error));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ── Service highlights ─────────────────────────────────────────────────────────

const checkHighlight = (row, partial) => {
  if (row.item_type !== undefined && !HIGHLIGHT_TYPES.includes(row.item_type)) {
    throw httpError(400, `Tipo inválido. Usa: ${HIGHLIGHT_TYPES.join(", ")}.`);
  }
  if ((!partial || row.content !== undefined) && !row.content?.trim()) {
    throw httpError(400, "El contenido es obligatorio.");
  }
  if (row.title === "") row.title = null;
  return row;
};

export const createHighlight = async (req, res, next) => {
  try {
    const row = checkHighlight(pick(req.body, HIGHLIGHT_FIELDS), false);
    row.service_id = req.params.id;
    const { data, error } = await req.db.from("service_highlights").insert([row]).select();
    fromDb(error);
    res.status(201).json({ data: one(data, "Detalle") });
  } catch (err) {
    next(err);
  }
};

export const updateHighlight = async (req, res, next) => {
  try {
    const row = checkHighlight(pick(req.body, HIGHLIGHT_FIELDS), true);
    const { data, error } = await req.db
      .from("service_highlights")
      .update(row)
      .eq("id", req.params.id)
      .select();
    fromDb(error);
    res.json({ data: one(data, "Detalle") });
  } catch (err) {
    next(err);
  }
};

export const deleteHighlight = async (req, res, next) => {
  try {
    const { data, error } = await req.db.from("service_highlights").delete().eq("id", req.params.id).select("id");
    fromDb(error);
    one(data, "Detalle");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ── Testimonials ───────────────────────────────────────────────────────────────

const TESTIMONIAL_FIELDS = ["client_name", "client_role", "quote", "service_id", "is_featured", "display_order"];

const checkTestimonial = (row, partial) => {
  if ((!partial || row.client_name !== undefined) && !row.client_name?.trim()) {
    throw httpError(400, "El nombre del cliente es obligatorio.");
  }
  if ((!partial || row.quote !== undefined) && !row.quote?.trim()) {
    throw httpError(400, "El testimonio es obligatorio.");
  }
  return nullifyEmpty(row, ["client_role", "service_id"]);
};

export const listTestimonials = async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from("testimonials")
      .select("*")
      .order("display_order")
      .order("created_at");
    fromDb(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const createTestimonial = async (req, res, next) => {
  try {
    const row = checkTestimonial(pick(req.body, TESTIMONIAL_FIELDS), false);
    if (row.display_order === undefined) {
      const { data: last } = await req.db
        .from("testimonials")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);
      row.display_order = (last?.[0]?.display_order ?? 0) + 1;
    }
    const { data, error } = await req.db.from("testimonials").insert([row]).select();
    fromDb(error);
    res.status(201).json({ data: one(data, "Testimonio") });
  } catch (err) {
    next(err);
  }
};

export const updateTestimonial = async (req, res, next) => {
  try {
    const row = checkTestimonial(pick(req.body, TESTIMONIAL_FIELDS), true);
    const { data, error } = await req.db.from("testimonials").update(row).eq("id", req.params.id).select();
    fromDb(error);
    res.json({ data: one(data, "Testimonio") });
  } catch (err) {
    next(err);
  }
};

export const deleteTestimonial = async (req, res, next) => {
  try {
    const { data, error } = await req.db.from("testimonials").delete().eq("id", req.params.id).select("id");
    fromDb(error);
    one(data, "Testimonio");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

/** Body: { ids: [id1, id2, …] } in the desired order. */
export const reorderTestimonials = async (req, res, next) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, "Se esperaba { ids: [...] }.");
    const results = await Promise.all(
      ids.map((id, i) => req.db.from("testimonials").update({ display_order: i + 1 }).eq("id", id)),
    );
    results.forEach(({ error }) => fromDb(error));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// ── Images ─────────────────────────────────────────────────────────────────────

/** Rotates per EXIF, fits inside MAX_IMAGE_SIDE (never enlarges) and re-encodes as WebP. */
async function optimizeImage(buffer) {
  try {
    return await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw httpError(400, "No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP.");
  }
}

export const uploadImage = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw httpError(400, "No se recibió ninguna imagen.");
    if (!file.mimetype?.startsWith("image/")) throw httpError(400, "El archivo debe ser una imagen.");

    const optimized = await optimizeImage(file.buffer);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    const { error } = await req.db.storage.from("images").upload(path, optimized, {
      contentType: "image/webp",
      cacheControl: "31536000", // file names are unique, so they can be cached for a year
    });
    fromDb(error);

    const { data } = req.db.storage.from("images").getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
};
