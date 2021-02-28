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
type Transition<C extends StateType, N extends StateType> = {
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

/// Validators
type AssertTInTransitions<Transitions, C extends StateType, N extends StateType> = Transition<C, N> extends Transitions ? C : ErrorBrand<IllegalTransitionError>;
type AssertSInState<States, S> = S extends States ? S : ErrorBrand<IllegalStateError>;
type AssertNewState<S extends StateType, States> = S extends States ? ErrorBrand<StateAlreadyDeclaredError> : S;
type AssertNewTransition<S extends StateType, N extends StateType, Transitions> = Transition<S, N> extends Transitions ? ErrorBrand<TransitionAlreadyDeclaredError> : N;
type AssertActionNotDefined<AN extends ActionNameType, ActionNames extends ActionNameType> = AN extends ActionNames ? ErrorBrand<ActionAlreadyDeclared> : AN;
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
  readonly state: StateFunc<never, never>;
}

type StateMachineFunc = () => StateMachineBuilder;

///
/// .state() builder
///

/**
 * A builder from calling .state()
 */
export type StateBuilder<StateNames extends StateType, States> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<StateNames, States>;

  readonly transition: TransitionFunc<StateNames, States, never>;
}

/**
 * The signature for calling the state function in the builder.
 */
type StateFunc<States extends StateType, Datas> = <S extends StateType, Data = {}>(
  state: AssertNewState<S, States>
) => StateBuilder<States | S, Datas | State<S, Data>>;

///
/// .transition() builder
///

/**
 * The builder returned by .transition()
 */
export type TransitionBuilder<StateNames extends StateType, States, Transitions> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: TransitionFunc<StateNames, States, Transitions>;

  readonly action: ActionFunc<StateNames, States, Transitions, never, never>;
}

/**
 * The signature of .transition()
 */
export type TransitionFunc<StateNames extends StateType, States, Transitions> = <S extends StateNames, N extends StateNames>(
  curState: S,
  nextState: AssertNewTransition<S, N, Transitions>
) => TransitionBuilder<StateNames, States, Transitions | Transition<S, N>>;

///
/// .action() builder
///

export type ActionBuilder<
  StateNames extends StateType,
  States,
  Transitions,
  ActionNames extends ActionNameType,
  Actions
> = {
  readonly action: ActionFunc<StateNames, States, Transitions, ActionNames, Actions>;
  
  readonly actionHandler: ActionHandlerFunc<
    StateNames,
    States,
    Transitions,
    ActionNames,
    Actions
  >;
};

export type ActionFunc<
  StateNames extends StateType,
  States,
  Transitions,
  ActionNames extends ActionNameType,
  Actions
> = <AN extends ActionNameType, AP = {}>(actionName: AssertActionNotDefined<AN, ActionNames>) => ActionBuilder<StateNames, States, Transitions, ActionNames | AN, Actions | Action<AN, AP>>;

///
/// .actionsHandler() builder.
///

/**
 * The builder returned by .actionHandler()
 */
export type ActionHandlersBuilder<StateNames extends StateType, States, Transitions, ActionNames extends ActionNameType, Actions> = {
  readonly actionHandler: ActionHandlerFunc<StateNames, States, Transitions, ActionNames, Actions>;

  readonly done: () => StateMachine<States, Actions>,
}


/**
 * The Signature of .actionHandler().
 */
export type ActionHandlerFunc<
  StateNames extends StateType,
  States,
  Transitions,
  ActionNames extends ActionNameType,
  Actions,
> = <
  S extends StateNames,
  AN extends ActionNames,
  NS extends StateType,
  ND,
  AP = {},
> (
  state: S,
  action: AN,
  handler: ActionHandlerCallback<StateNames, States, ActionNames, Transitions, S, AN, AP, NS, ND>
) => ActionHandlersBuilder<StateNames, States, Transitions, ActionNames, Actions>;

type ActionHandlerCallback<
  StateNames extends StateType,
  States,
  ActionNames extends ActionNameType,
  Transitions,
  CS extends StateNames,
  AN extends ActionNames,
  AP,
  NS extends StateType,
  ND
> = (state: CS, action: Action<AN, AP>) => 
   State<NS, ND> extends States
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
  const stateFunc = state<never, never>();

  return {
    state: stateFunc,
  };
}

const state = <StateNames extends StateType, Datas>(): StateFunc<StateNames, Datas> => {
  return <S extends StateType, D = {}>(_s: AssertNewState<S, StateNames>) => {
    const transitionFunc = transition<StateNames | S, Datas | State<S, D>, never>();
    const stateFunc = state<StateNames | S, Datas | State<S, D>>()

    const builder: StateBuilder<StateNames | S, Datas | State<S, D>> = {
      state: stateFunc,
      transition: transitionFunc,
    };

    return builder;
  }
}

const transition = <StateNames extends StateType, States, Transitions>(): TransitionFunc<StateNames, States, Transitions> => {
  return <S extends StateNames, N extends StateNames>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    const transitionFunction = transition<StateNames, States, Transitions | Transition<S, N>>();
    const actionFunc = action<StateNames, States, Transitions | Transition<S, N>, never, never>();

    return {
      transition: transitionFunction,
      action: actionFunc,
    };
  };
}

const action = <StateNames extends StateType, States, Transitions, ActionNames extends ActionNameType, Actions>(): ActionFunc<StateNames, States, Transitions, ActionNames, Actions> => {
  return <AN extends ActionNameType, AP = {}>(_actionName: AssertActionNotDefined<AN, ActionNames>) => {
    const actionFunc = action<StateNames, States, Transitions, ActionNames | AN, Actions | Action<AN, AP>>()
    const actionHandlerFunc = actionHandler<StateNames, States, Transitions, ActionNames | AN, Actions | Action<AN, AP>>() as ActionHandlerFunc<StateNames, States, Transitions, ActionNames | AN, Actions | Action<AN, AP>>;

    return {
      action: actionFunc,
      actionHandler: actionHandlerFunc,
    };
  }
}

const actionHandler = <StateNames extends StateType, States, Transitions, ActionNames extends ActionNameType, Actions>(): ActionHandlerFunc<StateNames, States, Transitions, ActionNames, Actions> => {
  return <S extends StateNames, AN extends ActionNames, NS extends StateType, ND, AP>(state: S, action: AN, handler: ActionHandlerCallback<StateNames, States, ActionNames, Transitions, S, AN, AP, NS, ND>) => {
    const doneFunc: any = done<StateNames, States, Transitions, ActionNames, ActionNameType>();
    const actionHandlerFunc = actionHandler<StateNames, States, Transitions, ActionNames, Actions>();

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
  .transition('a', 'b')
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
