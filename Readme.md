# redux-saga-observer

![Community Supported](https://img.shields.io/badge/Support%20Level-Community%20Supported-457387.svg)

ts-state-machine provides compile tile validation of state machine transitions leveraging Typescript's powerful type system.

* [Overview]()
    * [Example problem](#example)
    * [Introducing states in our type system](#states)
    * [Compile time state machine validation using ts-state-machine](#ts-state-machine)
* [Get Started](#get-started)
    * [Requirements](#requirements)
    * [Installation](#installation)
    * [Building](#building)
* [Contributions](#contributions)

# Overview
Typescript's type system provides powerful abstractions and compile-time correctness guarantees over writing in vanilla Javascript. Tagged unions are a particularly potent Typescript typesystem feature.

In particular, they allow you to push application state into the type system. This allows you remove optional and nullable variables and ensure you can only access such variables in states that make sense.

## Example problem

Suppose we have a text editor. When you first open the editor, you land on a start screen where you're given information about the product and are asked to load or create a new document. However, you don't actually have a document yet. One way to encode this is as follows:

```
let doc: null | MyDocument = null;
let docSaveLocation: null | string = null;

const onClose = () => {
  if (doc == null) {
    throw new Error("No document loaded.");
  }

  closeDocument(doc);
  doc = null;
  docSaveLocation = null;
}

const onNewDocument = () => {
  if (doc != null) {
    closeDocument(doc);
  }

  docSaveLocation = null;

  doc = createNewDocument();
}

const onSaveAs = () => {
  if (doc == null) {
    throw new Error("No document loaded.");
  }

  newDocSaveLocation = promptUserToSave();

  // If the user cancels the saveas, bail.
  if (newDocSaveLocation == null) {
    return;
  }

  docSaveLocation = newDocSaveLocation;

  // Save as assumes a non-null value in its typing
  saveDocument(docSaveLocation, doc);
}

const onSave = () => {
  if (doc == null) {
    throw new Error("No document")
  }

  if (docSaveLocation == null) {
    throw new Error("Document has never been saved.")
  }

  // Save assumes a non-null value in its typing
  save(docSaveLocation, doc);
}

const onLoad = () => {
  const newDocSaveLocation = promptUserToOpen();

  // If the user cancels the load, bail
  if (newDocSaveLocation == null) {
    return;
  }

  if (doc != null) {
    closeDocument(doc);
  }

  docSaveLocation = newDocSaveLocation;

  doc = openDocument(docSaveLocation);
}

type MenuItems = {
  [key: 'New' | 'Open' | 'Close' | 'Save as' | 'Save',]: () => void;
  
}

const getMenuItems(): MenuItems {
  const currentState = docState;

  let menuItems = {
    'New': () => { new(); },
    'Open': () => { open(); }
  };

  if (doc != null) {
    menuItems = {
      ...menuItems,
      'Close': () => { close(); }
      'Save as': () => { saveAs(); }
    }
  }

  if (doc != null && docSaveLocation != null) {
    menuItems = {
      ...menuItems,
      'Save': () => { save(); }
    }
  }

  return menuItems;
}

```

There are a number of problems with this. Firstly, when using strictNullChecks, the type system will always flag doc and docSaveLocation as being possibly null, often redundantly. Indeed, our getMenuItems method has to check for nullity to show the correct menu items while the action methods themselfs have to again check nullity. They have to do this because the actions don't know that their calling context has already checked for null, and thus have to strip the nullity away. If they didn't, they couldn't pass the variables to functions that expect non-null values. 

Secondly, you have to infer from the nullity of these variables what state your application is in. In our example, this happens to work, but what if we add a new type of open that prevents you from saving? You'd need to add a boolean value, which you need to check in all the save functions.

Finally, it's easy to overlook checking for or nulling out a variable. What we need is a finite state machine that explicitly represents having documents loaded or not. 

## Introducing states in our type system

Looking at our example, we can see the following possible times things can be null:

  1. The user has just opened the application or just closed a document. In this case, both doc and docSaveLocation are null. The user can perform the new and open actions.
  2. The user has clicked new. The doc is now non-null, but not the docSaveLocation. The user can do anything but save, as we don't have a docSaveLocation.
  3. The user opens a document or clicks save-as. Both doc and docSaveLocation are non-null and the user can perform any action.

Using the above observations, we can encode this information into our type system and refine our design:

```
type NoDocLoadedState = {
  state: 'no-document';
}

type UnnamedDocumentState = {
  state: 'unnamed-document';
  doc: MyDocument;
}

type NamedDocumentState = {
  state: 'named-document';
  doc: MyDocument;
  docSaveLocation: string;
}

type DocState = NoDocLoadedState | UnnamedDocumentState | NamedDocumentState;

// We start with the NoDocLoadedState type and later transition to other states/types
let docState: DocState = {
  state: 'no-document'
};

const open = (\_state: DocState) => {
  const openLocation = promptUserToOpen();

  if (openLocation == null) {
    return;
  }

  if (docState.state !== 'no-document') {
    closeDocument(docState.doc);
  }

  return {
    state: 'named-document',
    docSaveLocation: openLocation,
    doc: openDocument(openLocation)
  };
}

const close = (\_state: UnnamedDocumentState | NamedDocumentState) => {
  closeDocument(state.doc);

  return {
    state: 'no-document'
  };
}

const saveAs = (state: UnnamedDocumentState | NamedDocumentState) => {
  const saveAsLocation = promptUserToSave();

  if (saveAsLocation == null) {
		return;
	}

  return {
    ...state
    state: 'named-document',
    docSaveLocation: saveAsLocation
  }
}

const save = (state: NamedDocumentState) => {
  save(state.docSaveLocation, state.doc);

  return state;
}

const new = (state: DocState) => {
  if (state.state === 'unnamed-document' || doc.state === 'named-document') {
    closeDocument(state.doc);
  }

  return {
    state: 'unnamed-document',
    doc: createNewDocument()
  }
}

type MenuItems = {
  [key: 'New' | 'Open' | 'Close' | 'Save as' | 'Save',]: () => void;
}

const getMenuItems(): MenuItems {
  const currentState = docState;

  let menuItems = {
    'New': () => { docState = new(currentState); },
    'Open': () => { docState = open(currentState); }
  };

  if (currentState.state === 'unnamed-document') {
    menuItems = {
      ...menuItems,
      'Save as': () => { docState = save(currentState); },
      'Close': () => { docState = close(currentState); }
    };
  } else if (currentState.state === 'named-document') {
    menuItems = {
      ...menuItems,
      'Save as': () => { docState = saveAs(currentState); }
      'Save': () => { docState = save(currentState); },
      'Close': () => { docState = close(currentState); },
    };
  }

  return menuItems;
}

```

In this case, we no longer encode state information into the nullity of multiple variables. In fact, the only time we even have to check for nullity anymore is when checking that the user didn't cancel the save as or open prompt!

If we wanted to extend our example to have a read-only open mode, we just add a new state:

```
type ReadonlyDocLoadedState = {
  state: 'readonly-doc';
  doc: MyDocument;
}

```

We then hook this type into DocState and check for its existence in getMenuItems, in which case we omit Save and Save As.

## Compile time state machine validation using ts-state-machine

Our previous above implementation encodes the application state into the type system, providing fewer opportunities for bugs. However, one may note that not all transitions are valid. For example, you never go from having a named document to having an unnamed document. Furthermore, there is no transition from no-document that remains in no-document; opening or newing a document both transition to other states. These are useful invariants to assert, but we'd have to write unit tests to do so with our current design.

ts-state-machine allows us to turn these assertions into compilation errors rather than test failures or runtime exceptions. First, we define our state machine:

```
import { stateMachine, StateData } from 'ts-state-machine';

type HasDoc = {
  doc: MyDocument;
}

type HasDocLocation = {
  docSaveLocation: string;
}

const transition = stateMachine()
  .state('no-document')
  .state<'unnamed-document', HasDoc>('unnamed-document') // If we have data associated with this state, we have to fill in the generic parameters.
  .state<'named-document', HasDoc & HasDocLocation>('named-document')
  .transition('no-document', 'unnamed-document')
  .transition('no-document', 'named-document')
  .transition('unnamed-document', 'named-document')
  .transition('unnamed-document', 'no-document')
  .transition('named-document', 'named-document') // Allow self-transitions for named-documents
  .transition('named-document', 'no-document')
  .done();

```

Then we define our state types. ts-state-machine provides the ```StateData``` type, which concatenates state with an arbitrary object (which shouldn't contain the state key). 

```
type DocState =
  StateData<'no-document', {}> |
  StateData<'unnamed-document', HasDoc> |
  StateData<'named-document', HasDoc & HasDocLocation>;
```

We reuse the previous implementations of our actions, noting that they return the next state. We then write our getMenuItems function:

```
const getMenuItems(): MenuItems {
  const currentState = docState;
  switch (currentState.state) {
    case 'no-document':
      return {
        'New': () => { docState = transition(currentState, newDoc(currentState)); },
        'Open': () => { docState = transition(currentState, open(currentState)); }
      };

    case 'unnamed-document':
      return {
        'New': () => { docState = transition(currentState, newDoc(currentState)); },
        'Open': () => { docState = transition(currentState, open(currentState)); },
        'Save as': () => { docState = transition(currentState, saveAs(currentState)); },
        'Close': () => { docState = transition(currentState, close(currentState)); }
      };

    case 'named-document':
      return {
        'New': () => { docState = transition(currentState, newDoc(currentState)); },
        'Open': () => { docState = transition(currentState, open(currentState)); },
        'Save as': () => { docState = transition(currentState, saveAs(currentState)); },
        'Save': () => { docState = transition(currentState, save(currentState)); },
        'Close': () => { docState = transition(currentState, close(currentState)); }
      };

    default:
      expectNeverHit(currentState.state);
  }
}
```

Each time we call transition, the Typescript type system validates that there exists a valid transition from the current and next state. Additionally, it validates that the types associated with the current and next state match our state machine definition.

If I try to transtion from 'named-document' to 'unnamed-document', then the transition call will fail to compile. Today, error messages are cryptic, e.g. "Type string is not assignable to never".There are type system proposals that would ts-state-machine to give more meaningful messages.

# Get started

## Requirements:
Typescript 3.0+ or equivalent bundler loader (e.g. ts-loader for webpack).

## Installation
Add ts-state-machine as a dependency in your package.json.

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
