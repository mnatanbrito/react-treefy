import { readFileSync } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import {
  IMPORT_DECLARATION,
  IMPORT_DEFAULT_SPECIFIER,
  EXPORT_DEFAULT_DECLARATION,
  EXPORT_NAMED_DECLARATION,
  EXPORT_SPECIFIER,
  ARROW_FUNCTION_EXPRESSION,
  CLASS_DECLARATION,
  IMPORT_SPECIFIER,
  EXPRESSION_STATEMENT,
  CALL_EXPRESSION,
  JSX_ELEMENT,
  JSX_EXPRESSION_CONTAINER,
  IDENTIFIER,
  FUNCTION_DECLARATION
} from './nodeTypes';

/* parsing utils */
export default function isType(node, type) {
  if (!node) return false;

  return node.type === type;
}

export function isImportDeclaration(node) {
  return isType(node, IMPORT_DECLARATION);
}

export function isDefaultImport(node) {
  return isType(node, IMPORT_DEFAULT_SPECIFIER);
}

export function isNamedImport(node) {
  return isType(node, IMPORT_SPECIFIER);
}

export function isDefaultExport(node) {
  return isType(node, EXPORT_DEFAULT_DECLARATION);
}

export function isNamedExport(node) {
  return isType(node, EXPORT_NAMED_DECLARATION);
}

export function isExportSpecifier(node) {
  return isType(node, EXPORT_SPECIFIER);
}

export function isFunctionDeclaration(node) {
  return isType(node, FUNCTION_DECLARATION);
}

export function isClassDeclaration(node) {
  return isType(node, CLASS_DECLARATION);
}

export function isArrowFunctionExpression(node) {
  return isType(node, ARROW_FUNCTION_EXPRESSION);
}

export function isExpressionStatement(node) {
  return isType(node, EXPRESSION_STATEMENT);
}

export function isCallExpression(node) {
  return isType(node, CALL_EXPRESSION);
}

export function isJSXElement(node) {
  return isType(node, JSX_ELEMENT);
}

export function isJSXExpressionContainer(node) {
  return isType(node, JSX_EXPRESSION_CONTAINER);
}

export function isIdentifier(node) {
  return isType(node, IDENTIFIER);
}

export function isComponentName(name) {
  return /^([A-Z])+\w*/.test(name);
}

export function parseAst(filepath) {
  const ext = path.extname(filepath);
  // only allow js files
  if (ext !== '' && !isJavascriptExtension(ext)) {
    return 1;
  }

  if (path.extname(filepath) === '') {
    filepath += '.js';
  }

  const file = readFileSync(filepath, {
    encoding: 'utf8'
  });

  if (!file) {
    throw new Error('It was not possible to open the file!');
  }

  return parse(file, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties']
  });
}

/* path utils */
export function isJavascriptExtension(ext) {
  return /^\.js$/i.test(ext);
}

export function isRelativePath(path) {
  return /(^(\.\/)|^(\.\.\/)+)/gi.test(path);
}

/* misc */
export function isArrayEmpty(arr) {
  return !arr || arr.length === 0;
}

export function isNull(obj) {
  return !obj;
}

export function isReactDomImport(importName) {
  return /react\-dom/i.test(importName);
}

export function appendJsExtension(filename) {
  return path.extname(filename) === '.js' ? filename : `${filename}.js`;
}
