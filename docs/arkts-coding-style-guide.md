# ArkTS Coding Style Guide (Official Summary)

> Source: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-coding-style-guide
> Updated: 2026-04-30

## Naming

| Target | Style | Example |
|--------|-------|---------|
| Classes, enums, namespaces | UpperCamelCase | `User`, `UserType`, `Base64Utils` |
| Variables, methods, params | lowerCamelCase | `sendMsg`, `userName` |
| Constants, enum values | UPPER_SNAKE_CASE | `MAX_USER_SIZE`, `TEACHER` |
| Booleans | prefix `is/has/can/should` | `isFound`, `hasNext` |

- Use real English words, no pinyin
- Avoid single-letter identifiers
- Avoid negative boolean names (`isNoError` → `isError`)

## Formatting

- **Indentation**: 2 spaces (general), 4 spaces (line-wrap continuation). No tabs.
- **Line width**: ≤ 120 chars
- **Strings**: single quotes `'hello'`
- **Braces**: always use `{}` for `if/for/while/do`
- **Brace position**: opening `{` on same line as statement
- **else/catch**: same line as closing `}` → `} else {`
- **switch**: `case` and `default` indent one level (2 spaces)
- **Operators at line end** when wrapping: `a ||\n  b`
- **One variable per declaration** — no `let a = 1, b = 2;`
- **Object literals**: if >4 properties, all go on separate lines

## Spacing

- Space after keywords before `(`: `if (`, `for (`, `while (`
- NO space between function name and `(`: `foo(`, not `foo (`
- Space around binary operators: `a + b`, `x === y`
- Space around ternary: `cond ? a : b`
- Space after commas, NOT before
- No spaces inside `[]`

## Programming Practices

- Add access modifiers to class properties (`private`, `protected`, `public`)
- Don't omit leading/trailing `0` in floats: `0.5` not `.5`, `1.0` not `1.`
- Use `Number.isNaN(x)` — never `x === Number.NaN`
- Prefer array methods (`map`, `filter`, `forEach`) over `for` loops
- No assignments in conditionals: `if (x = 1)` → forbidden
- No `return`/`break`/`continue`/throw in `finally` blocks
- Avoid `ESObject` — use proper types
- Use `T[]` for arrays, not `Array<T>`
