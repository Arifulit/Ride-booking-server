export const parseMongoDuplicateError = (err: any): string | null => {
  if (!err) return null;
  const code = err.code ?? err?.number;
  if (code === 11000 || code === 11001) {
    const kv = err.keyValue ?? null;
    if (kv && typeof kv === "object") {
      const key = Object.keys(kv)[0];
      const pretty = (() => {
        const k = String(key).toLowerCase();
        if (k.includes("license")) return "License number";
        if (k.includes("plate")) return "Plate number";
        if (k.includes("email")) return "Email";
        if (k.includes("phone")) return "Phone number";
        return key;
      })();
      return `${pretty} already exists`;
    }

    // fallback: try parse message
    const msg = String(err.message || err.errmsg || "");
    const m = msg.match(/dup key:\s*\{\s*([^:]+)\s*:\s*["']?([^"'}]+)["']?\s*\}/i);
    if (m) {
      const key = String(m[1]).trim();
      const prettyKey = key.toLowerCase().includes("license")
        ? "License number"
        : key.toLowerCase().includes("plate")
        ? "Plate number"
        : key.toLowerCase().includes("email")
        ? "Email"
        : key.toLowerCase().includes("phone")
        ? "Phone number"
        : key;
      return `${prettyKey} already exists`;
    }

    return "Duplicate value already exists";
  }
  return null;
};

export default {};