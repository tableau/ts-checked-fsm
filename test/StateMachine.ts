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
                } as const;
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
                    stateName: 'b' as const,
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
                    stateName: 'b' as const,
                    count: 7,
                };
            })
            .done();

        const t1 = nextState({stateName: 'a', count: 8}, {actionName: 'a2'});
        expect(t1.stateName).toBe('a');
    });

    it ('Works for a somewhat interesting scenario', () => {
        type MoneyPayload = {
            moneyInserted: number,
        };

        type ChangePayload = {
            changeRemaining: number,
        };

        type InsertMoneyActionPayload = {
            money: number,
        };

        const { nextState } = stateMachine()
            .state('idle')
            .state<'get-money', MoneyPayload>('get-money')
            .state<'vend', ChangePayload>('vend')
            .state<'dispense-change', ChangePayload>('dispense-change')
            .transition('idle', 'get-money')
            .transition('get-money', 'get-money')
            .transition('get-money', 'vend')
            .transition('vend', 'dispense-change')
            .transition('dispense-change', 'dispense-change')
            .transition('dispense-change', 'idle')
            .action<'insert-money', InsertMoneyActionPayload>('insert-money')
            .action<'vend-soda'>('vend-soda')
            .action<'clock-tick'>('clock-tick')
            .actionHandler('idle', 'insert-money', (_c, a) => {
                return {
                    stateName: 'get-money' as const,
                    moneyInserted: a.money,
                };
            })
            .actionHandler('get-money', 'insert-money', (c, a) => {
                return {
                    stateName: 'get-money' as const,
                    moneyInserted: c.moneyInserted + a.money
                };
            })
            .actionHandler('get-money', 'vend-soda', (c, _a) => {
                return c.moneyInserted >= 50 ? {
                    stateName: 'vend' as const,
                    changeRemaining: c.moneyInserted - 50
                } : c;
            })
            .actionHandler('vend', 'clock-tick', (c, _a) => {
                return {
                    stateName: 'dispense-change' as const,
                    changeRemaining: c.changeRemaining
                };
            })
            .actionHandler('dispense-change', 'clock-tick', (c, _a) => {
                const coinVal = c.changeRemaining >= 25
                    ? 25
                    : c.changeRemaining >= 10
                    ? 10
                    : c.changeRemaining >= 5
                    ? 5
                    : 1;

                return c.changeRemaining - coinVal > 0 ? {
                    stateName: 'dispense-change' as const,
                    changeRemaining: c.changeRemaining - coinVal
                } : {
                    stateName: 'idle' as const
                };
            })
            .done();

            let n = nextState({stateName: 'idle'}, { actionName: 'clock-tick'});
            // Idle state doesn't repsond to clock-tick, so state is unchanged
            expect(n).toEqual({stateName: 'idle'});
            n = nextState({stateName: 'idle'}, { actionName: 'insert-money', money: 25})
            expect(n).toEqual({stateName: 'get-money', moneyInserted: 25});
            n = nextState(n, { actionName: 'insert-money', money: 25});
            expect(n).toEqual({stateName: 'get-money', moneyInserted: 50});
            n = nextState(n, { actionName: 'insert-money', money: 27});
            expect(n).toEqual({stateName: 'get-money', moneyInserted: 77});
            n = nextState(n, { actionName: 'vend-soda'});
            expect(n).toEqual({stateName: 'vend', changeRemaining: 27});
            n = nextState(n, { actionName: 'clock-tick'});
            expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 27});
            n = nextState(n, { actionName: 'clock-tick'});
            expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 2});
            n = nextState(n, { actionName: 'clock-tick'});
            expect(n).toEqual({stateName: 'dispense-change', changeRemaining: 1});
            n = nextState(n, { actionName: 'clock-tick'});
            expect(n).toEqual({stateName: 'idle'});
    })
})

describe('compile-time checking', () => {
    it('should fail when specifying same state twice', () => {
        stateMachine()
            .state<'b'>('b')
            .state<'b'>(
                // @ts-expect-error
                'b'
            );
    });

    it('should fail when specifying same state twice, different payload', () => {
        type Payload = { count: number };

        stateMachine()
            .state<'b'>('b')
            .state<'b', Payload>(
                // @ts-expect-error
                'b'
            );
    });
    
    it('should fail when specifying the same transition twice', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .transition(
                'a',
                // @ts-expect-error
                'b'
            );
    });

    it('should fail when declaring transition from non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition(
                // @ts-expect-error
                'c',
                'b'
            );
    });

    it('should fail when declaring transition to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition(
                'a',
                // @ts-expect-error
                'c'
            );
    });

    it('should fail when declaring same action more than once', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            .action(
                // @ts-expect-error
                'a1'
            );
    });

    it('should fail when declaring same action more than once', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            .action(
                // @ts-expect-error
                'a1'
            );
    });

    it('should fail when declaring handler to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            .actionHandler(
                // @ts-expect-error
                'c',
                'a1',
                () => {
                    return {
                        stateName: 'b' as const
                    };
                }
            );
    });

    it('should fail when declaring handler to non-action', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            .actionHandler(
                'a',
                // @ts-expect-error
                'a2',
                () => {
                    return {
                        stateName: 'b' as const
                    };
                }
            );            
    });

    it('should fail when declaring handler that transitions to non-state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .transition('a', 'b')
            .action('a1')
            .actionHandler(
                'a',
                'a1',
                // @ts-expect-error
                () => {
                    return {
                        stateName: 'c' as const
                    };
                }
            );
    });

    it('should fail when declaring handler that makes undeclared transition to legal state', () => {
        stateMachine()
            .state<'a'>('a')
            .state<'b'>('b')
            .state<'c'>('c')
            .transition('a', 'b')
            .action('a1')
            .actionHandler(
                'a',
                'a1',
                // @ts-expect-error
                () => {
                    return {
                        stateName: 'c' as const
                    };
                }
            );
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
                    stateName: 'b' as const
                } : {
                    stateName: 'a' as const
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
                } as const : {
                    stateName: 'a',
                    foo: '7'
                } as const;
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
            .actionHandler(
                'a',
                'a1',
                // @ts-expect-error
                (_c, _a) => {
                    return Math.random () > 0.5 ? {
                        stateName: 'b' as const,
                        bar: '8' as const
                    } : {
                        stateName: 'a' as const,
                        foo: '9' as const
                    };
                }
            );
    });

    // TODO: Find a way to fix this without causing infinite type complaints
    it('should allow declaring handler for same state+action', () => {
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
                } as const : {
                    stateName: 'a',
                    foo: '7'
                } as const;
            })
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } as const : {
                    stateName: 'a',
                    foo: '7'
                } as const;
            });
    });

    it('should allow declaring same handler different state', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .transition('b', 'b')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } as const : {
                    stateName: 'a',
                    foo: '7'
                } as const;
            })
            .actionHandler('b', 'a1', (_c, _a) => {
                return {
                    stateName: 'b',
                    bar: '8'
                } as const;
            });
    });

    it('should be able to read action payload', () => {
        type Payload1 = { foo: number };
        type Payload2 = { bar: number };
        type ActionPayload = { val: 8 };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .transition('b', 'b')
            .action<'a1', ActionPayload>('a1')
            .actionHandler('a', 'a1', (_c, a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: a.val
                } as const : {
                    stateName: 'a',
                    foo: a.val
                } as const;
            })
            .actionHandler('b', 'a1', (_c, a) => {
                return {
                    stateName: 'b',
                    bar: a.val + 7
                } as const;
            });
    });

    it('Should fail when missing handler for non-terminal state (self-transition)', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .transition('a', 'b')
            .transition('a', 'a')
            .transition('b', 'b')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return Math.random () > 0.5 ? {
                    stateName: 'b',
                    bar: '8'
                } as const : {
                    stateName: 'a',
                    foo: '7'
                } as const;
            })
            // @ts-expect-error
            .done();
    });

    it('Should fail when missing handler for non-terminal state', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .state<'c', Payload2>('c')
            .transition('a', 'b')
            .transition('b', 'c')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return {
                    stateName: 'b',
                    bar: '8',
                } as const;
            })
            // @ts-expect-error
            .done();
    });

    it('Should succed all non-terminal handlers are declared', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .state<'c', Payload2>('c')
            .transition('a', 'b')
            .transition('b', 'c')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return {
                    stateName: 'b',
                    bar: '8',
                } as const;
            })
            .actionHandler('b', 'a1', (_c, _a) => {
                return {
                    stateName: 'c',
                    bar: '8',
                } as const;
            })
            .done();
    });

    it('Should succeed when all handlers are declared (no terminal states)', () => {
        type Payload1 = { foo: '7' };
        type Payload2 = { bar: '8' };

        stateMachine()
            .state<'a', Payload1>('a')
            .state<'b', Payload2>('b')
            .state<'c', Payload2>('c')
            .transition('a', 'b')
            .transition('b', 'c')
            .transition('c', 'a')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _a) => {
                return {
                    stateName: 'b',
                    bar: '8',
                } as const;
            })
            .actionHandler('b', 'a1', (_c, _a) => {
                return {
                    stateName: 'c',
                    bar: '8',
                } as const
            })
            .actionHandler('c', 'a1', (_c, _a) => {
                return {
                    stateName: 'a',
                    foo: '7',
                } as const;
            })
            .done();
    });

    it('Should allow large state machines', () => {
        const NO_DOC = {
            stateName: 'no-doc' as const
        };

        const NEW_DOC_STATE = {
            stateName: 'unnamed-doc' as const
        };

        const NAMED_DOC = {
            stateName: 'named-doc' as const
        };

        const FAILED_LOAD_DOC_STATE = {
            stateName: 'unrecoverable-error' as const
        };

        stateMachine()
            .state('no-doc')
            .state('unrecoverable-error')
            .state('unnamed-doc')
            .state('named-doc')
            .transition('no-doc', 'unnamed-doc') // new
            .transition('no-doc', 'named-doc') // open
            .transition('no-doc', 'unrecoverable-error') // error page
            .transition('unrecoverable-error', 'no-doc') // close error
            .transition('unnamed-doc', 'unnamed-doc') // new
            .transition('unnamed-doc', 'named-doc') // save as or open
            .transition('unnamed-doc', 'no-doc') // close
            .transition('unnamed-doc', 'unrecoverable-error') // error page
            .transition('named-doc', 'no-doc') // close
            .transition('named-doc', 'named-doc') // save as
            .transition('named-doc', 'unnamed-doc') // new
            .transition('named-doc', 'unrecoverable-error') // error page
            .action('new-flow') // Fired on new
            .action('named-flow-success') // Fired on save, save as, load
            .action('failure') // Fired on failure to load a flow
            .action('access-denied') // Also fired on failure to load a flow
            .action('close-flow')
            .action('update-doc-version')
            .action('user-create-connection')
            .action('new-flow1') // Fired on new
            .action('named-flow-success1') // Fired on save, save as, load
            .action('failure1') // Fired on failure to load a flow
            .action('access-denied1') // Also fired on failure to load a flow
            .action('close-flow1')
            .action('update-doc-version1')
            .action('user-create-connection1')
            .actionHandler('no-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('no-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('no-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('no-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .actionHandler('unnamed-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('unnamed-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'update-doc-version', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('unnamed-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('named-doc', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .actionHandler('named-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('named-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('named-doc', 'update-doc-version', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('named-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('named-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('unrecoverable-error', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .actionHandler('no-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('no-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('no-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('no-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .actionHandler('unnamed-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('unnamed-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'update-doc-version', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('unnamed-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('unnamed-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('named-doc', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .actionHandler('named-doc', 'new-flow', (_c, _a) => {
                return NEW_DOC_STATE;
            })
            .actionHandler('named-doc', 'named-flow-success', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('named-doc', 'update-doc-version', (_c, _a) => {
                return NAMED_DOC;
            })
            .actionHandler('named-doc', 'failure', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('named-doc', 'access-denied', (_c, _a) => {
                return FAILED_LOAD_DOC_STATE;
            })
            .actionHandler('unrecoverable-error', 'close-flow', (_c, _a) => {
                return NO_DOC;
            })
            .done();
    })
})