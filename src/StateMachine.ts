/**
 * State labels can be strings
 */
type StateType = string;

/**
 * Action labels can be strings
 */
export type ActionNameType = string;

/**
 * Represents a state and data and its corresponding data.
 */
export type State<S extends StateType, D = {}> = Readonly<D> & {
  readonly stateName: S;
}

/**
 * Represents a state transition
 * 
 * Generic Parameters:
 * C current state label
 * N Next State Label
 */
type Transition<C, N> = {
  readonly cur: C;
  readonly next: N
}

/**
 * Give Actions to nextState() to (maybe) trigger a transition.
 */
export type Action<Name extends ActionNameType, Payload> = Readonly<Payload> & { 
  readonly actionName: Name 
};

///
/// Errors
///

/**
 * Represents a compiler error message. Error brands prevent really clever users from naming their states as one of the error messages
 * and subverting error checking. Yet, the compiler still displays the string at the end of the failed cast indicating what the
 * issue is rather than something puzzling like could not assign to never.
 */
type ErrorBrand<T> = Readonly<T> & { _errorBrand: void };

// type NotAStateTypeError = 'The passed state value is not a state type. States must be string, number, or boolean literal.';
type StateAlreadyDeclaredError = 'The specified state has already been declared.';
type TransitionAlreadyDeclaredError = 'This transition has already been declared.';
type IllegalStateError = 'The specified state has not been declared or the other keys/values in the state object are invalid or missing.';
type IllegalTransitionError = 'No transition exists from the current state to the returned next state.';
type ActionAlreadyDeclared = 'An action with this label has already been declared.';
type NoSuchActionLabel = 'No action exists with this actionName.';
type HandlerNotAState = 'The returned value is not a state';
type NoHandlerForState = 'A state is missing from the handler map';
type HandlerDeclaredForUnknownState = '';

//type InferState<S> = S extends MaybeValidatedState<infer S, any> ? S : ErrorBrand<'Passed object is not a state'>;

type IndexType = string | number | symbol;

/// Validators
type AssertTInTransitions<Transitions, C extends StateType, N extends StateType> = Transition<C, N> extends Transitions ? C : ErrorBrand<IllegalTransitionError>;
type AssertSInState<States, S> = S extends States ? S : ErrorBrand<IllegalStateError>;
type AssertNewState<S extends StateType, States> = S extends States ? ErrorBrand<StateAlreadyDeclaredError> : S;
type AssertNewTransition<S extends IndexType, N extends IndexType, Transitions> = Transition<S, N> extends Transitions ? ErrorBrand<TransitionAlreadyDeclaredError> : N;
type AssertActionNotDefined<AN extends ActionNameType, ActionNames extends IndexType> = AN extends ActionNames ? ErrorBrand<ActionAlreadyDeclared> : AN;
type AssertActionNameLegal<ActionNames, ActionName> = ActionName extends ActionNames ? ActionName : ErrorBrand<NoSuchActionLabel>;
// type AssertHandlerMapComplete<StateNames extends StateType, Map> = [keyof Map] extends [StateNames] ? [StateNames] extends [keyof Map] ? Map : ErrorBrand<NoHandlerForState> : ErrorBrand<HandlerDeclaredForUnknownState>;

/**
 * Private
 * The state machine definitiion.
 */
type StateMachineDefinition<StateLabels extends string, ActionLabels extends ActionNameType, States, Actions> = {
  handlers: {
    [s in StateLabels]: {
      [h in ActionLabels]?: (curState: States, action: Actions) => States;
    };
  };
};

///
/// stateMachine() builder
///

/**
 * A builder from calling stateMachine().
 */
export type StateMachineBuilder = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<{}>;
}

type StateMachineFunc = () => StateMachineBuilder;

///
/// .state() builder
///

/**
 * A builder from calling .state()
 */
export type StateBuilder<StateMap> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<StateMap>;

  readonly transition: TransitionFunc<StateMap, never>;
}

/**
 * The signature for calling the state function in the builder.
 */
type StateFunc<StateMap> = <S extends StateType, Data = {}>(
  state: AssertNewState<S, keyof StateMap>
) => StateBuilder<StateMap & { [key in S]: State<S, Data> }>;

///
/// .transition() builder
///

/**
 * The builder returned by .transition()
 */
export type TransitionBuilder<StateMap, Transitions> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: TransitionFunc<StateMap, Transitions>;

  readonly action: ActionFunc<StateMap, Transitions, {}>;
}

/**
 * The signature of .transition()
 */
export type TransitionFunc<StateMap, Transitions> = <S extends keyof StateMap, N extends keyof StateMap>(
  curState: S,
  nextState: AssertNewTransition<S, N, Transitions>
) => TransitionBuilder<StateMap, Transitions | Transition<S, N>>;

///
/// .action() builder
///

export type ActionBuilder<
  StateMap,
  Transitions,
  ActionsMap
> = {
  readonly action: ActionFunc<StateMap, Transitions, ActionsMap>;
  
  readonly actionHandler: ActionHandlerFunc<
    StateMap,
    Transitions,
    ActionsMap
  >;
};

export type ActionFunc<
  StateMap,
  Transitions,
  ActionsMap
> = <AN extends ActionNameType, AP = {}>(actionName: AssertActionNotDefined<AN, keyof ActionsMap>) => ActionBuilder<StateMap, Transitions, ActionsMap & { [k in AN]: Action<AN, AP> }>;

///
/// .actionsHandler() builder.
///

/**
 * The builder returned by .actionHandler()
 */
export type ActionHandlersBuilder<StateMap, Transitions, ActionsMap> = {
  readonly actionHandler: ActionHandlerFunc<StateMap, Transitions, ActionsMap>;

  readonly done: () => StateMachine<StateMap, ActionsMap>,
}


/**
 * The Signature of .actionHandler().
 */
export type ActionHandlerFunc<
  StateMap,
  Transitions,
  ActionsMap
> = <
  CS extends StateType,
  NS extends StateType,
  AN extends keyof ActionsMap,
  ND,
> (
  state: CS,
  action: AN,
  handler: ActionHandlerCallback<StateMap, ActionsMap, Transitions, CS, NS, ND, AN>
) => ActionHandlersBuilder<StateMap, Transitions, ActionsMap>;

type ActionHandlerCallback<
  StateMap,
  ActionsMap,
  Transitions,
  CS extends StateType,
  NS extends StateType,
  ND,
  AN extends keyof ActionsMap,
> = (state: CS, action: ActionsMap[AN]) => 
   State<NS, ND> extends StateMap[keyof StateMap]
    ? Transition<CS, NS> extends Transitions
    ? State<NS, ND>
    : ErrorBrand<HandlerNotAState>
    : ErrorBrand<IllegalTransitionError>;
///
/// .done()
///
type DoneFunc<States, Actions> = () => StateMachine<States, Actions>;

/**
 * A state machine
 */
export type StateMachine<States, Actions> = {
  nextState: (curState: States, action:Actions) => States,
};

export const stateMachine: StateMachineFunc = (): StateMachineBuilder => {
  const stateFunc = state<{}>();

  return {
    state: stateFunc,
  };
}

const state = <StateMap>(): StateFunc<StateMap> => {
  return <S extends StateType, D = {}>(_s: AssertNewState<S, keyof StateMap>) => {
    type NewStateMap = StateMap & { [k in S]: State<S, D> };

    const transitionFunc = transition<NewStateMap, never>();
    const stateFunc = state<NewStateMap>()

    const builder = {
      state: stateFunc,
      transition: transitionFunc,
    };

    return builder;
  }
}

const transition = <StateMap, Transitions>(): TransitionFunc<StateMap, Transitions> => {
  return <S extends keyof StateMap, N extends keyof StateMap>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    const transitionFunction = transition<StateMap, Transitions | Transition<S, N>>();
    const actionFunc = action<StateMap, Transitions | Transition<S, N>, {}>();

    return {
      transition: transitionFunction,
      action: actionFunc,
    };
  };
}

const action = <StateMap, Transitions, ActionMap>(): ActionFunc<StateMap, Transitions, ActionMap> => {
  return <AN extends ActionNameType, AP = {}>(_actionName: AssertActionNotDefined<AN, keyof ActionMap>) => {
    type NewActionMap = ActionMap & { [key in AN]: Action<AN, AP> };

    const actionFunc: any = action<StateMap, Transitions, NewActionMap>()
    const actionHandlerFunc = actionHandler<StateMap, Transitions, NewActionMap>();

    return {
      action: actionFunc,
      actionHandler: actionHandlerFunc,
    };
  }
}

const actionHandler = <StateMap, Transitions, ActionMap>(): ActionHandlerFunc<StateMap, Transitions, ActionMap> => {
  return <CS extends keyof StateMap, NS extends keyof StateMap, AN extends keyof ActionMap, ND, AP>(state: CS, action: AN, handler: ActionHandlerCallback<StateNames, States, ActionNames, Transitions, CS, AN, AP, NS, ND>) => {
    const doneFunc: any = done<StateNames, States, Transitions, ActionNames, ActionNameType>();
    const actionHandlerFunc: any = actionHandler<StateNames, States, Transitions, ActionNames, Actions>();

    return { 
      actionHandler: actionHandlerFunc,
      done: doneFunc
    };
  };
};

const done = <StateNames extends StateType, States, Transitions, ActionNames extends ActionNameType, Actions>() => {
  return (): StateMachine<States, Actions> => {
    const nextStateFunction = (curState: States, action: Actions): States => {
      return null!;
    };

    return {
      nextState: nextStateFunction
    };
  }
}

const x = stateMachine()
  .state('a')
  .state<'b', {foo: 'horse'}>('b')
  .state('c')
  .transition('a', 'c')
  .transition('b', 'c')
  .action<'a1', {foo: 27}>('a1')
  .action('a2')
  .actionHandler("a", "a1", (c, a) => {
    return {
      stateName: 'b',
      foo: 'horse'
    };
  })
  /*.actionHandlers({
    a: {
      a1: () => {
        return {
          state: 'b' as const,
        }
      }
    },
    b: {}
  })
  .done();
*/
