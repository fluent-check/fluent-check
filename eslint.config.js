import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2025,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      // Level 2 rules: errors
      'eqeqeq': ['error', 'smart'],
      'no-var': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: false,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: true,
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
          message: 'Avoid "as unknown as" type assertions. Use proper type system patterns instead.',
        },
      ],

      // Level 1 rules: warnings
      'array-bracket-spacing': 'warn',
      'block-spacing': 'warn',
      'computed-property-spacing': 'warn',
      'eol-last': ['warn', 'always'],
      'keyword-spacing': 'warn',
      // TODO(rui): apply this later
      'max-len': ['warn', { code: 120, tabWidth: 2 }],
      'no-multiple-empty-lines': ['warn', { max: 1 }],
      'no-trailing-spaces': ['warn', { skipBlankLines: false }],
      'object-curly-spacing': 'warn',
      'quotes': ['warn', 'single', 'avoid-escape'],
      'space-before-blocks': ['warn', 'always'],
      'space-before-function-paren': ['warn', { anonymous: 'always', named: 'never' }],
      'space-in-parens': 'warn',
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'semi': ['warn', 'never'],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
      
      // Level 0 rules: disabled
      'no-console': 'off',
      'no-extra-parens': 'off', // we must disable the base rule as it can report incorrect errors
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/no-empty-object-type': 'off', // replaces @typescript-eslint/ban-types for {}
      '@typescript-eslint/no-wrapper-object-types': 'off', // replaces @typescript-eslint/ban-types for String, Number, etc.
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off', // TODO(rui): review this
    },
  },
  {
    // Test files: disable no-unused-expressions for Chai assertions
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      // TypeScript correctly infers types in generic functions, but the linter can't track it
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
]
