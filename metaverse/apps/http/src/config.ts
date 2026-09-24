const secret = process.env.JWT_PASSWORD ?? process.env.JWT_SECRET;

if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_PASSWORD or JWT_SECRET is required in production");
}

export const JWT_PASSWORD = secret ?? "metaverse-local-dev-secret";
