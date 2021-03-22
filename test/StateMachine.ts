import { stateMachine } from '../src/StateMachine';

describe('state machine', () => {
    it('transitions on action that causes transition', () => {
        const { nextState } = stateMachine()
            .state('a')
            .state('b')
            .transition('a', 'b')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _) => {
                return {
                    stateName: 'b',
                };
            })
            .done();

        const t1 = nextState({stateName: 'a'}, {actionName: 'a1'});
        expect(t1.stateName).toBe('b');
        const t2 = nextState(t1, {actionName: 'a1'});
        expect(t2.stateName).toBe('b');
    });

    it('does not transition on action that does not cause transition', () => {
        const { nextState } = stateMachine()
            .state('a')
            .state('b')
            .transition('a', 'b')
            .action('a1')
            .action('a2')
            .actionHandler('a', 'a1', (_c, _) => {
                return {
                    stateName: 'b',
                };
            })
            .done();

        const t1 = nextState({stateName: 'a'}, {actionName: 'a2'});
        expect(t1.stateName).toBe('a');
    });

    it('does not transition on action that does not cause transition', () => {
        type Payload = { count: number };

        const { nextState } = stateMachine()
            .state<'a', Payload>('a')
            .state<'b', Payload>('b')
            .transition('a', 'b')
            .action('a1')
            .action('a2')
            .actionHandler('a', 'a1', (_c, _) => {
                return {
                    stateName: 'b',
                    count: 7,
                };
            })
            .done();

        const t1 = nextState({stateName: 'a', count: 8}, {actionName: 'a2'});
        expect(t1.stateName).toBe('a');
    });
})

describe('compile-time checking', () => {
    it('should fail when specifying same state twice', () => {
        stateMachine()
            .state<'b'>('b')
            // @ts-expect-error
            .state<'b'>('b');
    });

    it('should fail when specifying same state twice, different payload', () => {
        type Payload = { count: number };

        stateMachine()
            .state<'b'>('b')
            // @ts-expect-error
            .state<'b', Payload>('b');
    });
    
    it('should fail when specifying the same transition twice', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            // @ts-expect-error
            .transition('a', 'b');
    });

    it('should fail when declaring transition from non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            // @ts-expect-error
            .transition('c', 'b');
    });

    it('should fail when declaring transition to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            // @ts-expect-error
            .transition('a', 'c');
    });

    it('should fail when declaring same action more than once', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .action('a1');
    });

    it('should fail when declaring same action more than once', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .action('a1');
    });

    it('should fail when declaring handler to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .actionHandler('c', 'a1', () => {
                return {
                    stateName: 'b'
                };
            });
            
    });

    it('should fail when declaring handler to non-action', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .actionHandler('a', 'a2', () => {
                return {
                    stateName: 'b'
                };
            });
            
    });

    it('should fail when declaring handler that transitions to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .actionHandler('a', 'a1', () => {
                return {
                    stateName: 'c'
                };
            });
    });


    it('should fail when declaring handler that makes undeclared transition to legal state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .state<'c'>('c')
            .transition('a', 'b')
            .action('a1')
            // @ts-expect-error
            .actionHandler('a', 'a1', () => {
                return {
                    stateName: 'c'
                };
            });
    });

    it('should succeed when declaring handler that makes declared transition to legal state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .state<'c'>('c')
            .transition('a', 'b')
            .action('a1')
            .actionHandler('a', 'a1', () => {
                return {
                    stateName: 'b' as const
                };
            });
    });

    it('should succeed when declaring handler that makes declared transitions to more than one legal state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b'
                } : {
                    stateName: 'a'
                };
            });
    });

    it('should succeed when declaring handler that makes declared transitions to more than one legal state (with payload)', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } : {
                    stateName: 'a',
                    foo: '7'
                };
            });
    });

    it('should fail when declaring handler that makes declared transitions to legal state, but bad payload', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .action('a1')
            // @ts-expect-error
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } : {
                    stateName: 'a',
                    foo: '9'
                };
            });
    });

    it('should fail when declaring handler for same state+action', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } : {
                    stateName: 'a',
                    foo: '7'
                };
            })
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } : {
                    stateName: 'a',
                    foo: '7'
                };
            });
    });
})