/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, module, __dirname */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// apps/mobile is one member of the root npm workspace: dependencies hoist to the root node_modules
// and @klokka/core, @klokka/tokens and @klokka/api-client are symlinks into packages/*.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so an edit inside packages/* hot-reloads the app.
config.watchFolders = [workspaceRoot];

// Watching the workspace means crawling it, and some trees are hostile to that (Kulram's lesson):
// Maven `target/` output is hundreds of megabytes no bundle can import, Docker volumes may be
// root-owned (EACCES kills the watcher silently and serves a stale bundle forever), and worktree
// directories appear and vanish mid-crawl (ENOENT kills the dev server). blockList is what
// metro-file-map takes as its ignore pattern, so this governs the crawl and the watch, not only
// resolution. Every RegExp must share the default entries' (empty) flags.
const rootPattern = workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...config.resolver.blockList,
  new RegExp(`^${rootPattern}[\\\\/]apps[\\\\/]api[\\\\/].*[\\\\/]target[\\\\/].*`),
  new RegExp(`^${rootPattern}[\\\\/]apps[\\\\/](?:web|landing)[\\\\/]\\.next[\\\\/].*`),
  new RegExp(`^${rootPattern}[\\\\/]\\.claude[\\\\/].*`),
  new RegExp(`^${rootPattern}[\\\\/]\\.codegraph[\\\\/].*`),
  new RegExp(`^${rootPattern}[\\\\/]apps[\\\\/]mobile[\\\\/]android[\\\\/].*`),
];

// Resolve from the app first, then the hoisted root store; never walk further up the filesystem.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

// The shared packages publish TypeScript SOURCE through their package.json "exports" maps (no build
// step), so package-exports resolution must be on, with react-native winning the condition order.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'require', 'import', 'default'];
config.resolver.sourceExts = Array.from(new Set([...config.resolver.sourceExts, 'ts', 'tsx', 'cjs', 'mjs']));

module.exports = config;
