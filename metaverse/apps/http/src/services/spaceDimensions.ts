export function parseDimensions(dimensions: string) {
  const [rawWidth, rawHeight] = dimensions.split("x");
  const width = Number(rawWidth);
  const height = Number(rawHeight);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || width > 500 || height > 500) {
    return null;
  }

  return { width, height };
}
