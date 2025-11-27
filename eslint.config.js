import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['test/*.ts'],
        },
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
        allowNullableObject: false,
      }],

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
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'test/types/**'],
  }
)
