# redux-saga-observer

![Community Supported](https://img.shields.io/badge/Support%20Level-Community%20Supported-457387.svg)

redux-saga-observer is a library that provides observer patterns to redux-sagas, allowing powerful abstractions.

* [Why redux-saga-observer?]()
    * [Dispatching on state change](#dispatching-on-state-change)
    * [Managing concurrency](#managing-concurrency)
* [Get Started](#get-started)
    * [Requirements](#requirements)
    * [Installation](#installation)
    * [Building](#building)
* [Contributions](#contributions)

# Why redux-saga-observer?

[redux-saga](https://github.com/redux-saga/redux-saga) is a powerful set of abstractions for managing asynchronous side effects in redux applications. However, a number of things are either difficult or obtuse in the base library. In particular:

* Sometimes you want to do things when the state changes rather than worry about why it changed.
* Handling concurrency that may update the redux store in ways your sagas must handle.

Observers help us out in both cases.

## Dispatching on state change

There may be any number of actions that trigger reducers that operate on some section of your redux store. Suppose you have a checklist backed up in the cloud. Your redux store and the actions that update it look like (in Typescript):

```
type State = {
    readonly lines: string[],
    readonly name: string
};

type AppendAction = {
    readonly type: 'ADD_LINE',
    readonly data: string
};

type RemoveAction = {
    readonly type: 'REMOVE_LINE',
    readonly index: number
};

type InitAction = {
    readonly type: 'INIT'
}

function reducer(state: State, action: AppendAction | RemoveAction): State {
    switch(action.type) {
        case 'ADD_LINE':
            return {
                ...state,
                lines: [ state.line, action.data ]
            };

        case 'REMOVE_LINE':
            return {
                ...state,
                lines: state.splice(action.index, 1)
            };

        case 'INIT':
            return { 
                ...state,
                name: 'horsemeat'
                lines: [] 
            }

        default:
            return state;
    }
}

```

In this example, we dispatch REMOVE_LINE to remove the line at an index, ADD_LINE to append to the list, and INIT to initialze an empty list. There are three ways this list can change. Now suppose I create the following saga to save the list:

```
type SaveAction = {
    readonly type: 'SAVE_LIST'
    readonly name: string,
    readonly lines: [],
}

function* saveList(payload: SaveAction) {
    yield call(
        fetch, 
        { 
            method: 'POST',
            path: '/api/list',
            data: JSON.stringify({
                name: payload.name,
                lines: payload.lines
            })
        }
    );
}

function* handleSaveList(payload: SaveAction) {
    yield takeEvery('SAVE_LIST', saveList);
}

sagaMiddleware.run(handleSaveList);

```

If we want to save after every change, the producer of SaveAction needs to know that REMOVE_LINE, INIT, and ADD_LINE are all the possible actions that can modify the document. Alternatively, you could change takeEvery to listen to these three actions, in which case it must track all the actions that can possibly modify your document. Either quickly becomes unwieldy as actions distribute across your app; all developers need to remember to update the list of actions anytime they add a new action for manipulating the doc. Observers let you monitor state and dispatch a Saga when when the document changes regardless of the action that triggered it.

In redux-saga-observer, you can add a top level observer using observeAndRun. The above example's missing goo for translating document actions into SAVE_LIST becomes the following:

```

function* autoSave() {
    yield observeAndRun<State>()
        .saga(function* (state) {
            yield call(
                fetch, 
                { 
                    method: 'POST',
                    path: '/api/list',
                    data: JSON.stringify({
                        name: state.name,
                        lines: state.lines
                    })
                }
            );
        })
        .when((oldState, newState) => {
            return oldState.name !== newState.name ||
                oldState.lines !== newState.lines;
        })
        .run();
}

sagaMiddleware.run(autoSave);

```

We now save the do whenever the name or lines change in the document regardless of the action that triggered it.

## Managing concurrency

Another pain point is managing concurrency in a saga. Consider the following changes to our above example:

```

function* saveList(payload: SaveAction) {
    yield call(
        fetch, 
        { 
            method: 'POST',
            path: '/api/list',
            data: JSON.stringify({
                name: payload.name,
                lines: payload.lines
            })
        }
    );

    // Check that the user hasn't modified the document while we were saving.
    if (payload.name !== yield Select(getName) || payload.list !== yield Select(getLines)) {
        return
    }
        
    const res1 = yield call(someAsyncThing);

    // Check that the user hasn't modified the document while we were doing someAsyncThing.
    if (payload.name !== yield Select(getName) || payload.list !== yield Select(getLines)) {
        return
    }
        
    const res2 = yield call(someOtherAsyncThing, res1);
    
    // Check that the user hasn't modified the document while we were doing someOtherAsyncThing.
    if (payload.name !== yield Select(getName) || payload.list !== yield Select(getLines)) {
        return
    }
    
    yield put({ type: 'SOME_ACTION', result: res2 });
}

```

takeLatest can sometimes aleviate all the state checks, but in complex systems this isn't always the case in sufficiently complex apps. With redux-saga-observer, you can put invariants on your saga. If the invariants are ever violated, the saga aborts and you get notified if you need to perform cleanup:

```

function* saveList(payload: SaveAction) {
    yield runWhile<State>()
        .saga(function* () {
            yield call(
                fetch, 
                { 
                    method: 'POST',
                    path: '/api/list',
                    data: JSON.stringify({
                        name: payload.name,
                        lines: payload.lines
                    })
                }
            );
                
            const res1 = yield call(someAsyncThing);
            const res2 = yield call(someOtherAsyncThing, res1);
            yield put({ type: 'SOME_ACTION', result: res2 });

        })
        .invariant('NAME_UNCHANGED', s => s.name === payload.name)
        .invariant('LINES_UNCHANGED', s => s.lines === payload.lines)
        .onViolation(function* (state, violations) {
            // If we need to dispatch some sagas, actions, or whatever for cleanup, do it here.
        })
        .run()
}

```

In the above example, we magically get nice types for violations in our onViolation callback ('NAME_UNCHANGED' | 'LINES_UNCHANGED')[] and state contains the state at the time the invariant was violated. The main saga
immediately aborts when ANY invariant is violated and you get notified of EVERY broken invariant.

# Get started

## Requirements:
* redux 3.5.0 or later
* redux-saga 0.16.0 or later

## Installation
Add redux-saga-observer as a dependency in your package.json.

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

### Running tests
```
yarn run test
```

### Debugging tests
```
yarn run testWatch
```

Then visit localhost:9876 in the browser of your choice.

# Contributions
Code contributions and improvements by the community are welcomed!
See the LICENSE file for current open-source licensing and use information.

Before we can accept pull requests from contributors, we require a signed [Contributor License Agreement (CLA)](http://tableau.github.io/contributing.html),
