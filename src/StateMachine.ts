/**
 * Represents a state transition
 */
type Transition<CurrentState, NextState> = {
  readonly cur: CurrentState;
  readonly next: NextState
}

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

/**
 * States can be represented as string, number, or boolean literals.
 */
type StateType = string;

/**
 * A branded state-data named tuple to which inline objects will not readily assign. Use this to define your states. Ensures that only
 * states coming out of the validate or initialState call get assigned to your states, guaranteeing (unless you resort to casting) that
 * your state machine is within specification at compile time.
 */
export type ValidatedState<S, D = {}> = Readonly<D> & {
  readonly state: S;

  /**
   * This is a dummy field for supporting nominal typing to ensure you only assign states that have been validated.
   * Don't use it.
   *
   * See https://michalzalecki.com/nominal-typing-in-typescript/ for more information about nominal typing in Typescript
   */
  _brand: void
}

/**
 * Private
 * An unbranded state and data tuple to which inline objects will readily assign.
 */
export type UnvalidatedState<S, D = {}> = Readonly<D> & {
  readonly state: S;
}

type InferState<S> = S extends MaybeValidatedState<infer S, any> ? S : ErrorBrand<'Passed object is not a state'>;

type TInTransition<Transitions, C, N> = Transition<InferState<C>, InferState<N>> extends Transitions ? C : ErrorBrand<'No transition between specified states'>;

type SInState<States, S> = S extends States ? S : ErrorBrand<'The passed state is not in the set of allowed states'>;

/**
 * Private
 * A possibly validated state and data named tuple.
 */
type MaybeValidatedState<S, D> = ValidatedState<S, D> | UnvalidatedState<S, D>;

/**
 * Private
 * The state machine definitiion.
 */
type StateMachineDefinition<IS, ID> = {
  initialState: ValidatedState<IS, ID>;
};

type StateFunc<States extends StateType, Datas> = <S extends StateType, Data = {}>(
  state: AssertNewState<S, States>
) => StateBuilder<States | S, Datas | UnvalidatedState<S, Data>>;

/**
 * A builder from calling stateMachine().
 */
export type StateMachineBuilder = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<never, never>;
}

/**
 * A builder from calling .state()
 */
export type StateBuilder<StateNames extends StateType, States> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<StateNames, States>;

  /**
   * Sets the initial state for the state machine
   */
  readonly initialState: InitialStateFunc<StateNames, States>;
}

export type InitialStateBuilder<StateNames extends StateType, States, IS, ID> = {
  readonly transition: TransitionFunc<StateNames, States, never, IS, ID>;

  readonly done: () => StateMachine<States, never, IS, ID>;
}

export type InitialStateFunc<StateNames extends StateType, States> = <S extends StateNames, D>(
  data: IsLegalStateResolveUnvalidatedState<S, D, States>
) => InitialStateBuilder<StateNames, States, S, D>

/**
 * A type that validates that UnvalidatedState<S, D> exists in Datas. If so, resolves to UnvalidatedState<S, D>. If not, resolves
 * to an ErrorBrand.
 */
type IsLegalStateResolveUnvalidatedState<S extends StateType, D, Datas> = UnvalidatedState<S, D> extends Datas ? UnvalidatedState<S, D> : ErrorBrand<IllegalStateError>;

/**
 * A type that validates that S does not exist in States. If so, resolves to an ErrorBrand. If not, resolves to S.
 */
type AssertNewState<S extends StateType, States> = S extends States ? ErrorBrand<StateAlreadyDeclaredError> : S;

/**
 * A type that validates that Transition<S, N> does not exist in Transitions. If so, resolves to an ErrorBrand. If not, resolves to N.
 */
type AssertNewTransition<S extends StateType, N extends StateType, Transitions> = Transition<S, N> extends Transitions ? ErrorBrand<TransitionAlreadyDeclaredError> : N;

export type TransitionFunc<StateNames extends StateType, States, Transitions, IS, ID> = <S extends StateNames, N extends StateNames>(
  curState: S,
  nextState: AssertNewTransition<S, N, Transitions>
) => TransitionBuilder<StateNames, States, Transitions | Transition<S, N>, IS, ID>;

/**
 * A builder from calling .transition()
 */
export type TransitionBuilder<StateNames extends StateType, States, Transitions, IS, ID> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: TransitionFunc<StateNames, States, Transitions, IS, ID>;

  /**
   * Finalize the state machine type.
   */
  //readonly done: () => StateMachine<States, Transitions, IS, ID>

  readonly action: ActionFunc<StateNames, States, Transitions, IS, ID, never, never>;
}

export type ActionNameType = string;

export type Action<Name extends ActionNameType, Payload> = { actionName: Name } & Payload;

export type ActionBuilder<
  StateNames extends StateType,
  States,
  Transitions,
  IS,
  ID,
  ActionNames extends ActionNameType,
  Actions
> = {
  readonly action: ActionFunc<StateNames, States, Transitions, IS, ID, ActionNames, Actions>;
  
  readonly actionHandler: ActionHandlerFunc<
    StateNames,
    States,
    Transitions,
    IS,
    ID,
    ActionNames,
    Actions
  >;
};

export type ActionFunc<
  StateNames extends StateType,
  States,
  Transitions,
  IS,
  ID,
  ActionNames extends ActionNameType,
  Actions
> = <AN extends ActionNameType, AP = {}>(actionName: AssertActionNotDefined<AN, ActionNames>) => ActionBuilder<StateNames, States, Transitions, IS, ID, ActionNames | AN, Actions | { [key in AN ]: Action<AN, AP>} >;

type AssertActionNotDefined<AN extends ActionNameType, ActionNames extends ActionNameType> = AN extends ActionNames ? ErrorBrand<'Action already defined'> : AN;

/*
export type HandlerMap<
  StateNames extends StateType,
  States,
  ActionNames extends ActionNameType,
  Actions
> = {
  [stateKey in StateNames]: {
    [actionKey in keyof Actions]?: <NextState extends States>(action: Actions[actionKey]) => NextState;
  };
};*/


type AssertHandlerMapComplete<StateNames extends StateType, Map> = [keyof Map] extends [StateNames] ? [StateNames] extends [keyof Map] ? Map : ErrorBrand<'State is missing from handler map'> : ErrorBrand<'Extraneous state in state map'>;

type AssertActionNameLegal<ActionNames, ActionName> = ActionName extends ActionNames ? ActionName : ErrorBrand<'Unknown action name'>;
type AssertActionTagsAreLegal<ActionNames, Map> = { [key in keyof Map]: AssertActionNameLegal<ActionNames, Map[key]>  }

export type IsValidHandlerMap<
  Map,
  StateNames extends StateType,
  States,
  Transitions,
  ActionNames extends ActionNameType,
  Actions
>  = AssertHandlerMapComplete<StateNames, Map>

type HandlerFunc<Fn, Transitions, C> = Fn extends (curState: C, action: any) => infer N ? TInTransition<C, N, Transitions> : never;

export type ActionHandlerFunc<
  StateNames extends StateType,
  States,
  Transitions,
  IS,
  ID,
  ActionNames extends ActionNameType,
  Actions extends { [k in ActionNames]: Actions[k] },
> = 
<S extends StateNames, A extends ActionNames, N extends States>(state: S, action: A, handler: (state: S, action: Actions[A]) => N extends UnvalidatedState<infer SN, infer D> ? Transition<S, SN> extends Transitions ? N : ErrorBrand<'Illegal transition'> : ErrorBrand<'Not a state'>) 
  => ActionHandlersBuilder<StateNames, States, Transitions, IS, ID, ActionNames, Actions>;


export type ActionHandlersBuilder<StateNames, States, Transitions, IS, ID, ActionNames, Actions> = {
  done: () => StateMachine<States, Transitions, IS, ID>,
}

/**
 * A state machine
 */
export type StateMachine<States, Transitions, IS, ID> = {
  validateTransition: ValidateFunction<States, Transitions>,
  initialState: () => ValidatedState<IS, ID>
}

/**
 * The call signature of the validate function on the StateMachine. Takes a current and next state data tuple (branded or not)
 * and returns the next state as a branded tuple.
 *
 * Will fail to compile if:
 *  1) The data associated with the current state doesn't match the state machine definition.
 *  2) The data associated with the next state doesn't match the state machine definition.
 *  3) The transition from current state to next state isn't a valid transition as per state machine definition
 *
 * Type generic arguments:
 *   States: The set of states in the state machine
 *   Datas: The set of unbranded state-data tuples in the state machine
 *   Transtions: The set of state transitions
 * Call generic arguments:
 *   C: The current state in the state machine. Must exist in the set of States (i.e. extend States)
 *   CD: The data payload type associated with current state. UnvalidatedStateData<C, CD> must exist in Datas
 *   N: The next state in the state machine. Must exist in the set of States (i.e. extend States)
 *   ND: The data payload type associated with the next state. UnvalidatedStateData<N, ND> must exist in Datas
 * @param _cur The current state-data tuple object. May be branded or unbranded.
 * @param next THe next state-data tuple object. May be branded or unbranded.
 * @return The next state as a branded state-data tuple object.
 *
 */
export type ValidateFunction<States, Transitions> = <CS, NS>(
  _cur: TInTransition<Transitions, SInState<States, CS>, NS>,
  next: SInState<States, NS>
) => NS & { _brand: void };

export const stateMachine = (): StateMachineBuilder => {
  return {
    state: state<never, never>()
  };
}

const state = <StateNames extends StateType, Datas>(): StateFunc<StateNames, Datas> => {
  return <S extends StateType, D = {}>(_s: AssertNewState<S, StateNames>) => {
    const initialStateFunc = initialState<StateNames | S, Datas | UnvalidatedState<S, D>>();
    const stateFunc = state<StateNames | S, Datas | UnvalidatedState<S, D>>()

    const builder: StateBuilder<StateNames | S, Datas | UnvalidatedState<S, D>> = {
      state: stateFunc,
      initialState: initialStateFunc,
    };

    return builder;
  }
}

const initialState = <StateNames extends StateType, States>(): InitialStateFunc<StateNames, States> => {
  return <S extends StateNames, D = {}>(initialState: IsLegalStateResolveUnvalidatedState<S, D, States>) => {
    const definition: StateMachineDefinition<S, D> = { initialState: initialState as unknown as ValidatedState<S, D> };

    return {
      transition: transition<StateNames, States, never, S, D>(definition),
      done: done<States, never, S, D>(definition)
    };
  };
}


const transition = <StateNames extends StateType, States, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): TransitionFunc<StateNames, States, Transitions, IS, ID> => {
  return <S extends StateNames, N extends StateNames>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    const transitionFunction = transition<StateNames, States, Transitions | Transition<S, N>, IS, ID>(definition);
    const actionFunc = action<StateNames, States, Transitions | Transition<S, N>, IS, ID, never, never>(definition);

    return {
      transition: transitionFunction,
      action: actionFunc,
    };
  };
}

const action = <StateNames extends StateType, States, Transitions, IS, ID, ActionNames extends ActionNameType, Actions>(definition: StateMachineDefinition<IS, ID>): ActionFunc<StateNames, States, Transitions, IS, ID, ActionNames, Actions> => {
  return <AN extends ActionNameType, AP>(_actionName: AssertActionNotDefined<AN, ActionNames>) => {
    const actionFunc = action<StateNames, States, Transitions, IS, ID, ActionNames | AN, Actions | Action<AN, AP>>(definition)
    const actionHandlerFunc = actionHandler<StateNames, States, Transitions, IS, ID, ActionNames | AN, Actions | Action<AN, AP>>(definition);

    return {
      action: actionFunc,
      actionHandler: actionHandlerFunc,
    };
  }
}

const actionHandler = <StateNames extends StateType, States, Transitions, IS, ID, ActionNames extends ActionNameType, Actions>(definition: StateMachineDefinition<IS, ID>) => {
  const doneFunc = done<States, Transitions, IS, ID>(definition);

  return <S extends StateNames, A extends ActionNames, N extends States>(state: S, action: A, handler: (s: S, action: A) => N extends UnvalidatedState<infer SN, infer D> ? Transition<S, SN> extends Transitions ? N : ErrorBrand<'Illegal transition'> : ErrorBrand<'Not a state'>) => {//actionHandlers: HandlerMap<StateNames, States, ActionNames, Actions>  ) => {
    return { 
      done: doneFunc
    };
  };
};

const done = <StateNames, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): () => StateMachine<StateNames, Transitions, IS, ID> => {
  return () => {
    const validateTransitionFunction: ValidateFunction<StateNames, Transitions> = <CS, NS>(
      _cur: TInTransition<Transitions, SInState<StateNames, CS>, NS>,
      next: SInState<StateNames, NS>
    ) => {
      return next as unknown as NS & { _brand: void };
    };

    return {
      validateTransition: validateTransitionFunction,
      initialState: () => definition.initialState
    };
  }
}

const x = stateMachine()
  .state('a')
  .state('b')
  .state('c')
  .initialState({state: 'a'})
  .transition('a', 'b')
  .action('a1')
  .action('a2')
  .actionHandler("a", "a1", (c, a) => {
    return {
      state: 'b' as const,
    }
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
  x.initialState;
  x.validateTransition