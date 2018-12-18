type Transition<CurrentState, NextState> = {
  readonly cur: CurrentState;
  readonly next: NextState
}

type IsString<T> = T extends string ? T : never;

export type StateData<S, D = {}> = D & {
  readonly state: S;
}

export type StateMachineBuilder<States, Datas, Transitions> = {
  readonly state: <S, Data = {}>(
    state: IsString<S> extends States ? never : S
  ) => StateBuilder<States | S, Datas | StateData<S, Data>, Transitions>;
}

export type StateBuilder<States, Datas, Transitions> = {
  readonly state: <S, Data = {}>(
    state: IsString<S> extends States ? never : S
  ) => StateBuilder<States | S, Datas | StateData<S, Data>, Transitions>;
  readonly transition: <S extends States, N extends States>(
    curState: S,
    nextState: Transition<S, N> extends Transitions ? never : N
  ) => TransitionBuilder<States, Datas, Transitions | Transition<S, N>>;
}

export type TransitionBuilder<States, Datas, Transitions> = {
  readonly transition: <S extends States, N extends States>(
    curState: S,
    nextState: Transition<S, N> extends Transitions ? never : N
  ) => TransitionBuilder<States, Datas, Transitions | Transition<S, N>>;
  readonly done: () => StateMachine<States, Datas, Transitions>
}

export type StateMachine<States, Datas, Transitions> = <S extends States, SD, N extends States, ND>(
  cur: Transition<S, N> extends Transitions ? StateData<S, SD> extends Datas ? StateData<S, SD> : never : never,
  nextData: StateData<N, ND> extends Datas ? StateData<N, ND> : never
) => ND;

export function stateMachine(): StateMachineBuilder<never, never, never> {
  return {
    state: state<never, never, never>()
  };
}

function state<States, Datas, Transitions>(): <S, D>(s: S) => StateBuilder<States | S extends States ? never : S, Datas | StateData<S, D>, Transitions> {
  return <S, D = {}>(_s: S) => {
    return {
      state: state<States | S, Datas | StateData<S, D>, Transitions>(),
      transition: transition<States | S, Datas, Transitions>(),
    };
  }
}

function transition<States, Datas, Transitions>(): <S extends States, N extends States>(curState: S, next: N ) => TransitionBuilder<States, Datas, Transitions | Transition<S, N>> {
  return <S, N>(_curState: S, _next: N) => {
    return {
      transition: transition<States, Datas, Transitions>(),
      done: done
    };
  };
}

function done<States, Datas, Transitions>(): StateMachine<States, Datas, Transitions> {
  return <S, SD, N, ND>(_cur: StateData<S, SD>, nextData: StateData<N, ND>) => {
    return nextData;
  }
}
