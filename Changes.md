# v1.1.0
* Fixed "Recusrive type is too deep and possibly infinite errors." This error existed in Typescript 4.1.5 and earlier, but was harder to trigger, requiring large complex state machines. Typescript 4.2.3 caused this to happen for smaller state machines. The root problem is that type multimaps expressed using index types required nested conditionals. To fix this, we now use use unions of key/value pair tuples to express the type map primitive. This allows us to build the map without conditionals and merely needs conditionals for lookups (which aren't in the "critical path" of the type builder).
* We now use mapped type literals (e.g. ```ErrorBrand<`${S} is not a state`>```) in our errors to give you very direct and clear error messages as to the exact type causing the error.
* The typemap changes caused a type widening issue in inferring the state return value of action handlers. You now need to put `as const` after all your returned states. See `Readme.md` example. This may be a breaking change if you weren't doing this before, but will be compatible if we're able to remove this restriction in the future.

# v1.0.6
* Fixed Webpack issues that made v1.0.0 unusable.
* Added tests, including compile-time tests that assert you indeed get compilation failures for illegal uses. `// @ts-expect-error` is very handy for testing complex types.

# v1.0.0
* Major rewrite of ts-checked-fsm. Removed `validateState` callback and `ValidatedState` vs `UnvalidatedState` type, which was a cool proof of concept but a really annoying API.
* Introduced actions and action handlers into builder pattern. The final product of the `stateMachine` builder is now simply a `nextState` function. Call it with the current state and an action and it returns the state resulting from the appropriate action handler.

# v0.3.0
* Initial public release of `ts-checked-fsm`.
