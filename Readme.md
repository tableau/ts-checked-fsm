# ts-checked-fsm

![Community Supported](https://img.shields.io/badge/Support%20Level-Community%20Supported-457387.svg)

ts-checked-fsm provides compile tile validation of state machine transitions leveraging Typescript's powerful type system.

* [Overview](#overview)
    * [Example](#example)
    * [Notes](#notes)
* [Get Started](#get-started)
    * [Requirements](#requirements)
    * [Installation](#installation)
    * [Building](#building)
* [Contributions](#contributions)

# Overview
This library provides a builder pattern API for you declare a finite state machine as a set of states, actions, and transitions, and action handlers. The API is somewhat comparable to other state machine libraries, like XState with one major difference: ts-checked-fsm validates that your state machine is internally consistent and will fail compilation if not.

Examples of things that fail to compile:
  * You declare transitions between non-existent states
  * You declare the same state more than once
  * You declare a handler for the same state and action more than once
  * You declare a handler for a state or action that doesn't exist
  * A handler returns type that doesn't match a declared state
  * A handler for state c returns a state n for which there is no transition from c to n
  * You forget a handler for a any non-terminal state

The library uses Error branding and intentionally causes failed type assignments to give you quasi-human-readable error messages. There is a ton of type system devil-magic going on here to make all of this happen.

## Example
```ts
  type MoneyPayload = {
      moneyInserted: number,
  };

  type ChangePayload = {
      changeRemaining: number,
  };

  type InsertMoneyActionPayload = {
      money: number,
  };

  const { nextState } = stateMachine()
      .state('idle')
      .state<'get-money', MoneyPayload>('get-money')
      .state<'vend', ChangePayload>('vend')
      .state<'dispense-change', ChangePayload>('dispense-change')
      .transition('idle', 'get-money')
      .transition('get-money', 'get-money')
      .transition('get-money', 'vend')
      .transition('vend', 'dispense-change')
      .transition('dispense-change', 'dispense-change')
      .transition('dispense-change', 'idle')
      .action<'insert-money', InsertMoneyActionPayload>('insert-money')
      .action<'vend-soda'>('vend-soda')
      .action<'clock-tick'>('clock-tick')
      .actionHandler('idle', 'insert-money', (_c, a) => {
          return {
              stateName: 'get-money',
              moneyInserted: a.money,
          };
      })
      .actionHandler('get-money', 'insert-money', (c, a) => {
          return {
              stateName: 'get-money',
              moneyInserted: c.moneyInserted + a.money
          };
      })
      .actionHandler('get-money', 'vend-soda', (c, _a) => {
          return c.moneyInserted >= 50 ? {
              stateName: 'vend',
              changeRemaining: c.moneyInserted - 50
          } : c;
      })
      .actionHandler('vend', 'clock-tick', (c, _a) => {
          return {
              stateName: 'dispense-change',
              changeRemaining: c.changeRemaining
          };
      })
      .actionHandler('dispense-change', 'clock-tick', (c, _a) => {
          const coinVal = c.changeRemaining >= 25
              ? 25
              : c.changeRemaining >= 10
              ? 10
              : c.changeRemaining >= 5
              ? 5
              : 1;

          return c.changeRemaining - coinVal > 0 ? {
              stateName: 'dispense-change',
              changeRemaining: c.changeRemaining - coinVal
          } : {
              stateName: 'idle'
          };
      })
      .done();

      let n = nextState({stateName: 'idle'}, { actionName: 'clock-tick'});
      // Idle state doesn't repsond to clock-tick, so state is unchanged
      expect(n).toEqual({stateName: 'idle'});
      n = nextState({stateName: 'idle'}, { actionName: 'insert-money', money: 25})
      expect(n).toEqual({stateName: 'get-money', moneyInserted: 25});
      n = nextState(n, { actionName: 'insert-money', money: 25});
      expect(n).toEqual({stateName: 'get-money', moneyInserted: 50});
      n = nextState(n, { actionName: 'insert-money', money: 27});
      expect(n).toEqual({stateName: 'get-money', moneyInserted: 77});
      n = nextState(n, { actionName: 'vend-soda'});
      expect(n).toEqual({stateName: 'vend', changeRemaining: 27});
      n = nextState(n, { actionName: 'clock-tick'});
      expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 27});
      n = nextState(n, { actionName: 'clock-tick'});
      expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 2});
      n = nextState(n, { actionName: 'clock-tick'});
      expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 1});
      n = nextState(n, { actionName: 'clock-tick'});
      expect(n).toEqual({stateName: 'idle'});
```

## Notes
* Self transition are not implicit. You must explicitly declare them if a handler for state `x` is allowed to return state `x`.
* You don't have to declare handlers for final states (i.e. those that have no transitions out of them). If fact, it's illegal to do so since they have no valid transitions out of them!
* As shown in the example, states and actions can have a payload.
* For handlers that can return multiple state types depending on some condition, every state must be a legal transition.

# Get started

## Requirements:
Typescript 4.0+ or equivalent bundler loader (e.g. ts-loader for webpack).

## Installation
Add ts-checked-fsm as a dependency in your package.json.

## Building

### Setup
Before any of the following tasks, you need to install dependencies:
```
yarn install
```

While untested, you can probably substitute npm for yarn and things will probably work.

### Compilation
```
yarn run build
```

Output appears in lib folder

# Contributions
Code contributions and improvements by the community are welcomed!
See the LICENSE file for current open-source licensing and use information.

Before we can accept pull requests from contributors, we require a signed [Contributor License Agreement (CLA)](http://tableau.github.io/contributing.html),
