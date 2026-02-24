export const PROJECT_TYPES = {
  NODE: "node",
  JAVASCRIPT: "javascript",
  HTML: "html",
  ANGULAR: "angular",
  PYTHON: "python",
  JAVA: "java",
  SPRINGBOOT: "springboot",
  GO: "go",
  RUST: "rust",
  DOTNET: "dotnet",
  CSHARP: "csharp",
  GROOVY: "groovy",
  ANDROID: "android",
  SWIFTUI: "swiftui",
  SWIFT: "swift",
  OBJECTIVE_C: "objective-c",
  CPP: "c++",
  JSON: "json",
  XML: "xml",
  YAML: "yaml",
  UNKNOWN: "unknown",
};

export const PROJECT_TYPE_VALUES = new Set(Object.values(PROJECT_TYPES));

export const CORE_PLATFORMS = Object.freeze({
  WEB: "web",
  MOBILE: "mobile",
  BACKEND: "backend",
});

export const CORE_PLATFORM_BY_PROJECT_TYPE = Object.freeze({
  angular: CORE_PLATFORMS.WEB,
  javascript: CORE_PLATFORMS.WEB,
  html: CORE_PLATFORMS.WEB,
  android: CORE_PLATFORMS.MOBILE,
  swiftui: CORE_PLATFORMS.MOBILE,
  swift: CORE_PLATFORMS.MOBILE,
  "objective-c": CORE_PLATFORMS.MOBILE,
  node: CORE_PLATFORMS.BACKEND,
  python: CORE_PLATFORMS.BACKEND,
  java: CORE_PLATFORMS.BACKEND,
  springboot: CORE_PLATFORMS.BACKEND,
  go: CORE_PLATFORMS.BACKEND,
  rust: CORE_PLATFORMS.BACKEND,
  dotnet: CORE_PLATFORMS.BACKEND,
  csharp: CORE_PLATFORMS.BACKEND,
  groovy: CORE_PLATFORMS.BACKEND,
  "c++": CORE_PLATFORMS.BACKEND,
  yaml: CORE_PLATFORMS.BACKEND,
  xml: CORE_PLATFORMS.BACKEND,
  json: CORE_PLATFORMS.BACKEND,
});

export const CORE_PLATFORM_TECHNOLOGY_HINTS = Object.freeze({
  [CORE_PLATFORMS.WEB]: new Set(["html", "css", "scss", "javascript", "typescript", "react", "vue", "angular"]),
  [CORE_PLATFORMS.MOBILE]: new Set(["android", "swift", "swiftui", "objective-c", "kotlin", "compose", "flutter"]),
  [CORE_PLATFORMS.BACKEND]: new Set(["node", "python", "java", "springboot", "go", "rust", "dotnet", "csharp", "groovy", "json", "yaml", "xml"]),
});

export const SIGNAL_DETECTORS = [
  { signal: "package.json", ecosystem: PROJECT_TYPES.NODE, type: "file" },
  { signal: "jsconfig.json", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "file" },
  { signal: "*.js", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.mjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.cjs", ecosystem: PROJECT_TYPES.JAVASCRIPT, type: "tree-extension" },
  { signal: "*.html", ecosystem: PROJECT_TYPES.HTML, type: "tree-extension" },
  { signal: "angular.json", ecosystem: PROJECT_TYPES.ANGULAR, type: "file" },
  { signal: "@angular/core", ecosystem: PROJECT_TYPES.ANGULAR, type: "package-dependency" },
  { signal: "pyproject.toml", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "requirements.txt", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "Pipfile", ecosystem: PROJECT_TYPES.PYTHON, type: "file" },
  { signal: "pom.xml", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "build.gradle", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "build.gradle.kts", ecosystem: PROJECT_TYPES.JAVA, type: "file" },
  { signal: "pom.xml::<artifactId>spring-boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "build.gradle::org.springframework.boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "build.gradle.kts::org.springframework.boot", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "file-contains" },
  { signal: "src/main/resources/application.properties", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "path" },
  { signal: "src/main/resources/application.yml", ecosystem: PROJECT_TYPES.SPRINGBOOT, type: "path" },
  { signal: "go.mod", ecosystem: PROJECT_TYPES.GO, type: "file" },
  { signal: "Cargo.toml", ecosystem: PROJECT_TYPES.RUST, type: "file" },
  { signal: "*.csproj", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
  { signal: "*.sln", ecosystem: PROJECT_TYPES.DOTNET, type: "glob" },
  { signal: "*.cs", ecosystem: PROJECT_TYPES.CSHARP, type: "tree-extension" },
  { signal: "*.groovy", ecosystem: PROJECT_TYPES.GROOVY, type: "tree-extension" },
  { signal: "app/src/main/AndroidManifest.xml", ecosystem: PROJECT_TYPES.ANDROID, type: "path" },
  { signal: "AndroidManifest.xml", ecosystem: PROJECT_TYPES.ANDROID, type: "path" },
  { signal: "build.gradle::com.android.application", ecosystem: PROJECT_TYPES.ANDROID, type: "file-contains" },
  { signal: "build.gradle.kts::com.android.application", ecosystem: PROJECT_TYPES.ANDROID, type: "file-contains" },
  { signal: "Package.swift", ecosystem: PROJECT_TYPES.SWIFT, type: "file" },
  { signal: "*.swift", ecosystem: PROJECT_TYPES.SWIFT, type: "tree-extension" },
  { signal: "*.swift::import SwiftUI", ecosystem: PROJECT_TYPES.SWIFTUI, type: "tree-extension-contains" },
  { signal: "*.m", ecosystem: PROJECT_TYPES.OBJECTIVE_C, type: "tree-extension" },
  { signal: "*.mm", ecosystem: PROJECT_TYPES.OBJECTIVE_C, type: "tree-extension" },
  { signal: "CMakeLists.txt", ecosystem: PROJECT_TYPES.CPP, type: "file" },
  { signal: "*.cpp", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.cxx", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.cc", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.hpp", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
  { signal: "*.hxx", ecosystem: PROJECT_TYPES.CPP, type: "tree-extension" },
];

export const TREE_SCAN_MAX_DEPTH = 5;
export const TREE_SCAN_MAX_FILES = 1500;
export const TREE_CONTENT_READ_MAX_BYTES = 1600;

export const EXTENSION_TECHNOLOGY_MAP = Object.freeze({
  ".js": ["js"], ".mjs": ["js"], ".cjs": ["js"], ".ts": ["ts", "typescript"],
  ".tsx": ["ts", "typescript", "react"], ".jsx": ["react", "js"], ".html": ["html"],
  ".css": ["css"], ".scss": ["scss", "css"], ".vue": ["vue", "js"], ".yaml": ["yaml"],
  ".yml": ["yaml"], ".json": ["json"], ".xml": ["xml"], ".md": ["markdown"], ".py": ["python"],
  ".java": ["java"], ".go": ["go"], ".rs": ["rust"], ".cs": ["csharp", "dotnet"], ".swift": ["swift"],
  ".m": ["objective-c"], ".mm": ["objective-c"], ".cpp": ["c++"], ".cxx": ["c++"], ".cc": ["c++"],
  ".hpp": ["c++"], ".hxx": ["c++"],
});

export const PROJECT_TECH_STOP_WORDS = new Set(["ai", "build", "file", "format", "git", "path", "reason", "src", "main"]);
export const SHORT_TECH_TOKEN_ALLOWLIST = new Set(["go", "ui"]);
export const MAX_PROJECT_TECHNOLOGIES = 4;
export const TECHNOLOGY_CANONICAL_MAP = Object.freeze({ js: "javascript", ts: "typescript", md: "markdown" });
export const TECHNOLOGY_ALLOWLIST = new Set([
  ...Object.values(PROJECT_TYPES),
  "typescript", "html", "css", "scss", "react", "vue", "yaml", "json", "xml", "markdown",
]);

export const IGNORED_SCAN_DIR_NAMES = new Set([
  ".git", "log", "logs", "dist", "bin", "dist-packages", "lib", "libs", "library", "libraries", "packages",
  "site-packages", "node_modules", "vendor", "target", "build", "out", "coverage", "test", "tests", "__tests__",
  "spec", ".next", ".nuxt", ".cache", "__pycache__", ".venv", "venv",
]);
