/**
 * Private
 * Represents a state transition
 */
type Transition<CurrentState, NextState> = {
  readonly cur: CurrentState;
  readonly next: NextState
}

/**
 * Private
 * States can be represented as string, number, or boolean literals.
 */
type IsStateType<T> = T extends string | number | boolean ? T : never;

/**
 * A branded state-data named tuple to which inline objects will not readily assign. Use this to define your states. Ensures that only
 * states coming out of the validate or initialState call get assigned to your states, guaranteeing (unless you resort to casting) that
 * your state machine is within specification at compile time.
 */
export type StateData<S, D = {}> = D & {
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
type UnvalidatedStateData<S, D = {}> = D & {
  readonly state: S;
}

/**
 * Private
 * A possibly validated state and data named tuple.
 */
type MaybeValidatedStateData<S, D> = StateData<S, D> | UnvalidatedStateData<S, D>;

/**
 * Private
 * The state machine definitiion.
 */
type StateMachineDefinition<IS, ID> = {
  initialState: StateData<IS, ID>;
};

/**
 * A builder from calling stateMachine().
 */
export type StateMachineBuilder<States, Datas, Transitions> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: <S, Data = {}>(
    state: IsStateType<S> extends States ? never : S
  ) => StateBuilder<States | S, Datas | UnvalidatedStateData<S, Data>, Transitions>;
}

/**
 * A builder from calling .state()
 */
export type StateBuilder<States, Datas, Transitions> = {
  /**
   * Add a state to this state machine.
   */
  readonly state: <S, Data = {}>(
    state: IsStateType<S> extends States ? never : S
  ) => StateBuilder<States | S, Datas | UnvalidatedStateData<S, Data>, Transitions>;

  /**
   * Sets the initial state for the state machine
   */
  readonly initialState: InitialStateFunction<States, Datas, Transitions>;
}

type InitialStateFunction<States, Datas, Transitions> = <S extends States, D>(
  data: UnvalidatedStateData<S, D> extends Datas ? UnvalidatedStateData<S, D> : never
) => TransitionBuilder<States, Datas, Transitions, S, D>

/**
 * A builder from calling .transition()
 */
export type TransitionBuilder<States, Datas, Transitions, IS, ID> = {
  /**
   * Add a transition to this state machine.
   */
  readonly transition: <S extends States, N extends States>(
    curState: S,
    nextState: Transition<S, N> extends Transitions ? never : N
  ) => TransitionBuilder<States, Datas, Transitions | Transition<S, N>, IS, ID>;

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
  initialState: () => StateData<IS, ID>
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
  _cur: UnvalidatedStateData<C, CD> extends Datas ? Transition<C, N> extends Transitions ? MaybeValidatedStateData<C, CD> : never : never,
  next: UnvalidatedStateData<N, ND> extends Datas ? MaybeValidatedStateData<N, ND> : never
) => StateData<N, ND>;

/**
 * A state machine type validation function that provides compile-time assertions that the passed state transition is valid.
 * @param cur The current state of the state machine. May result from a previous validation call or not.
 * @param next The next state of the state machine. May result from a previous validation call or not.
 * @returns If the state transition is valid, this function call will compile and return a validated StateData<N, ND>, which you can assign to other StateData<N, ND> types.
 */
export type ValidateStateMachine<States, Datas, Transitions> = <S extends States, SD, N extends States, ND>(
  cur: Transition<S, N> extends Transitions ? UnvalidatedStateData<S, SD> extends Datas ? MaybeValidatedStateData<S, SD> : never : never,
  next: UnvalidatedStateData<N, ND> extends Datas ? MaybeValidatedStateData<N, ND> : never
) => StateData<N, ND>;

export function stateMachine(): StateMachineBuilder<never, never, never> {
  return {
    state: state<never, never, never>()
  };
}

function state<States, Datas, Transitions>(): <S, D>(s: S) => StateBuilder<States | S extends States ? never : S, Datas | UnvalidatedStateData<S, D>, Transitions> {
  return <S, D = {}>(_s: S) => {
    return {
      state: state<States | S, Datas | StateData<S, D>, Transitions>(),
      initialState: initialState<States | S, Datas, Transitions>(),
    };
  }
}

function initialState<States, Datas, Transitions>(): <S extends States, D>(initialState: UnvalidatedStateData<S, D>) => TransitionBuilder<States, Datas, Transitions, S, D> {
  return <S, D = {}>(initialState: UnvalidatedStateData<S, D>) => {
    const definition = { initialState: initialState as StateData<S, D> };

    return {
      transition: transition<States, Datas, Transitions, S, D>(definition),
      done: done<States, Datas, Transitions, S, D>(definition)
    }
  };
}

function transition<States, Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): <S extends States, N extends States>(curState: S, next: N ) => TransitionBuilder<States, Datas, Transitions | Transition<S,N>, IS, ID> {
  return <S, N>(_curState: S, _next: N) => {
    return {
      transition: transition<States, Datas, Transitions, IS, ID>(definition),
      done: done<States, Datas, Transitions, IS, ID>(definition)
    };
  };
}

function done<States, Datas, Transitions, IS, ID>(definition: StateMachineDefinition<IS, ID>): () => StateMachine<States, Datas, Transitions, IS, ID> {
  return () => {
    return {
      validateTransition: <S, SD, N, ND>(_cur: MaybeValidatedStateData<S, SD>, nextData: MaybeValidatedStateData<N, ND>) => {
        return nextData as StateData<N, ND>;
      },
      initialState: () => definition.initialState
    }
  }
}
