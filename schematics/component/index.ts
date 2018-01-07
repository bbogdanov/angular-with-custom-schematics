import { normalize } from '@angular-devkit/core';

import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import 'rxjs/add/operator/merge';

export default function(options: any): Rule {

  return (host: Tree, context: SchematicContext) => {
    options.path = options.path ? normalize(options.path) : options.path;

    const templateSource = apply(url('./files'), [
      template({
        ...options,
      }),
    ]);

    return chain([
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
