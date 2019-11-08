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
type StateType = string | number | boolean;

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
  data: IsLegalStateResolveUnvalidatedState<S, D, Datas>
) => TransitionBuilder<States, Datas, Transitions, S, D>

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
  readonly done: () => StateMachine<Datas, Transitions, IS, ID>
}

/**
 * A state machine
 */
export type StateMachine<Datas, Transitions, IS, ID> = {
  validateTransition: ValidateFunction<Datas, Transitions>,
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
export type ValidateFunction<Datas, Transitions> = <CS, NS>(
  _cur: TInTransition<Transitions, SInState<Datas, CS>, NS>,
  next: SInState<Datas, NS>
) => NS & { _brand: void };

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
  return <S extends States, D = {}>(initialState: IsLegalStateResolveUnvalidatedState<S, D, Datas>) => {
    const definition: StateMachineDefinition<S, D> = { initialState: initialState as unknown as ValidatedState<S, D> };

    return {
      transition: transition<States, Datas, Transitions, S, D>(definition),
      done: done<Datas, Transitions, S, D>(definition)
    };
  };
}


const transition = <States extends StateType, Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): TransitionFunc<States, Datas, Transitions, IS, ID> => {
  return <S extends States, N extends States>(_curState: S, _next: AssertNewTransition<S, N, Transitions>) => {
    const transitionFunction = transition<States, Datas, Transitions | Transition<S, N>, IS, ID>(definition);

    return {
      transition: transitionFunction,
      done: done<Datas, Transitions | Transition<S, N>, IS, ID>(definition)
    };
  };
}

const done = <Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): () => StateMachine<Datas, Transitions, IS, ID> => {
  return () => {
    const validateTransitionFunction: ValidateFunction<Datas, Transitions> = <CS, NS>(
      _cur: TInTransition<Transitions, SInState<Datas, CS>, NS>,
      next: SInState<Datas, NS>
    ) => {
      return next as unknown as NS & { _brand: void };
    };

    return {
      validateTransition: validateTransitionFunction,
      initialState: () => definition.initialState
    };
  }
}
