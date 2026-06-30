import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getSlimeUltimateSummonCount,
    isSlimeUltimateReady
} from '../guangboo-runtime.mjs';

test('slime ultimate summons exactly one baby slime per successful hit, capped at four', () => {
    const cases = [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 4],
        [99, 4]
    ];

    for (const [hits, expectedSummons] of cases) {
        assert.equal(getSlimeUltimateSummonCount(hits), expectedSummons, `${hits} hits`);
    }
});

test('slime ultimate is ready from the first successful hit only', () => {
    assert.equal(isSlimeUltimateReady(0), false);
    assert.equal(isSlimeUltimateReady(1), true);
    assert.equal(isSlimeUltimateReady(2), true);
    assert.equal(isSlimeUltimateReady(3), true);
    assert.equal(isSlimeUltimateReady(4), true);
    assert.equal(isSlimeUltimateReady(5), true);
});
