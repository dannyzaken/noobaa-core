/* Copyright (C) 2016 NooBaa */
'use strict';

const CURRENT_YEAR = new Date().getFullYear();

module.exports = {
  // prevent from looking up other config files in containing folders
  root: true,

  // Our environment is node.js
  env: {
    node: true,
    es2022: true,
    jest: true,
  },

  // See https://eslint.org/docs/latest/user-guide/configuring/language-options#specifying-environments
  parserOptions: {
    ecmaVersion: 13, // es2022
  },

  plugins: [
    // eslint-plugin-header validates copyright header
    'header',
  ],

  // RULES METHODOLOGY:
  // -----------------
  // we turn ON all of eslint rules by extending eslint:all
  // we selectively override the rules we want to remove or change.
  // See http://eslint.org/docs/user-guide/configuring#using-eslintall

  extends: ['eslint:all', 'prettier'],

  rules: {
    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    // TODO FIX                                                         //
    //                                                                  //
    // Probably best to fix these once we get to it                     //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    'require-atomic-updates': 'off',

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    // ERROR                                                            //
    //                                                                  //
    // The default is error, so these are just for passing options      //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    // verify every file contains our copyright header
    'header/header': [
      'error',
      'block',
      [
        {
          template: ` Copyright (C) ${CURRENT_YEAR} NooBaa `,
          pattern: ' Copyright \\(C\\) 20\\d{2} NooBaa ',
        },
      ],
    ],

    // maximum number of code paths in a function
    // TODO eslint complexity should be reduced to ~10 instead of 35
    complexity: ['off', 35],

    // must use self=this and not any other alternatives
    'consistent-this': ['error', 'self'],

    // allow missing curly braces only for one liners such as if (cond) return;
    curly: ['error', 'multi-line'],

    // max depth of blocks in a function
    // TODO eslint max-depth of blocks should be reduced to ~3 instead of 5
    'max-depth': ['error', 5],

    // max classed per file
    'max-classes-per-file': 'off',

    // max file length is 300 by default, we accept longer files
    'max-lines': ['off'],

    // max lines per function, default is 50
    'max-lines-per-function': ['off', 400],

    // prefer small number of params to functions, otherwise send object
    // TODO eslint max-params per function should be reduced to ~4 instead of 7
    'max-params': ['off', 7],

    // max statements in function
    // TODO eslint max-statements per function should be reduced to ~40 instead of 60
    'max-statements': ['off', 60],

    // don't assign inside a condition, separate the lines for clarity
    'no-cond-assign': ['error', 'always'],

    // don't allow the code to leave unused variables, this prevents typos in many cases
    'no-unused-vars': ['error', { vars: 'all', args: 'none' }],

    // don't use assignments inside return statements, use separate statements.
    'no-return-assign': ['error', 'always'],

    // do not allow code using variables before they are defined and initialized,
    // but ok for functions since function decelerations are loaded before the code runs
    'no-use-before-define': ['error', 'nofunc'],

    // we prefer single var statement per variable
    'one-var': ['error', 'never'],

    // warn on using ++ operator, should replace with +=1
    // to avoid shenanigans of the value returned before/after the action
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],

    'arrow-body-style': ['error', 'as-needed'],

    // prefer to use function deceleration (function foo() {})
    // instead of expression (foo = function() {})
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],

    'prefer-const': [
      'error',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: false,
      },
    ],

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    // WARN                                                             //
    //                                                                  //
    // These should be a temporary state, as warnings are futile.       //
    // We should eventually decide to change either to error or off.    //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    //Hooraay!!! No Warnings

    //////////////////////////////////////////////////////////////////////
    //                                                                  //
    // OFF                                                              //
    //                                                                  //
    // We decided that these rules are too anal for our taste           //
    //                                                                  //
    //////////////////////////////////////////////////////////////////////

    // camelcase is a religion. we were born differently.
    camelcase: 'off',

    // Example: /=$/ is not like /\=$/ which the eslint expects
    // This is not a relevant rule, we added it after the signature_utils query parsing errors
    'no-div-regex': 'off',

    //not forcing u. as part of a unicode regexp handling
    'require-unicode-regexp': 'off',

    'capitalized-comments': 'off',

    // not enforcing all class methods to use 'this'
    'class-methods-use-this': 'off',

    // consistent return does not allow to write promises code very easily
    // because in many cases there are conditions to running a promise,
    // and otherwise the expected behavior is to simply continue.
    'consistent-return': 'off',

    // allowing anonymous functions, used a lot for promises
    'func-names': 'off',

    // allow short variable names like '_' or 'P' etc. use with care.
    'id-length': 'off',

    // not forcing initialization of variables
    'init-declarations': 'off',

    // directive means 'use strict', we don't enforce lines around
    'lines-around-directive': 'off',

    // we don't enforce comments to above/after the line, both work ok
    'line-comment-position': 'off',

    // use any comment style, just write comments
    'multiline-comment-style': 'off',

    // newlines to separate vars and return are not productive
    'newline-after-var': 'off',
    'newline-before-return': 'off',

    // using console in node.js is cool
    'no-console': 'off',

    // continue in loops is better off avoided for readability
    // prefer to use a function with returns and call from the loop
    // TODO eslint no-continue should be warn/error
    'no-continue': 'off',

    // avoid redundant 'else' when using return statements in all cases
    'no-else-return': 'off',

    // short comments in-line are not great but sometimes make a lot of sense
    'no-inline-comments': 'off',

    // we live for magic numbers
    'no-magic-numbers': 'off',

    // prefer to avoid reassigning to function params and use a new variable
    'no-param-reassign': 'off',

    // using process features on nodejs is expected
    'no-process-exit': 'off',
    'no-process-env': 'off',

    // allow usage of sync functions like fs.readFileSync() etc.
    'no-sync': 'off',

    // allowing (x ? y : z) it's a discouraged form but everyone are used to it
    'no-ternary': 'off',

    // using undefined on nodejs is safe. you cannot override it. you can try. it won't work.
    'no-undefined': 'off',

    // we do allow _name or name_ as identifiers
    'no-underscore-dangle': 'off',

    // turn off todo/fixme comments - will grep it to a different report
    'no-warning-comments': 'off',

    // prefer using x={a,b} over x={a:a, b:b} but too much to fix
    'object-shorthand': 'off',

    // prefer using arrow functions for callbacks, but too much to fix
    'prefer-arrow-callback': 'off',

    // prefer using arrow functions for callbacks, but too much to fix
    'prefer-named-capture-group': 'off',

    // we prefer using destructuring, but too much to fix
    'prefer-destructuring': 'off',

    'prefer-spread': 'off',
    'prefer-reflect': 'off',
    'prefer-rest-params': 'off',

    // prefer using string template over string concatenation, but too much to fix
    'prefer-template': 'off',

    'require-jsdoc': 'off',
    'sort-keys': 'off',

    // don't verify the structure of jsdoc comments. let them be for now.
    'valid-jsdoc': ['off', { requireReturn: false }],

    // accept var deceleration in mid function, since we already check used before defined
    'vars-on-top': 'off',

    // Allow await in the body of loops.
    'no-await-in-loop': 'off',

    // Allow async function without await, for `return P.map(...)`
    'require-await': 'off',

    'no-promise-executor-return': 'off',

    // we prefer not to adopt the logical assignment operators from ES2020
    'logical-assignment-operators': 'off',
  },
};
