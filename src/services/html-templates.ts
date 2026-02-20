import fs from "fs";
import path from "path";

const templatesDir = path.resolve(process.cwd(), "templates");
const cache = new Map<string, string>();

function loadTemplate(name: string): string {
  if (cache.has(name)) {
    return cache.get(name) as string;
  }

  const filePath = path.join(templatesDir, `${name}.html`);
  const content = fs.readFileSync(filePath, "utf-8");
  cache.set(name, content);
  return content;
}

export function renderTemplate(
  name: string,
  variables: Record<string, string>
): string {
  let template = loadTemplate(name);

  for (const [key, value] of Object.entries(variables)) {
    template = template.split(`{{${key}}}`).join(value);
  }

  return template;
}
