import fs from "fs";
import path from "path";

interface DataObject {
  [key: string]: any;
}

function escapeCsvValue(value: string | undefined): string {
  if (!value) return "";
  return value.includes(",") ? `"${value}"` : value;
}

function writeGtfsFile(
  filePath: string,
  fields: string[],
  dataObjects: DataObject[]
): void {
  const fullPath = path.resolve(filePath);
  const content = dataObjects.map((obj) => {
    return fields.map((field) => escapeCsvValue(obj[field])).join(",");
  });

  const header = fields.join(",");
  const output = [header, ...content].join("\n");

  fs.writeFileSync(fullPath, output);
}

export default writeGtfsFile;
