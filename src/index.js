#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.includes("pnpm")) return "pnpm";
    if (userAgent.includes("yarn")) return "yarn";
    if (userAgent.includes("bun")) return "bun";
  }
  return "npm";
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      // Rename _gitignore to .gitignore
      const finalDestPath =
        entry.name === "_gitignore"
          ? path.join(path.dirname(destPath), ".gitignore")
          : destPath;
      fs.copyFileSync(srcPath, finalDestPath);
    }
  }
}

async function main() {
  console.log("\n✨ Create HTML Elements Project\n");

  // Get project name
  const projectName = await prompt("Project name: ");
  if (!projectName) {
    console.error("Project name is required");
    process.exit(1);
  }

  const projectPath = path.join(process.cwd(), projectName);
  if (fs.existsSync(projectPath)) {
    console.error(`Directory ${projectName} already exists`);
    process.exit(1);
  }

  // Detect package manager
  const detected = detectPackageManager();
  const pmAnswer = await prompt(
    `Package manager? (npm/pnpm/yarn/bun) [${detected}]: `,
  );
  const packageManager = pmAnswer.trim() || detected;

  // Detect setup answer
  const setupAnswer = await prompt(
    "Setup type?\n  1. Bare HTML & CSS\n  2. HTML with Tailwind (includes Prettier)\nChoice [2]: ",
  );
  const useTailwind = !setupAnswer.trim() || setupAnswer === "2";
  const includeTailwind = useTailwind;

  rl.close();

  console.log("\n📦 Creating project...\n");

  // Copy base template
  const templatePath = path.join(__dirname, "..", "templates", "base");
  copyDirectory(templatePath, projectPath);

  // Ensure public directory exists
  const publicPath = path.join(projectPath, "public");
  fs.mkdirSync(publicPath, { recursive: true });

  // Copy assets (logo and favicon)
  const assetsPath = path.join(__dirname, "..", "assets");

  if (fs.existsSync(assetsPath)) {
    fs.copyFileSync(
      path.join(assetsPath, "logo.webp"),
      path.join(publicPath, "logo.webp"),
    );
    fs.copyFileSync(
      path.join(assetsPath, "favicon.png"),
      path.join(publicPath, "favicon.png"),
    );
  }

  // Copy tailwind-specific files if needed
  if (includeTailwind) {
    const tailwindTemplatePath = path.join(
      __dirname,
      "..",
      "templates",
      "tailwind",
    );

    // Copy vite.config.js
    fs.copyFileSync(
      path.join(tailwindTemplatePath, "vite.config.js"),
      path.join(projectPath, "vite.config.js"),
    );

    // Copy styles.css
    fs.copyFileSync(
      path.join(tailwindTemplatePath, "styles.css"),
      path.join(projectPath, "src", "styles.css"),
    );

    // Copy index.html
    fs.copyFileSync(
      path.join(tailwindTemplatePath, "index.html"),
      path.join(projectPath, "src", "index.html"),
    );

    // Copy element files
    const tailwindElements = ["head.html", "header.html", "feature.html", "footer.html"];
    for (const file of tailwindElements) {
      fs.copyFileSync(
        path.join(tailwindTemplatePath, file),
        path.join(projectPath, "src", "elements", file),
      );
    }
  }

  // Create prettier files if needed
  if (includeTailwind) {
    const prettierrc = {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: "es5",
      printWidth: 80,
      arrowParens: "always",
    };
    fs.writeFileSync(
      path.join(projectPath, ".prettierrc"),
      JSON.stringify(prettierrc, null, 2),
    );

    const prettierignore = `node_modules
dist
*.min.js
pnpm-lock.yaml
package-lock.json
yarn.lock`;
    fs.writeFileSync(path.join(projectPath, ".prettierignore"), prettierignore);
  }

  // Update package.json
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  packageJson.name = projectName;

  // Add dependencies based on choices
  if (includeTailwind) {
    packageJson.devDependencies["@tailwindcss/vite"] = "^4.1.16";
    packageJson.devDependencies.tailwindcss = "^4.1.16";
    packageJson.devDependencies.prettier = "^3.0.0";
    packageJson.scripts.format = 'prettier --write "src/**/*.{html,css,js}"';
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Install dependencies
  console.log("📥 Installing dependencies...\n");
  try {
    execSync(`${packageManager} install`, {
      cwd: projectPath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to install dependencies");
    process.exit(1);
  }

  // Success message
  console.log("\n✅ Project created successfully!\n");
  console.log("Next steps:\n");
  console.log(`  cd ${projectName}`);
  console.log(
    `  ${packageManager} ${packageManager === "npm" ? "run " : ""}dev\n`,
  );
}

main().catch(console.error);
