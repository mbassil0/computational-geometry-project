const pruningRuleSettings = {
    I: true,
    II: true,
    IIIa: true,
    IIIb: true,
    IIIc: true,
    IV: true
};
const greedySettings = { enabled: false };
let greedyFilterResult = { status: "off", moves: 0 };

function firstCellIndex(coordinate) {
    return Math.floor(coordinate);
}

function boxCellCount(min, max) {
    return Math.max(0, Math.ceil(max - EPS) - firstCellIndex(min));
}

function clipFreeInterval(interval, min, max) {
    if (interval === null) return null;

    const lower = Math.max(interval[0], min);
    const upper = Math.min(interval[1], max);
    return lower <= upper + EPS ? [lower, upper] : null;
}

function runFirstPruningRule(B, leftInput, bottomInput) {
    // Check whether an entire input boundary is empty.
    const leftEmpty = leftInput.every(
        interval => interval === null
    );

    const bottomEmpty = bottomInput.every(
        interval => interval === null
    );

    // Rule I applies only if BOTH inputs are empty.
    if (!leftEmpty || !bottomEmpty) {
        return {
            applied: false
        };
    }

    const width = boxCellCount(B.iMin, B.iMax);
    const height = boxCellCount(B.jMin, B.jMax);

    // Both outputs must be empty.
    return {
        applied: true,

        rightOutput: Array(height).fill(null),
        topOutput: Array(width).fill(null)
    };
}

function runSecondPruningRule(B, leftInput, bottomInput) {
    const width = boxCellCount(B.iMin, B.iMax);
    const height = boxCellCount(B.jMin, B.jMax);

    // Check whether an input boundary is entirely empty.
    const leftEmpty = leftInput.every(
        interval => interval === null
    );

    const bottomEmpty = bottomInput.every(
        interval => interval === null
    );

    // Find the first reachable coordinate along a boundary.
    // Each interval is expressed in local segment coordinates.
    function firstReachableCoordinate(input, startIndex) {
        for (let k = 0; k < input.length; k++) {
            const interval = input[k];

            if (interval !== null) {
                return startIndex + k + interval[0];
            }
        }

        return null;
    }

    // CASE 1: EMPTY BOTTOM INPUT
    // Shrink vertically
    if (bottomEmpty && !leftEmpty) {
        const newJMin = firstReachableCoordinate(
            leftInput,
            firstCellIndex(B.jMin)
        );

        // Only shrink if the new boundary is strictly
        // inside the current box.
        if (
            newJMin > B.jMin + EPS &&
            newJMin < B.jMax - EPS
        ) {
            const offset = firstCellIndex(newJMin) - firstCellIndex(B.jMin);
            const newBox = {
                ...B,
                jMin: newJMin
            };

            // Remove the discarded lower portion.
            const newLeftInput = leftInput.slice(offset);

            // The new bottom boundary has no reachable
            // points below the first reachable point.
            const newBottomInput = Array(width).fill(null);

            return {
                applied: true,
                box: newBox,
                leftInput: newLeftInput,
                bottomInput: newBottomInput,
                axis: "j",
                offset: offset,
                removedBox: {
                    iMin: B.iMin,
                    iMax: B.iMax,
                    jMin: B.jMin,
                    jMax: newJMin
                }
            };
        }
    }

    // CASE 2: EMPTY LEFT INPUT
    // Shrink horizontally (symmetric rule)
    if (leftEmpty && !bottomEmpty) {
        const newIMin = firstReachableCoordinate(
            bottomInput,
            firstCellIndex(B.iMin)
        );

        if (
            newIMin > B.iMin + EPS &&
            newIMin < B.iMax - EPS
        ) {
            const offset = firstCellIndex(newIMin) - firstCellIndex(B.iMin);
            const newBox = {
                ...B,
                iMin: newIMin
            };

            // Remove the discarded left portion.
            const newBottomInput = bottomInput.slice(offset);

            // Left input remains empty.
            const newLeftInput = Array(height).fill(null);

            return {
                applied: true,
                box: newBox,
                leftInput: newLeftInput,
                bottomInput: newBottomInput,
                axis: "i",
                offset: offset,
                removedBox: {
                    iMin: B.iMin,
                    iMax: newIMin,
                    jMin: B.jMin,
                    jMax: B.jMax
                }
            };
        }
    }

    // RULE II DOES NOT APPLY
    return {
        applied: false
    };
}

function getSimpleBoundaryIntervals(B, freeIntervals, boundary) {
    const intervals = [];

    if (boundary === "top") {
        const j = B.jMax - 1;
        const firstI = firstCellIndex(B.iMin);
        for (let i = firstI; i < B.iMax; i++) {
            intervals.push(clipFreeInterval(
                freeIntervals[j][i].T,
                B.iMin - i,
                B.iMax - i
            ));
        }
    } else {
        const i = B.iMax - 1;
        const firstJ = firstCellIndex(B.jMin);
        for (let j = firstJ; j < B.jMax; j++) {
            intervals.push(clipFreeInterval(
                freeIntervals[j][i].R,
                B.jMin - j,
                B.jMax - j
            ));
        }
    }

    let components = 0;
    let previousReachesEnd = false;

    for (const interval of intervals) {
        if (interval === null) {
            previousReachesEnd = false;
            continue;
        }

        const joinsPrevious =
            previousReachesEnd && interval[0] <= EPS;

        if (!joinsPrevious) components++;
        previousReachesEnd = interval[1] >= 1 - EPS;
    }

    let firstCoordinate = null;
    for (let index = 0; index < intervals.length; index++) {
        if (intervals[index] !== null) {
            const start = boundary === "top"
                ? firstCellIndex(B.iMin)
                : firstCellIndex(B.jMin);
            firstCoordinate = start + index + intervals[index][0];
            break;
        }
    }

    return {
        intervals: copyReachableIntervals(intervals),
        components: components,
        isSimple: components <= 1,
        firstCoordinate: firstCoordinate
    };
}

function isReachableAtCoordinate(intervals, startIndex, coordinate) {
    if (!Array.isArray(intervals)) return false;

    const localCoordinate = coordinate - firstCellIndex(startIndex);

    for (let index = 0; index < intervals.length; index++) {
        const interval = intervals[index];
        if (interval === null) continue;

        const local = localCoordinate - index;
        if (
            local >= interval[0] - EPS &&
            local <= interval[1] + EPS
        ) {
            return true;
        }
    }

    return false;
}

function pointAtCurveParameter(curve, parameter) {
    const lastIndex = curve.length - 1;
    const clamped = Math.max(0, Math.min(lastIndex, parameter));

    if (clamped >= lastIndex) return curve[lastIndex];

    const segment = Math.floor(clamped);
    return interpolate(
        curve[segment],
        curve[segment + 1],
        clamped - segment
    );
}

function isCurveSubpathInsideFreeSpace(fixedPoint, curve, start, end) {
    const firstVertex = Math.ceil(start - EPS);
    const lastVertex = Math.floor(end + EPS);
    const pointsToCheck = [
        pointAtCurveParameter(curve, start),
        pointAtCurveParameter(curve, end)
    ];

    for (let index = firstVertex; index <= lastVertex; index++) {
        if (index > start + EPS && index < end - EPS) {
            pointsToCheck.push(curve[index]);
        }
    }

    return pointsToCheck.every(point => {
        const dx = fixedPoint.x - point.x;
        const dy = fixedPoint.y - point.y;
        return dx * dx + dy * dy <= delta * delta + EPS;
    });
}

function runThirdPruningRule(
    P, Q, B, freeIntervals, leftInput, bottomInput, boundary
) {
    const simple = getSimpleBoundaryIntervals(B, freeIntervals, boundary);
    if (!simple.isSimple) return { applied: false };

    const axisStart = boundary === "top" ? B.iMin : B.jMin;

    if (pruningRuleSettings.IIIa && simple.firstCoordinate === null) {
        return {
            applied: true,
            output: simple.intervals,
            event: {
                rule: "III",
                subrule: "a",
                boundary: boundary,
                box: { ...B },
                intervals: simple.intervals,
                reason: `The ${boundary} boundary is simple and has no free points.`
            }
        };
    }

    if (
        pruningRuleSettings.IIIb &&
        simple.firstCoordinate !== null &&
        simple.firstCoordinate <= axisStart + EPS
    ) {
        const cornerReachable = boundary === "top"
            ? isReachableAtCoordinate(leftInput, B.jMin, B.jMax)
            : isReachableAtCoordinate(bottomInput, B.iMin, B.iMax);

        if (cornerReachable) {
            return {
                applied: true,
                output: simple.intervals,
                event: {
                    rule: "III",
                    subrule: "b",
                    boundary: boundary,
                    box: { ...B },
                    intervals: simple.intervals,
                    reason: `The ${boundary} boundary is simple, starts free, and its starting corner is reachable.`
                }
            };
        }
    } else if (
        pruningRuleSettings.IIIc &&
        simple.firstCoordinate !== null &&
        simple.firstCoordinate > axisStart + EPS
    ) {
        const startIsReachable = boundary === "top"
            ? isReachableAtCoordinate(
                bottomInput,
                B.iMin,
                simple.firstCoordinate
            )
            : isReachableAtCoordinate(
                leftInput,
                B.jMin,
                simple.firstCoordinate
            );

        let throughPathIsFree = false;
        let via = null;

        if (startIsReachable && boundary === "top") {
            const fixedP = pointAtCurveParameter(P, simple.firstCoordinate);
            throughPathIsFree = isCurveSubpathInsideFreeSpace(
                fixedP,
                Q,
                B.jMin,
                B.jMax
            );
            via = {
                x: simple.firstCoordinate,
                yMin: B.jMin,
                yMax: B.jMax
            };
        } else if (startIsReachable) {
            const fixedQ = pointAtCurveParameter(Q, simple.firstCoordinate);
            throughPathIsFree = isCurveSubpathInsideFreeSpace(
                fixedQ,
                P,
                B.iMin,
                B.iMax
            );
            via = {
                y: simple.firstCoordinate,
                xMin: B.iMin,
                xMax: B.iMax
            };
        }

        if (startIsReachable && throughPathIsFree) {
            return {
                applied: true,
                output: simple.intervals,
                event: {
                    rule: "III",
                    subrule: "c",
                    boundary: boundary,
                    box: { ...B },
                    intervals: simple.intervals,
                    via: via,
                    reason: `The first free point on the ${boundary} boundary is reachable through a free segment inside the box.`
                }
            };
        }
    }

    return { applied: false };
}

function runPruningRules(
    P, Q, B, rootB, freeIntervals, leftInput, bottomInput, requestedOutputs
) {
    const events = [];
    let box = { ...B };
    let currentLeftInput = copyReachableIntervals(leftInput);
    let currentBottomInput = copyReachableIntervals(bottomInput);
    const wantRight = requestedOutputs.right;
    const wantTop = requestedOutputs.top;
    const firstRule = pruningRuleSettings.I
        ? runFirstPruningRule(box, currentLeftInput, currentBottomInput)
        : { applied: false };

    if (firstRule.applied) {
        events.push({
            rule: "I",
            box: { ...box },
            reason: "Both inputs are empty, so both outputs are empty."
        });

        return {
            box: box,
            leftInput: currentLeftInput,
            bottomInput: currentBottomInput,
            rightOutput: wantRight ? firstRule.rightOutput : null,
            topOutput: wantTop ? firstRule.topOutput : null,
            events: events,
            terminal: true,
            shrink: null
        };
    }

    const secondRule = pruningRuleSettings.II
        ? runSecondPruningRule(box, currentLeftInput, currentBottomInput)
        : { applied: false };

    let shrink = null;
    if (secondRule.applied) {
        const before = { ...box };
        box = secondRule.box;
        currentLeftInput = secondRule.leftInput;
        currentBottomInput = secondRule.bottomInput;
        shrink = {
            axis: secondRule.axis,
            offset: secondRule.offset,
            before: before,
            after: { ...box },
            removedBox: { ...secondRule.removedBox }
        };
        events.push({
            rule: "II",
            ...shrink,
            reason: secondRule.axis === "j"
                ? "The bottom input is empty; the box is cut at the first reachable point on the left."
                : "The left input is empty; the box is cut at the first reachable point on the bottom."
        });
    }

    if (
        boxCellCount(box.iMin, box.iMax) === 1 &&
        boxCellCount(box.jMin, box.jMax) === 1
    ) {
        return {
            box: box,
            leftInput: currentLeftInput,
            bottomInput: currentBottomInput,
            rightOutput: wantRight ? undefined : null,
            topOutput: wantTop ? undefined : null,
            events: events,
            terminal: false,
            shrink: shrink
        };
    }

    let rightOutput = wantRight ? undefined : null;
    let topOutput = wantTop ? undefined : null;
    const useSimpleBoundaryRules =
        pruningRuleSettings.IIIa ||
        pruningRuleSettings.IIIb ||
        pruningRuleSettings.IIIc;

    if (wantTop && useSimpleBoundaryRules) {
        const topRule = runThirdPruningRule(
            P, Q, box, freeIntervals,
            currentLeftInput, currentBottomInput, "top"
        );
        if (topRule.applied) {
            topOutput = topRule.output;
            events.push(topRule.event);
        }
    }

    if (wantRight && useSimpleBoundaryRules) {
        const rightRule = runThirdPruningRule(
            P, Q, box, freeIntervals,
            currentLeftInput, currentBottomInput, "right"
        );
        if (rightRule.applied) {
            rightOutput = rightRule.output;
            events.push(rightRule.event);
        }
    }

    const touchesGlobalTop = box.jMax === rootB.jMax;
    const touchesGlobalRight = box.iMax === rootB.iMax;

    // Rule IV removes an external output once the other side is known.
    if (pruningRuleSettings.IV && touchesGlobalTop && isFullyKnownBoundaryOutput(rightOutput) && wantTop) {
        topOutput = null;
        events.push({
            rule: "IV",
            boundary: "top",
            box: { ...box },
            reason: "The box touches the diagram's top edge. Any path through it to the endpoint must cross its right boundary, which is already known, so the top output is unnecessary."
        });
    } else if (pruningRuleSettings.IV && touchesGlobalRight && isFullyKnownBoundaryOutput(topOutput) && wantRight) {
        rightOutput = null;
        events.push({
            rule: "IV",
            boundary: "right",
            box: { ...box },
            reason: "The box touches the diagram's right edge. Any path through it to the endpoint must cross its top boundary, which is already known, so the right output is unnecessary."
        });
    }

    return {
        box: box,
        leftInput: currentLeftInput,
        bottomInput: currentBottomInput,
        rightOutput: rightOutput,
        topOutput: topOutput,
        events: events,
        terminal: rightOutput !== undefined && topOutput !== undefined,
        shrink: shrink
    };
}

function propagateSingleCell(B, freeIntervals, leftInput, bottomInput) {
    const i = firstCellIndex(B.iMin);
    const j = firstCellIndex(B.jMin);

    // Get free intervals of this cell
    const free = freeIntervals[j][i];

    // Compute reachable right boundary
    const rightOutput = computeReachableRight(
        leftInput,
        bottomInput,
        free.R
    );

    // Compute reachable top boundary
    const topOutput = computeReachableTop(
        leftInput,
        bottomInput,
        free.T
    );

    return {
        rightOutput: rightOutput,
        topOutput: topOutput
    };
}

let boxStepClock = 0;

function copyReachableIntervals(intervals) {
    if (!Array.isArray(intervals)) return null;

    return intervals.map(interval => {
        if (interval === null || interval === undefined) return interval;
        return [...interval];
    });
}

function isFullyKnownBoundaryOutput(intervals) {
    return Array.isArray(intervals) &&
        intervals.every(interval => interval !== undefined);
}

function runDivideAndConquer(
    P,
    Q,
    B,
    freeIntervals,
    leftInput,
    bottomInput,
    depth = 0,
    rootB = B,
    requestedOutputs = { right: true, top: true }
) {
    const originalB = { ...B };
    const stepIndex = boxSteps.length;
    const startOrder = boxStepClock++;
    const requested = {
        right: requestedOutputs.right !== false,
        top: requestedOutputs.top !== false
    };

    boxSteps.push({
        B: originalB,
        originalB: originalB,
        effectiveB: { ...B },
        depth: depth,
        type: "processing",
        startOrder: startOrder,
        leftInput: copyReachableIntervals(leftInput),
        bottomInput: copyReachableIntervals(bottomInput),
        ruleEvents: []
    });

    const step = boxSteps[stepIndex];

    function finish(result, type) {
        let rightOutput = result.rightOutput;
        let topOutput = result.topOutput;

        if (result.shrink && result.shrink.axis === "j") {
            if (Array.isArray(rightOutput)) {
                rightOutput = Array(result.shrink.offset).fill(null)
                    .concat(rightOutput);
            }
        } else if (result.shrink && result.shrink.axis === "i") {
            if (Array.isArray(topOutput)) {
                topOutput = Array(result.shrink.offset).fill(null)
                    .concat(topOutput);
            }
        }

        step.type = type;
        step.effectiveB = { ...result.box };
        step.effectiveLeftInput = copyReachableIntervals(result.leftInput);
        step.effectiveBottomInput = copyReachableIntervals(result.bottomInput);
        step.rightOutput = copyReachableIntervals(rightOutput);
        step.topOutput = copyReachableIntervals(topOutput);
        step.finishOrder = boxStepClock++;

        return {
            rightOutput: rightOutput,
            topOutput: topOutput
        };
    }

    const pruning = runPruningRules(
        P,
        Q,
        B,
        rootB,
        freeIntervals,
        leftInput,
        bottomInput,
        requested
    );

    step.ruleEvents.push(...pruning.events);
    step.effectiveB = { ...pruning.box };
    step.effectiveLeftInput = copyReachableIntervals(pruning.leftInput);
    step.effectiveBottomInput = copyReachableIntervals(pruning.bottomInput);

    if (
        !pruning.terminal &&
        boxCellCount(pruning.box.iMin, pruning.box.iMax) === 1 &&
        boxCellCount(pruning.box.jMin, pruning.box.jMax) === 1
    ) {
        const cellResult = propagateSingleCell(
            pruning.box,
            freeIntervals,
            pruning.leftInput[0],
            pruning.bottomInput[0]
        );

        return finish({
            box: pruning.box,
            leftInput: pruning.leftInput,
            bottomInput: pruning.bottomInput,
            rightOutput: requested.right ? [cellResult.rightOutput] : null,
            topOutput: requested.top ? [cellResult.topOutput] : null,
            shrink: pruning.shrink
        }, pruning.shrink ? "cell-after-shrink" : "cell");
    }

    if (pruning.terminal) {
        const appliedRules = pruning.events.map(event => event.rule).join("+");
        return finish(pruning, appliedRules ? `pruned-${appliedRules}` : "pruned");
    }

    const activeB = pruning.box;
    const activeLeftInput = pruning.leftInput;
    const activeBottomInput = pruning.bottomInput;
    const activeWidth = boxCellCount(activeB.iMin, activeB.iMax);
    const activeHeight = boxCellCount(activeB.jMin, activeB.jMax);
    let rightOutput = pruning.rightOutput;
    let topOutput = pruning.topOutput;
    const needRight = requested.right && rightOutput === undefined;
    const needTop = requested.top && topOutput === undefined;
    let B1;
    let B2;
    let output1;
    let output2;

    // SPLIT THE BOX
    if (activeHeight > activeWidth) {
        step.type = "split-horizontal";
        const mid = Math.floor((firstCellIndex(activeB.jMin) + activeB.jMax) / 2);

        B1 = {
            iMin: activeB.iMin,
            iMax: activeB.iMax,
            jMin: activeB.jMin,
            jMax: mid
        };
        B2 = {
            iMin: activeB.iMin,
            iMax: activeB.iMax,
            jMin: mid,
            jMax: activeB.jMax
        };
        step.children = [{ ...B1 }, { ...B2 }];

        const height1 = mid - firstCellIndex(activeB.jMin);
        const child1StepIndex = boxSteps.length;
        output1 = runDivideAndConquer(
            P,
            Q,
            B1,
            freeIntervals,
            activeLeftInput.slice(0, height1),
            activeBottomInput,
            depth + 1,
            rootB,
            { right: needRight, top: true }
        );

        const child2StepIndex = boxSteps.length;
        output2 = runDivideAndConquer(
            P,
            Q,
            B2,
            freeIntervals,
            activeLeftInput.slice(height1),
            output1.topOutput,
            depth + 1,
            rootB,
            { right: needRight, top: needTop }
        );

        step.childStepIndices = [child1StepIndex, child2StepIndex];

        if (rightOutput === undefined) {
            const right1 = Array.isArray(output1.rightOutput)
                ? output1.rightOutput
                : Array(boxCellCount(B1.jMin, B1.jMax)).fill(undefined);
            const right2 = Array.isArray(output2.rightOutput)
                ? output2.rightOutput
                : Array(boxCellCount(B2.jMin, B2.jMax)).fill(undefined);
            rightOutput = [...right1, ...right2];
        }
        if (topOutput === undefined) {
            topOutput = output2.topOutput;
        }
    } else {
        step.type = "split-vertical";
        const mid = Math.floor((firstCellIndex(activeB.iMin) + activeB.iMax) / 2);

        B1 = {
            iMin: activeB.iMin,
            iMax: mid,
            jMin: activeB.jMin,
            jMax: activeB.jMax
        };
        B2 = {
            iMin: mid,
            iMax: activeB.iMax,
            jMin: activeB.jMin,
            jMax: activeB.jMax
        };
        step.children = [{ ...B1 }, { ...B2 }];

        const width1 = mid - firstCellIndex(activeB.iMin);
        const child1StepIndex = boxSteps.length;
        output1 = runDivideAndConquer(
            P,
            Q,
            B1,
            freeIntervals,
            activeLeftInput,
            activeBottomInput.slice(0, width1),
            depth + 1,
            rootB,
            { right: true, top: needTop }
        );

        const child2StepIndex = boxSteps.length;
        output2 = runDivideAndConquer(
            P,
            Q,
            B2,
            freeIntervals,
            output1.rightOutput,
            activeBottomInput.slice(width1),
            depth + 1,
            rootB,
            { right: needRight, top: needTop }
        );

        step.childStepIndices = [child1StepIndex, child2StepIndex];

        if (rightOutput === undefined) {
            rightOutput = output2.rightOutput;
        }
        if (topOutput === undefined) {
            const top1 = Array.isArray(output1.topOutput)
                ? output1.topOutput
                : Array(boxCellCount(B1.iMin, B1.iMax)).fill(undefined);
            const top2 = Array.isArray(output2.topOutput)
                ? output2.topOutput
                : Array(boxCellCount(B2.iMin, B2.iMax)).fill(undefined);
            topOutput = [...top1, ...top2];
        }
    }

    // A recursive child can make one exterior output unnecessary after it
    // resolves the opposite side. This is Rule IV at the parent boundary.
    if (
        pruningRuleSettings.IV &&
        activeB.jMax === rootB.jMax &&
        isFullyKnownBoundaryOutput(rightOutput) &&
        topOutput !== null
    ) {
        topOutput = null;
        if (!step.ruleEvents.some(event => event.rule === "IV" && event.boundary === "top")) {
            step.ruleEvents.push({
                rule: "IV",
                boundary: "top",
                box: { ...activeB },
                reason: "The box touches the diagram's top edge and its right output is known."
            });
        }
    } else if (
        pruningRuleSettings.IV &&
        activeB.iMax === rootB.iMax &&
        isFullyKnownBoundaryOutput(topOutput) &&
        rightOutput !== null
    ) {
        rightOutput = null;
        if (!step.ruleEvents.some(event => event.rule === "IV" && event.boundary === "right")) {
            step.ruleEvents.push({
                rule: "IV",
                boundary: "right",
                box: { ...activeB },
                reason: "The box touches the diagram's right edge and its top output is known."
            });
        }
    }

    return finish({
        box: activeB,
        leftInput: activeLeftInput,
        bottomInput: activeBottomInput,
        rightOutput: rightOutput,
        topOutput: topOutput,
        shrink: pruning.shrink
    }, step.type);
}

function runGreedyFilter(P, Q) {
    const isClose = (i, j) => {
        const dx = P[i].x - Q[j].x;
        const dy = P[i].y - Q[j].y;
        return dx * dx + dy * dy <= delta * delta;
    };
    const distanceSquared = ([i, j]) => {
        const dx = P[i].x - Q[j].x;
        const dy = P[i].y - Q[j].y;
        return dx * dx + dy * dy;
    };

    let i = 0;
    let j = 0;
    const path = [[i, j]];
    if (!isClose(i, j)) return { status: "unknown", moves: 0, path: path };

    while (i < P.length - 1 || j < Q.length - 1) {
        const moves = [
            [i + 1, j],
            [i, j + 1],
            [i + 1, j + 1]
        ].filter(([nextI, nextJ]) =>
            nextI < P.length && nextJ < Q.length && isClose(nextI, nextJ)
        );

        if (moves.length === 0) {
            return { status: "unknown", moves: path.length - 1, path: path };
        }

        moves.sort((a, b) => distanceSquared(a) - distanceSquared(b));
        [i, j] = moves[0];
        path.push([i, j]);
    }

    return { status: "close", moves: path.length - 1, path: path };
}

function reconstructDCDiagramPath(P, Q, result) {
    if (!result.endpointReachable) return null;

    const cols = P.length - 1;
    const rows = Q.length - 1;
    const rightEnd = result.reachableRight[rows - 1][cols - 1];
    const topEnd = result.reachableTop[rows - 1][cols - 1];
    const rightWorks = rightEnd && rightEnd[1] >= 1 - EPS;
    const topWorks = topEnd && topEnd[1] >= 1 - EPS;
    if (!rightWorks && !topWorks) return null;

    let i = cols - 1;
    let j = rows - 1;
    let boundary = rightWorks ? "right" : "top";
    const path = [[cols, rows]];

    function addPoint(x, y) {
        const last = path[path.length - 1];
        if (Math.abs(last[0] - x) > EPS || Math.abs(last[1] - y) > EPS) {
            path.push([x, y]);
        }
    }

    for (let step = 0; step <= cols + rows; step++) {
        const left = i === 0
            ? result.reachableLeft[j]
            : result.reachableRight[j][i - 1];
        const bottom = j === 0
            ? result.reachableBottom[i]
            : result.reachableTop[j - 1][i];

        let sourceS;
        let sourceT;
        let source = "";

        if (boundary === "right") {
            if (bottom !== null) {
                sourceS = bottom[0];
                sourceT = 0;
                source = "bottom";
            } else if (left !== null) {
                sourceS = 0;
                sourceT = left[0];
                source = "left";
            } else {
                return null;
            }
        } else if (left !== null) {
            sourceS = 0;
            sourceT = left[0];
            source = "left";
        } else if (bottom !== null) {
            sourceS = bottom[0];
            sourceT = 0;
            source = "bottom";
        } else {
            return null;
        }

        addPoint(i + sourceS, j + sourceT);
        if (source === "left") {
            if (i === 0) {
                addPoint(0, 0);
                break;
            }
            i--;
            boundary = "right";
        } else {
            if (j === 0) {
                addPoint(0, 0);
                break;
            }
            j--;
            boundary = "top";
        }
    }

    if (path[path.length - 1][0] > EPS || path[path.length - 1][1] > EPS) {
        return null;
    }
    return path.reverse();
}

function findDCDiagramPath(P, Q, cells, result) {
    const path = reconstructDCDiagramPath(P, Q, result);
    if (path || !result.endpointReachable) return path;

    const savedSteps = boxSteps;
    const savedStepIndex = currentBoxStep;
    const savedClock = boxStepClock;
    const savedGreedyResult = greedyFilterResult;
    const savedRules = { ...pruningRuleSettings };
    let completeResult;

    try {
        pruningRuleSettings.IIIa = false;
        pruningRuleSettings.IIIb = false;
        pruningRuleSettings.IIIc = false;
        pruningRuleSettings.IV = false;
        completeResult = runAlgorithm(P, Q, cells, false);
    } finally {
        Object.assign(pruningRuleSettings, savedRules);
        boxSteps = savedSteps;
        currentBoxStep = savedStepIndex;
        boxStepClock = savedClock;
        greedyFilterResult = savedGreedyResult;
    }

    return reconstructDCDiagramPath(P, Q, completeResult);
}

function runAlgorithm(P, Q, cells, findPath = true) {
    // Reset visualization
    boxSteps = [];
    currentBoxStep = 0;
    boxStepClock = 0;

    greedyFilterResult = greedySettings.enabled
        ? runGreedyFilter(P, Q)
        : { status: "off", moves: 0 };

    // 1. Compute free intervals
    const freeIntervals = computeFreeIntervals(cells);

    // 2. Initialize reachable inputs
    const leftInput = initializeReachableLeft(
        P, Q, freeIntervals
    );

    const bottomInput = initializeReachableBottom(
        P, Q, freeIntervals
    );

    // 3. Initialize root box
    const B = {
        iMin: 0,
        iMax: P.length - 1,
        jMin: 0,
        jMax: Q.length - 1
    };

    // 4. Start recursive algorithm
    const result = runDivideAndConquer(
        P, Q, B, freeIntervals,
        leftInput, bottomInput
    );

    // Add a final visualization step after every recursive box has finished.
    boxSteps.push({
        B: { ...B },
        depth: 0,
        type: "complete",
        startOrder: boxStepClock++,
        finishOrder: boxStepClock++,
        leftInput: copyReachableIntervals(leftInput),
        bottomInput: copyReachableIntervals(bottomInput),
        rightOutput: copyReachableIntervals(result.rightOutput),
        topOutput: copyReachableIntervals(result.topOutput)
    });

    // 5. Check final endpoint
    const lastRight = Array.isArray(result.rightOutput)
        ? result.rightOutput.at(-1)
        : null;
    const lastTop = Array.isArray(result.topOutput)
        ? result.topOutput.at(-1)
        : null;

    const endpointReachable =
        (lastRight !== null && lastRight !== undefined &&
         lastRight[1] >= 1 - EPS) ||

        (lastTop !== null && lastTop !== undefined &&
         lastTop[1] >= 1 - EPS);

    const reachableRight = Array.from(
        { length: Q.length - 1 },
        () => Array(P.length - 1).fill(null)
    );
    const reachableTop = Array.from(
        { length: Q.length - 1 },
        () => Array(P.length - 1).fill(null)
    );

    for (const step of boxSteps) {
        const box = step.B;
        if (Array.isArray(step.rightOutput)) {
            step.rightOutput.forEach((interval, index) => {
                const j = firstCellIndex(box.jMin) + index;
                if (interval !== undefined && j < Q.length - 1) {
                    reachableRight[j][box.iMax - 1] = interval;
                }
            });
        }
        if (Array.isArray(step.topOutput)) {
            step.topOutput.forEach((interval, index) => {
                const i = firstCellIndex(box.iMin) + index;
                if (interval !== undefined && i < P.length - 1) {
                    reachableTop[box.jMax - 1][i] = interval;
                }
            });
        }
    }

    const finalResult = {
        ...result,
        endpointReachable,
        reachableLeft: copyReachableIntervals(leftInput),
        reachableBottom: copyReachableIntervals(bottomInput),
        reachableRight,
        reachableTop
    };

    if (findPath) finalResult.path = findDCDiagramPath(P, Q, cells, finalResult);
    return finalResult;
}
