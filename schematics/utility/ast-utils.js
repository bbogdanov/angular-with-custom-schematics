"use strict";
exports.__esModule = true;
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var ts = require("typescript");
var change_1 = require("./change");
var route_utils_1 = require("./route-utils");
/**
 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
 * @param node
 * @param kind
 * @param max The maximum number of items to return.
 * @return all nodes of kind, or [] if none is found
 */
function findNodes(node, kind, max) {
    if (max === void 0) { max = Infinity; }
    if (!node || max == 0) {
        return [];
    }
    var arr = [];
    if (node.kind === kind) {
        arr.push(node);
        max--;
    }
    if (max > 0) {
        for (var _i = 0, _a = node.getChildren(); _i < _a.length; _i++) {
            var child = _a[_i];
            findNodes(child, kind, max).forEach(function (node) {
                if (max > 0) {
                    arr.push(node);
                }
                max--;
            });
            if (max <= 0) {
                break;
            }
        }
    }
    return arr;
}
exports.findNodes = findNodes;
/**
 * Get all the nodes from a source.
 * @param sourceFile The source file object.
 * @returns {Observable<ts.Node>} An observable of all the nodes in the source.
 */
function getSourceNodes(sourceFile) {
    var nodes = [sourceFile];
    var result = [];
    while (nodes.length > 0) {
        var node = nodes.shift();
        if (node) {
            result.push(node);
            if (node.getChildCount(sourceFile) >= 0) {
                nodes.unshift.apply(nodes, node.getChildren());
            }
        }
    }
    return result;
}
exports.getSourceNodes = getSourceNodes;
function findNode(node, kind, text) {
    if (node.kind === kind && node.getText() === text) {
        // throw new Error(node.getText());
        return node;
    }
    var foundNode = null;
    ts.forEachChild(node, function (childNode) {
        foundNode = foundNode || findNode(childNode, kind, text);
    });
    return foundNode;
}
exports.findNode = findNode;
/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
function nodesByPosition(first, second) {
    return first.pos - second.pos;
}
/**
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 *
 * @param nodes insert after the last occurence of nodes
 * @param toInsert string to insert
 * @param file file to insert changes into
 * @param fallbackPos position to insert if toInsert happens to be the first occurence
 * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
 * @return Change instance
 * @throw Error if toInsert is first occurence but fall back is not set
 */
function insertAfterLastOccurrence(nodes, toInsert, file, fallbackPos, syntaxKind) {
    var lastItem = nodes.sort(nodesByPosition).pop();
    if (!lastItem) {
        throw new Error();
    }
    if (syntaxKind) {
        lastItem = findNodes(lastItem, syntaxKind).sort(nodesByPosition).pop();
    }
    if (!lastItem && fallbackPos == undefined) {
        throw new Error("tried to insert " + toInsert + " as first occurence with no fallback position");
    }
    var lastItemPosition = lastItem ? lastItem.end : fallbackPos;
    return new change_1.InsertChange(file, lastItemPosition, toInsert);
}
exports.insertAfterLastOccurrence = insertAfterLastOccurrence;
function getContentOfKeyLiteral(_source, node) {
    if (node.kind == ts.SyntaxKind.Identifier) {
        return node.text;
    }
    else if (node.kind == ts.SyntaxKind.StringLiteral) {
        return node.text;
    }
    else {
        return null;
    }
}
exports.getContentOfKeyLiteral = getContentOfKeyLiteral;
function _angularImportsFromNode(node, _sourceFile) {
    var ms = node.moduleSpecifier;
    var modulePath;
    switch (ms.kind) {
        case ts.SyntaxKind.StringLiteral:
            modulePath = ms.text;
            break;
        default:
            return {};
    }
    if (!modulePath.startsWith('@angular/')) {
        return {};
    }
    if (node.importClause) {
        if (node.importClause.name) {
            // This is of the form `import Name from 'path'`. Ignore.
            return {};
        }
        else if (node.importClause.namedBindings) {
            var nb = node.importClause.namedBindings;
            if (nb.kind == ts.SyntaxKind.NamespaceImport) {
                // This is of the form `import * as name from 'path'`. Return `name.`.
                return _a = {},
                    _a[nb.name.text + '.'] = modulePath,
                    _a;
            }
            else {
                // This is of the form `import {a,b,c} from 'path'`
                var namedImports = nb;
                return namedImports.elements
                    .map(function (is) { return is.propertyName ? is.propertyName.text : is.name.text; })
                    .reduce(function (acc, curr) {
                    acc[curr] = modulePath;
                    return acc;
                }, {});
            }
        }
        return {};
    }
    else {
        // This is of the form `import 'path';`. Nothing to do.
        return {};
    }
    var _a;
}
function getDecoratorMetadata(source, identifier, module) {
    var angularImports = findNodes(source, ts.SyntaxKind.ImportDeclaration)
        .map(function (node) { return _angularImportsFromNode(node, source); })
        .reduce(function (acc, current) {
        for (var _i = 0, _a = Object.keys(current); _i < _a.length; _i++) {
            var key = _a[_i];
            acc[key] = current[key];
        }
        return acc;
    }, {});
    return getSourceNodes(source)
        .filter(function (node) {
        return node.kind == ts.SyntaxKind.Decorator
            && node.expression.kind == ts.SyntaxKind.CallExpression;
    })
        .map(function (node) { return node.expression; })
        .filter(function (expr) {
        if (expr.expression.kind == ts.SyntaxKind.Identifier) {
            var id = expr.expression;
            return id.getFullText(source) == identifier
                && angularImports[id.getFullText(source)] === module;
        }
        else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
            // This covers foo.NgModule when importing * as foo.
            var paExpr = expr.expression;
            // If the left expression is not an identifier, just give up at that point.
            if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
                return false;
            }
            var id = paExpr.name.text;
            var moduleId = paExpr.expression.getText(source);
            return id === identifier && (angularImports[moduleId + '.'] === module);
        }
        return false;
    })
        .filter(function (expr) { return expr.arguments[0]
        && expr.arguments[0].kind == ts.SyntaxKind.ObjectLiteralExpression; })
        .map(function (expr) { return expr.arguments[0]; });
}
exports.getDecoratorMetadata = getDecoratorMetadata;
function addSymbolToNgModuleMetadata(source, ngModulePath, metadataField, symbolName, importPath) {
    if (importPath === void 0) { importPath = null; }
    var nodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
    var node = nodes[0]; // tslint:disable-line:no-any
    // Find the decorator declaration.
    if (!node) {
        return [];
    }
    // Get all the children property assignment of object literals.
    var matchingProperties = node.properties
        .filter(function (prop) { return prop.kind == ts.SyntaxKind.PropertyAssignment; })
        .filter(function (prop) {
        var name = prop.name;
        switch (name.kind) {
            case ts.SyntaxKind.Identifier:
                return name.getText(source) == metadataField;
            case ts.SyntaxKind.StringLiteral:
                return name.text == metadataField;
        }
        return false;
    });
    // Get the last node of the array literal.
    if (!matchingProperties) {
        return [];
    }
    if (matchingProperties.length == 0) {
        // We haven't found the field in the metadata declaration. Insert a new field.
        var expr = node;
        var position_1;
        var toInsert_1;
        if (expr.properties.length == 0) {
            position_1 = expr.getEnd() - 1;
            toInsert_1 = "  " + metadataField + ": [" + symbolName + "]\n";
        }
        else {
            node = expr.properties[expr.properties.length - 1];
            position_1 = node.getEnd();
            // Get the indentation of the last element, if any.
            var text = node.getFullText(source);
            var matches = text.match(/^\r?\n\s*/);
            if (matches.length > 0) {
                toInsert_1 = "," + matches[0] + metadataField + ": [" + symbolName + "]";
            }
            else {
                toInsert_1 = ", " + metadataField + ": [" + symbolName + "]";
            }
        }
        if (importPath !== null) {
            return [
                new change_1.InsertChange(ngModulePath, position_1, toInsert_1),
                route_utils_1.insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
            ];
        }
        else {
            return [new change_1.InsertChange(ngModulePath, position_1, toInsert_1)];
        }
    }
    var assignment = matchingProperties[0];
    // If it's not an array, nothing we can do really.
    if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return [];
    }
    var arrLiteral = assignment.initializer;
    if (arrLiteral.elements.length == 0) {
        // Forward the property.
        node = arrLiteral;
    }
    else {
        node = arrLiteral.elements;
    }
    if (!node) {
        console.log('No app module found. Please add your new class to your component.');
        return [];
    }
    if (Array.isArray(node)) {
        var nodeArray = node;
        var symbolsArray = nodeArray.map(function (node) { return node.getText(); });
        if (symbolsArray.includes(symbolName)) {
            return [];
        }
        node = node[node.length - 1];
    }
    var toInsert;
    var position = node.getEnd();
    if (node.kind == ts.SyntaxKind.ObjectLiteralExpression) {
        // We haven't found the field in the metadata declaration. Insert a new
        // field.
        var expr = node;
        if (expr.properties.length == 0) {
            position = expr.getEnd() - 1;
            toInsert = "  " + metadataField + ": [" + symbolName + "]\n";
        }
        else {
            node = expr.properties[expr.properties.length - 1];
            position = node.getEnd();
            // Get the indentation of the last element, if any.
            var text = node.getFullText(source);
            if (text.match('^\r?\r?\n')) {
                toInsert = "," + text.match(/^\r?\n\s+/)[0] + metadataField + ": [" + symbolName + "]";
            }
            else {
                toInsert = ", " + metadataField + ": [" + symbolName + "]";
            }
        }
    }
    else if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
        // We found the field but it's empty. Insert it just before the `]`.
        position--;
        toInsert = "" + symbolName;
    }
    else {
        // Get the indentation of the last element, if any.
        var text = node.getFullText(source);
        if (text.match(/^\r?\n/)) {
            toInsert = "," + text.match(/^\r?\n(\r?)\s+/)[0] + symbolName;
        }
        else {
            toInsert = ", " + symbolName;
        }
    }
    if (importPath !== null) {
        return [
            new change_1.InsertChange(ngModulePath, position, toInsert),
            route_utils_1.insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
        ];
    }
    return [new change_1.InsertChange(ngModulePath, position, toInsert)];
}
exports.addSymbolToNgModuleMetadata = addSymbolToNgModuleMetadata;
/**
 * Custom function to insert a declaration (component, pipe, directive)
 * into NgModule declarations. It also imports the component.
 */
function addDeclarationToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'declarations', classifiedName, importPath);
}
exports.addDeclarationToModule = addDeclarationToModule;
/**
 * Custom function to insert an NgModule into NgModule imports. It also imports the module.
 */
function addImportToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'imports', classifiedName, importPath);
}
exports.addImportToModule = addImportToModule;
/**
 * Custom function to insert a provider into NgModule. It also imports it.
 */
function addProviderToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'providers', classifiedName, importPath);
}
exports.addProviderToModule = addProviderToModule;
/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
function addExportToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'exports', classifiedName, importPath);
}
exports.addExportToModule = addExportToModule;
/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
function addBootstrapToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'bootstrap', classifiedName, importPath);
}
exports.addBootstrapToModule = addBootstrapToModule;
/**
 * Determine if an import already exists.
 */
function isImported(source, classifiedName, importPath) {
    var allNodes = getSourceNodes(source);
    var matchingNodes = allNodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.ImportDeclaration; })
        .filter(function (imp) { return imp.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral; })
        .filter(function (imp) {
        return imp.moduleSpecifier.text === importPath;
    })
        .filter(function (imp) {
        if (!imp.importClause) {
            return false;
        }
        var nodes = findNodes(imp.importClause, ts.SyntaxKind.ImportSpecifier)
            .filter(function (n) { return n.getText() === classifiedName; });
        return nodes.length > 0;
    });
    return matchingNodes.length > 0;
}
exports.isImported = isImported;
