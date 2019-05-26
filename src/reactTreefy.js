import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import traverse from '@babel/traverse';
import tree from 'pretty-tree';
import { filter, forEach, map } from 'lodash/collection';

import * as utils from './utils';

export class ReactTreefy {
  constructor(args) {
    this.args = args;
  }

  run() {
    const filename = path.resolve(this.args.path);

    if (!this.isValidPath(filename)) {
      console.log(chalk.red('Please, provide a valid component filename.'));
      return 1;
    }

    console.log(
      chalk.white.bgRed.bold(
        'Generates user-friendly component dependency tree 😋... \n'
      )
    );

    console.log(tree(this.buildPrettyTree(filename)));

    return 0;
  }

  buildPrettyTree(resolvedPath) {
    // set the current directory based on the folder of the current component
    process.chdir(path.dirname(resolvedPath));

    const { name, children } = this.parseComponent(resolvedPath);
    const parsedChildren = [];

    if (this.isLeafComponent(children)) {
      return this.generateLeafNode(name);
    }

    forEach(children || [], child => {
      // reset the current directory based on the folder of the current component to avoid resolving future references based on the last child components working dir
      process.chdir(path.dirname(resolvedPath));

      // only follow relative paths in order to not go inside third party code
      if (utils.isRelativePath(child.path)) {
        parsedChildren.push(this.buildPrettyTree(path.resolve(child.path)));
      } else {
        parsedChildren.push(this.generateLeafNode(child.component));
      }
    });

    return {
      label: name,
      nodes: parsedChildren
    };
  }

  parseComponent(componentPath) {
    let mainComponentName = '';
    const componentAst = utils.parseAst(componentPath);
    if (componentAst === 1) {
      console.log(chalk.red('Only .js files are allowed!'));
      return 1;
    }
    const possibleComponentImports = {};
    const componentChildren = [];
    const filename = path.basename(componentPath, '.js');
    let isLikelyRoot = false;
    let reactDomRenderExpression = '';

    traverse(componentAst, {
      enter({ node }) {
        // list the possible import declarations
        if (utils.isImportDeclaration(node)) {
          // if imported with default syntax
          if (utils.isDefaultImport(node.specifiers[0])) {
            if (utils.isRelativePath(node.source.value)) {
              try {
                fs.accessSync(
                  path.resolve(utils.appendJsExtension(node.source.value)),
                  fs.constants.R_OK
                );
                possibleComponentImports[node.specifiers[0].local.name] =
                  node.source.value;
              } catch (err) {
                possibleComponentImports[node.specifiers[0].local.name] = `${
                  node.source.value
                }/index.js`;
              }
            } else {
              possibleComponentImports[node.specifiers[0].local.name] =
                node.source.value;
            }

            if (utils.isReactDomImport(node.source.value)) {
              reactDomRenderExpression = 'reactdom.render';
            }
          }
          // if imported with named syntax
          else if (utils.isNamedImport(node.specifiers[0])) {
            forEach(node.specifiers || [], specifier => {
              if (utils.isRelativePath(node.source.value)) {
                try {
                  fs.accessSync(
                    path.resolve(utils.appendJsExtension(node.source.value)),
                    fs.constants.R_OK
                  );
                  possibleComponentImports[
                    specifier.local.name || specifier.imported.name
                  ] = node.source.value;
                } catch (err) {
                  possibleComponentImports[
                    specifier.local.name || specifier.imported.name
                  ] = `${node.source.value}/index.js`;
                }
              } else {
                possibleComponentImports[
                  specifier.local.name || specifier.imported.name
                ] = node.source.value;
              }
            });

            if (utils.isReactDomImport(node.source.value)) {
              reactDomRenderExpression = 'render';
            }
          }
          // if imported with namespace syntax
          else {
            // in case it finds css-like imports
            if (!utils.isArrayEmpty(node.specifiers)) {
              possibleComponentImports[node.specifiers[0].local.name] =
                node.source.value;
            }
          }
        }

        // list the possible children components
        if (
          utils.isJSXElement(node) &&
          utils.isComponentName(node.openingElement.name.name)
        ) {
          componentChildren.push(node.openingElement.name.name);

          // verify if any attribute of the jsx element points to an external components
          forEach(node.openingElement.attributes || [], attr => {
            if (
              utils.isJSXExpressionContainer(attr.value) &&
              utils.isComponentName(attr.value.expression.name)
            ) {
              componentChildren.push(attr.value.expression.name);
            }
          });
        }

        // list the exports through analysis of the export declaration
        if (utils.isDefaultExport(node)) {
          // if the component exports a variable declaration
          if (utils.isIdentifier(node.declaration)) {
            mainComponentName = node.declaration.name;
          }
          // if the component was declared like a class
          else if (utils.isClassDeclaration(node.declaration)) {
            mainComponentName = node.declaration.id.name;
          }
          // if the component exports an arrow function, then the componentName will be the filename
          else if (utils.isArrowFunctionExpression(node.declaration)) {
            mainComponentName = filename;
          } else if (utils.isCallExpression(node.declaration)) {
            mainComponentName = node.declaration.arguments[0].name;
          } else {
            mainComponentName = filename;
          }
        } else if (utils.isNamedExport(node)) {
          if (utils.isExportSpecifier(node.specifiers[0])) {
            mainComponentName =
              node.specifiers[0].exported.name || node.specifiers[0].local.name;
          }
        }

        // find if this is likely to be the root component
        if (!isLikelyRoot) {
          if (utils.isExpressionStatement(node)) {
            if (utils.isCallExpression(node.expression)) {
              if (reactDomRenderExpression) {
                const splitReactDomRenderExpression = reactDomRenderExpression.split(
                  '.'
                );
                if (node.expression.callee) {
                  if (
                    node.expression.callee.object &&
                    node.expression.callee.property &&
                    splitReactDomRenderExpression.length === 2 &&
                    new RegExp('reactdom', 'i').test(
                      node.expression.callee.object.name
                    ) &&
                    new RegExp('render', 'i').test(
                      node.expression.callee.property.name
                    )
                  ) {
                    isLikelyRoot = true;
                  } else if (
                    splitReactDomRenderExpression.length === 1 &&
                    new RegExp('render', 'i').test(node.expression.callee.name)
                  ) {
                    isLikelyRoot = true;
                  }
                }
              }
            }
          }
        }
      }
    });

    return {
      name: isLikelyRoot ? 'Root' : mainComponentName,
      children: map(
        filter(componentChildren, child => !!possibleComponentImports[child]),
        component => {
          return {
            component,
            path: possibleComponentImports[component]
          };
        }
      )
    };
  }

  isValidPath(filepath) {
    const ext = path.extname(filepath);
    return ext ? utils.isJavascriptExtension(ext) : true;
  }

  isLeafComponent(children) {
    return utils.isArrayEmpty(children);
  }

  generateLeafNode(component) {
    return {
      label: component
    };
  }
}
