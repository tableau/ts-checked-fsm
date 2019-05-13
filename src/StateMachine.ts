/**
 * Private
 * Represents a state transition
 */
type Transition<CurrentState, NextState> = {
  readonly cur: CurrentState;
  readonly next: NextState
}

type ErrorBrand<T> = T & { _errorBrand: void };

// type NotAStateTypeError = 'The passed state value is not a state type. States must be string, number, or boolean literal.';
type StateAlreadyDeclaredError = 'The specified state has already been declared.';
type TransitionAlreadyDeclaredError = 'This transition has already been declared.';
type IllegalStateError = 'The specified state has not been declared or the other keys/values in the state object are invalid or missing.';
type IllegalTransitionError = 'There exists no transition from the specifed current state to the next state.';

/**
 * Private
 * States can be represented as string, number, or boolean literals.
 */
// type IsStateType<T> = T extends string | number | boolean ? T : ErrorBrand<NotAStateTypeError>;
type StateType = string | number | boolean;

/**
 * A branded state-data named tuple to which inline objects will not readily assign. Use this to define your states. Ensures that only
 * states coming out of the validate or initialState call get assigned to your states, guaranteeing (unless you resort to casting) that
 * your state machine is within specification at compile time.
 */
export type ValidatedState<S, D = {}> = D & {
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
export type UnvalidatedState<S, D = {}> = D & {
  readonly state: S;
}

/**
 * Private
 * A possibly validated state and data named tuple.
 */
type MaybeValidatedStateData<S, D> = ValidatedState<S, D> | UnvalidatedState<S, D>;

/**
 * Private
 * The state machine definitiion.
 */
type StateMachineDefinition<IS, ID> = {
  initialState: ValidatedState<IS, ID>;
};

type StateFunc<States extends StateType, Datas, Transitions> = <S extends StateType, Data = {}>(
  state: AssertNewState<S, States>
) => StateBuilder<States | S, Datas | UnvalidatedState<S, Data>, Transitions>;

/**
 * A builder from calling stateMachine().
 */
export type StateMachineBuilder<States extends StateType, Datas, Transitions> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<States, Datas, Transitions>;
}

/**
 * A builder from calling .state()
 */
export type StateBuilder<States extends StateType, Datas, Transitions> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: StateFunc<States, Datas, Transitions>;

  /**
   * Sets the initial state for the state machine
   */
  readonly initialState: InitialStateFunc<States, Datas, Transitions>;
}

type InitialStateFunc<States extends StateType, Datas, Transitions> = <S extends States, D>(
  data: IsLegalState<S, D, Datas>
) => TransitionBuilder<States, Datas, Transitions, S, D>

type IsLegalState<S, D, Datas> = UnvalidatedState<S, D> extends Datas ? UnvalidatedState<S, D> : ErrorBrand<IllegalStateError>;
type AssertNewState<S, States> = S extends States ? ErrorBrand<StateAlreadyDeclaredError> : S;
type AssertNewTransition<S, N, Transitions> = Transition<S, N> extends Transitions ? ErrorBrand<TransitionAlreadyDeclaredError> : N;

type TransitionFunc<States extends StateType, Datas, Transitions, IS, ID> = <S extends States, N extends States>(
  curState: S,
  nextState: AssertNewTransition<S, N, Transitions>
) => TransitionBuilder<States, Datas, Transitions | Transition<S, N>, IS, ID>;

/**
 * A builder from calling .transition()
 */
export type TransitionBuilder<States extends StateType, Datas, Transitions, IS, ID> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: TransitionFunc<States, Datas, Transitions, IS, ID>;

  /**
   * Finalize the state machine type.
   */
  readonly done: () => StateMachine<States, Datas, Transitions, IS, ID>
}

/**
 * A state machine
 */
export type StateMachine<States, Datas, Transitions, IS, ID> = {
  validateTransition: ValidateFunction<States, Datas, Transitions>,
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
export type ValidateFunction<States, Datas, Transitions> = <C extends States, CD, N extends States, ND>(
  _cur: UnvalidatedState<C, CD> extends Datas ? Transition<C, N> extends Transitions ? MaybeValidatedStateData<C, CD> : ErrorBrand<IllegalTransitionError> : ErrorBrand<IllegalStateError>,
  next: UnvalidatedState<N, ND> extends Datas ? MaybeValidatedStateData<N, ND> : ErrorBrand<IllegalStateError>
) => ValidatedState<N, ND>;

export const stateMachine = (): StateMachineBuilder<never, never, never> => {
  return {
    state: state<never, never, never>()
  };
}

const state = <States extends StateType, Datas, Transitions>(): StateFunc<States, Datas, Transitions> => {
  return <S extends StateType, D = {}>(_s: AssertNewState<S, States>) => {
    const initialStateFunction: InitialStateFunc<States | S, Datas | UnvalidatedState<S, D>, Transitions> = initialState();

    const builder: StateBuilder<States | S, Datas | UnvalidatedState<S, D>, Transitions> = {
      state: state<States | S, Datas | UnvalidatedState<S, D>, Transitions>(),
      initialState: initialStateFunction,
    };

    return builder;
  }
}

const initialState = <States extends StateType, Datas, Transitions>(): InitialStateFunc<States, Datas, Transitions> => {
  return <S extends States, D = {}>(initialState: IsLegalState<S, D, Datas>) => {
    const definition: StateMachineDefinition<S, D> = { initialState: initialState as unknown as ValidatedState<S, D> };

    return {
      transition: transition<States, Datas, Transitions, S, D>(definition),
      done: done<States, Datas, Transitions, S, D>(definition)
    };
  };
}


const transition = <States extends StateType, Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): TransitionFunc<States, Datas, Transitions, IS, ID> => {
  return <S extends States, N extends States>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    const transitionFunction = transition<States, Datas, Transitions | Transition<S, N>, IS, ID>(definition);

    return {
      transition: transitionFunction,
      done: done<States, Datas, Transitions | Transition<S, N>, IS, ID>(definition)
    };
  };
}

const done = <States extends StateType, Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): () => StateMachine<States, Datas, Transitions, IS, ID> => {
  return () => {
    const validateTransitionFunction: ValidateFunction<States, Datas, Transitions> = <C extends States, CD, N extends States, ND>(
      _cur: UnvalidatedState<C, CD> extends Datas ? Transition<C, N> extends Transitions ? MaybeValidatedStateData<C, CD> : ErrorBrand<IllegalTransitionError> : ErrorBrand<IllegalStateError>,
      nextData: UnvalidatedState<N, ND> extends Datas ? MaybeValidatedStateData<N, ND> : ErrorBrand<IllegalStateError>
    ) => {
      return nextData as unknown as ValidatedState<N, ND>;
    };

    return {
      validateTransition: validateTransitionFunction,
      initialState: () => definition.initialState
    };
  }
}
