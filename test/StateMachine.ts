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