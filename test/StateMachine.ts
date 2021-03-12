import { stateMachine } from '../src/StateMachine';

describe('state machine', () => {
    it('transitions on action that causes transition', () => {
        const { nextState } = stateMachine()
            .state('a')
            .state('b')
            .transition('a', 'b')
            .transition('b', 'b')
            .action('a1')
            .actionHandler('a', 'a1', (_c, _) => {
                return {
                    stateName: 'b',
                };
            })
            .actionHandler('b', 'a1', (c, _) => c)
            .done();

        const t1 = nextState({stateName: 'a'}, {actionName: 'a1'});
        expect(t1.stateName).toBe('b');
        const t2 = nextState(t1, {actionName: 'a1'});
        expect(t2.stateName).toBe('b');
    })
})