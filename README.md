# Custom schematics library for Angular CLI

Example how to build a custom schematics library for Angular CLI.

[![License](https://img.shields.io/npm/l/@angular-devkit/core.svg)](https://github.com/angular/devkit/blob/master/LICENSE) 

### Useful links
|[Angular Devkit](https://github.com/angular/devkit) | [Angular CLI](http://github.com/angular/angular-cli) 
|---|---|

# Getting started

  1. `npm run iboth`  *in root directory*
  2. `cd ./foo/src/app`
  3. `ng g c {name} -c=@schematics/custom`   
      OR  
      `ng generate component {name} --collection=@schematics/custom`

### Adding more files for generation
  1. Open `./schematics/component/files/___path__/__name@dasherize@if-flat__`
  2. Create new file with name ` __name@dasherize__.{whatever}.{file extention}` ex: ` __name@dasherize__.test.ts`
  3. Get back at root directory
  4. run `npm run rboth`
  5. repeate actions from **Getting started**

