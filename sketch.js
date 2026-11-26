/* eslint-disable no-undef, no-unused-vars */

// POINT AND INPUT
class Point {
  constructor(x, y) {
      this.x = x;
      this.y = y;
  }
}

let delta = 140;
let deltaSlider;
let pathPlaybackSlider;
let boxSteps = [];
let currentBoxStep = 0;
let boxStepDetailsHeight = 0;
let pruningPanel;
let pruningCheckboxes = {};
let greedyCheckbox;
let pruningStepsLabel;
let greedyStatusLabel;
let pruningBaselineSteps = null;

function allPruningRulesEnabled() {
    return Object.values(pruningRuleSettings).every(enabled => enabled);
}

function allExperimentSettingsEnabled() {
    return allPruningRulesEnabled() && !greedySettings.enabled;
}

function updatePruningExperimentSummary() {
    if (!pruningStepsLabel) return;

    const steps = boxSteps.length;
    if (pruningBaselineSteps === null) {
        pruningStepsLabel.html(
            `Recorded steps: <b>${steps}</b><br>Set a baseline to compare runs.`
        );
    } else {
        const difference = steps - pruningBaselineSteps;
        const comparison = difference === 0
            ? "same as baseline"
            : difference < 0
                ? `${Math.abs(difference)} fewer than baseline`
                : `${difference} more than baseline`;

        pruningStepsLabel.html(
            `Recorded steps: <b>${steps}</b><br>` +
            `Baseline: <b>${pruningBaselineSteps}</b> (${comparison})`
        );
    }

    if (!greedyStatusLabel) return;

    const result = greedyFilterResult;
    const status = !greedySettings.enabled
        ? "Greedy heuristic: off"
        : result.status === "close"
            ? `Greedy found a path (${result.moves} moves). D&C still ran.`
            : result.status === "unknown"
                ? `Greedy found no path in ${result.moves} moves; inconclusive. D&C ran.`
                : "Greedy heuristic: waiting for curves";
    greedyStatusLabel.html(status);
    greedyStatusLabel.style("font-size", "12px");
    greedyStatusLabel.style("line-height", "1.25");
    greedyStatusLabel.style("color", result.status === "close" ? "#087A32" : "#46536a");
}

function createPruningPanel() {
    pruningPanel = createDiv();
    pruningPanel.position(15, 620);
    pruningPanel.style("width", "205px");
    pruningPanel.style("padding", "10px 12px");
    pruningPanel.style("background", "#ffffff");
    pruningPanel.style("border", "1px solid #9aa5b1");
    pruningPanel.style("border-radius", "6px");
    pruningPanel.style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)");
    pruningPanel.style("font-family", "Arial, sans-serif");
    pruningPanel.style("font-size", "13px");
    pruningPanel.style("z-index", "10");

    const heading = createDiv("Pruning rules");
    heading.parent(pruningPanel);
    heading.style("font-weight", "bold");
    heading.style("margin-bottom", "5px");

    const rules = [
        ["I", "Rule I"],
        ["II", "Rule II"],
        ["IIIa", "Rule IIIa"],
        ["IIIb", "Rule IIIb"],
        ["IIIc", "Rule IIIc"],
        ["IV", "Rule IV"]
    ];

    for (const [key, label] of rules) {
        const checkbox = createCheckbox(label, pruningRuleSettings[key]);
        checkbox.parent(pruningPanel);
        checkbox.style("display", "block");
        checkbox.style("margin", "3px 0");
        if (key.startsWith("III")) checkbox.style("padding-left", "12px");

        checkbox.changed(() => {
            pruningRuleSettings[key] = checkbox.checked();
            rebuildFreeSpaceAnalysis(false, false);
        });
        pruningCheckboxes[key] = checkbox;
    }

    const heuristicHeading = createDiv("Heuristic filter");
    heuristicHeading.parent(pruningPanel);
    heuristicHeading.style("font-weight", "bold");
    heuristicHeading.style("margin-top", "8px");

    greedyCheckbox = createCheckbox("Run basic Greedy heuristic", greedySettings.enabled);
    greedyCheckbox.parent(pruningPanel);
    greedyCheckbox.style("display", "block");
    greedyCheckbox.style("margin", "3px 0");
    greedyCheckbox.changed(() => {
        greedySettings.enabled = greedyCheckbox.checked();
        rebuildFreeSpaceAnalysis(false, false);
    });

    const enableAllButton = createButton("Enable all pruning rules");
    enableAllButton.parent(pruningPanel);
    enableAllButton.style("display", "block");
    enableAllButton.style("width", "100%");
    enableAllButton.style("margin-top", "6px");
    enableAllButton.mousePressed(() => {
        for (const key of Object.keys(pruningRuleSettings)) {
            pruningRuleSettings[key] = true;
            pruningCheckboxes[key].checked(true);
        }
        rebuildFreeSpaceAnalysis(false, false);
    });

    const baselineButton = createButton("Set current as baseline");
    baselineButton.parent(pruningPanel);
    baselineButton.style("display", "block");
    baselineButton.style("width", "100%");
    baselineButton.style("margin-top", "5px");
    baselineButton.mousePressed(() => {
        pruningBaselineSteps = boxSteps.length;
        updatePruningExperimentSummary();
    });

    pruningStepsLabel = createDiv();
    pruningStepsLabel.parent(pruningPanel);
    pruningStepsLabel.style("margin-top", "8px");
    greedyStatusLabel = createDiv();
    greedyStatusLabel.parent(pruningPanel);
    greedyStatusLabel.style("margin-top", "5px");
    greedyStatusLabel.style("font-size", "11px");
    updatePruningExperimentSummary();
}

// Screenshot example.
var P = [
  new Point(43, 262),
  new Point(155, 145),
  new Point(270, 145),
  new Point(270, 34),
  new Point(214, 201),
  new Point(329, 201),
  new Point(442, 144)
];

var Q = [
  new Point(162, 260),
  new Point(75, 178),
  new Point(89, 92),
  new Point(342, 76),
  new Point(334, 242),
  new Point(423, 195),
  new Point(307, 183),
  new Point(416, 115),
  new Point(459, 167)
];

/* Previous default example, kept for reference.
var P = [
  new Point(40, 271), new Point(143, 165), new Point(247, 165),
  new Point(246, 63), new Point(196, 216), new Point(300, 216),
  new Point(403, 163)
];

var Q = [
  new Point(144, 270), new Point(90, 115), new Point(300, 112),
  new Point(300, 163), new Point(403, 111)
];
*/

//Previous trajectory 001 sample, kept for reference.
const gpsToPoint = ([lat, lon]) => new Point(
    220 + (lon - 116.3165) * 111320 * Math.cos(40 * Math.PI / 180) * 0.09,
    220 - (lat - 39.997) * 111320 * 0.09
);
/*
// 2008-10-23, 05:53 track
var P = [
    [39.984198, 116.319322], [39.980678, 116.321324],
    [39.978532, 116.327277], [39.982922, 116.326697],
    [39.990055, 116.326581], [39.995343, 116.326377],
    [39.999831, 116.322563], [40.004920, 116.318667],
    [40.009928, 116.314928], [40.013491, 116.311793],
    [40.015963, 116.306130], [40.014683, 116.305599],
    [40.013831, 116.306541], [40.013814, 116.306527],
    [40.013803, 116.306531]
].map(gpsToPoint);

// 2008-10-23, 23:41 track, reversed to compare in the same direction.
var Q = [
    [39.977899, 116.327063], [39.979636, 116.315263],
    [39.981924, 116.311005], [39.982304, 116.310994],
    [39.979749, 116.325817], [39.978794, 116.325467],
    [39.979508, 116.314653], [39.979585, 116.313105],
    [39.981347, 116.309382], [39.979717, 116.311202],
    [39.978136, 116.326541], [39.985717, 116.326894],
    [39.999868, 116.324652], [40.009635, 116.315613],
    [40.013907, 116.306488]
].map(gpsToPoint);
*/

/*
var P = [
    new Point(109, 146),  // P1
    new Point(313, 55),   // P2
    new Point(610, 97),   // P3
    new Point(742, 210)   // P4
];

var Q = [
    new Point(114, 160),  // Q1
    new Point(411, 178),  // Q2
    new Point(637, 220)   // Q3
];*/

/* Previous user 006 samples, kept for reference.
const gpsToPoint = ([lat, lon]) => new Point(
    220 + (lon - 116.333) * 111320 * Math.cos(40 * Math.PI / 180) * 0.14,
    220 - (lat - 39.9814) * 111320 * 0.14
);

// 2008-10-23, 06:59 track
var P = [
    [39.984140, 116.320122], [39.985112, 116.319668],
    [39.984819, 116.320356], [39.984142, 116.321023],
    [39.983932, 116.321507], [39.984291, 116.322992],
    [39.984267, 116.324636], [39.984469, 116.325757],
    [39.985291, 116.325526], [39.985406, 116.337231],
    [39.985100, 116.338827], [39.984166, 116.337999],
    [39.983201, 116.338128], [39.981916, 116.338048],
    [39.981296, 116.339299]
].map(gpsToPoint);

// A later part of the 2008-11-19 track, chosen for a different shape.
var Q = [
    [39.982051, 116.342302], [39.975103, 116.334300],
    [39.975752, 116.327579], [39.980517, 116.325807],
    [39.987704, 116.333421], [39.981333, 116.339367],
    [39.981667, 116.337946], [39.982535, 116.333067],
    [39.982798, 116.333000], [39.980576, 116.338173],
    [39.979552, 116.345520]
].map(gpsToPoint);

*/

// Samples from two different user 015 tracks.
/*const gpsToPoint = ([lat, lon]) => new Point(
    220 + (lon - 116.2931) * 111320 * Math.cos(40 * Math.PI / 180) * 0.045,
    220 - (lat - 40.0138) * 111320 * 0.045
);*/
/*
// 2008-10-30, 09:04 track
var P = [
    [39.984409, 116.320690], [39.984493, 116.313805],
    [39.986598, 116.298812], [39.996015, 116.293717],
    [40.003439, 116.282403], [40.016345, 116.279801],
    [40.027888, 116.269611], [40.038962, 116.258802],
    [40.049140, 116.254431], [40.048577, 116.269810],
    [40.051911, 116.286936], [40.049017, 116.299380],
    [40.048704, 116.303581]
].map(gpsToPoint);

// 2008-11-22, 09:29 track
var Q = [
    [39.974926, 116.333393], [39.985300, 116.331945],
    [39.998456, 116.331224], [40.010306, 116.328391],
    [40.019998, 116.318292], [40.032323, 116.314050],
    [40.043627, 116.305782], [40.050410, 116.303255],
    [40.050069, 116.311359], [40.039213, 116.318652],
    [40.042623, 116.324612], [40.047401, 116.314549],
    [40.048225, 116.303277]
].map(gpsToPoint);*/

var points = [];

// Visualization configuration
const CELL_SIZE = 70;
const RESOLUTION = 50;
const EPS = 1e-9;
let cells = [];
let divideAndConquerResult = null;
let freeSpaceDiagramImage = null;

function resetpoints() {
  P = [];
  Q = [];
  points=[];
  cells = [];
  divideAndConquerResult = null;
  freeSpaceDiagramImage = null;
  boxSteps = [];
  currentBoxStep = 0;
  pruningBaselineSteps = null;
  greedyFilterResult = { status: "not-run", moves: 0 };
  updatePruningExperimentSummary();
   redraw();
}

function rebuildFreeSpaceAnalysis(resetBaseline = false, rebuildImage = true) {
    if (rebuildImage) freeSpaceDiagramImage = null;
    if (pathPlaybackSlider) pathPlaybackSlider.value(0);
    if (resetBaseline) {
        pruningBaselineSteps = null;
    }
    if (P.length <= 2 || Q.length <= 2) {
        cells = [];
        divideAndConquerResult = null;
        boxSteps = [];
        currentBoxStep = 0;
        greedyFilterResult = { status: "not-run", moves: 0 };
        updatePruningExperimentSummary();
        redraw();
        return;
    }

    cells = buildFreeSpaceDiagram(P, Q);
    divideAndConquerResult = runAlgorithm(P, Q, cells);
    if (pruningBaselineSteps === null && allExperimentSettingsEnabled()) {
        pruningBaselineSteps = boxSteps.length;
    }
    updatePruningExperimentSummary();
    resizeCanvas(windowWidth, visualizationCanvasHeight());
    redraw();
}

function visualizationCanvasHeight() {
    const rows = Math.max(1, Q.length - 1);
    const cols = Math.max(1, P.length - 1);
    return Math.max(
        windowHeight + 900,
        2300 + rows * 80 + cols * 35
    );
}

function mousePressed() {
  if (mouseX >= 15 && mouseX <= 245 && mouseY >= 610 && mouseY <= 1020) return;

  //ignore poitns added near buttons
   console.log(mouseX, mouseY, (mouseY>484 && mouseY<600 )  && (mouseX < 132&&  mouseX > 28));
  if( (mouseY>484 && mouseY<600 )  && (mouseX < 132&&  mouseX > 28))
    return;

    points.push(new Point(mouseX, mouseY));
   redraw();
}

function setPToPoints()
{
     P = points.map(p => new Point(p.x, p.y));
     points = [];
     rebuildFreeSpaceAnalysis(true);
}

function setQToPoints(){
     Q = points.map(p => new Point(p.x, p.y));
     points = [];
     rebuildFreeSpaceAnalysis(true);
}

function updateDelta() {
    delta = Number(deltaSlider.value());
    rebuildFreeSpaceAnalysis(true);
}

function drawBoxInputIntervals(step, B, x0, y0, miniSize, rows) {
    if (!step) return;

    // The original box inputs enter on the left and bottom edges (blue).
    stroke(0, 85, 230);
    strokeWeight(4);

    (step.leftInput || []).forEach((interval, index) => {
        if (interval == null) return;

        const segmentJ = Math.floor(B.jMin) + index;
        const cellY = y0 + (rows - segmentJ - 1) * miniSize;
        const x = x0 + B.iMin * miniSize;
        const y1 = cellY + (1 - interval[1]) * miniSize;
        const y2 = cellY + (1 - interval[0]) * miniSize;

        line(x, y1, x, y2);
    });

    (step.bottomInput || []).forEach((interval, index) => {
        if (interval == null) return;

        const segmentI = Math.floor(B.iMin) + index;
        const cellX = x0 + segmentI * miniSize;
        const y = y0 + (rows - B.jMin) * miniSize;
        const x1 = cellX + interval[0] * miniSize;
        const x2 = cellX + interval[1] * miniSize;

        line(x1, y, x2, y);
    });
}

function drawBoxOutputIntervals(step, B, x0, y0, miniSize, rows) {
    if (!step) return;

    // Computed outputs leave on the right and top edges (red).
    stroke(220, 45, 45);
    strokeWeight(4);

    (step.rightOutput || []).forEach((interval, index) => {
        if (interval == null) return;

        const segmentJ = Math.floor(B.jMin) + index;
        const cellY = y0 + (rows - segmentJ - 1) * miniSize;
        const x = x0 + B.iMax * miniSize;
        const y1 = cellY + (1 - interval[1]) * miniSize;
        const y2 = cellY + (1 - interval[0]) * miniSize;

        line(x, y1, x, y2);
    });

    (step.topOutput || []).forEach((interval, index) => {
        if (interval == null) return;

        const segmentI = Math.floor(B.iMin) + index;
        const cellX = x0 + segmentI * miniSize;
        const y = y0 + (rows - B.jMax) * miniSize;
        const x1 = cellX + interval[0] * miniSize;
        const x2 = cellX + interval[1] * miniSize;

        line(x1, y, x2, y);
    });
}

function formatBoundaryIntervals(intervals, startSegment, axis) {
    if (!Array.isArray(intervals)) {
        return "not computed / skipped";
    }

    if (intervals.length === 0 || intervals.every(x => x === null)) {
        return "∅";
    }

    return intervals.map((interval, index) => {
        const segment = `${axis}${startSegment + index}`;
        if (interval === undefined) return `${segment}: ?`;
        if (interval === null) return `${segment}: ∅`;

        const lower = Number(interval[0]).toFixed(3);
        const upper = Number(interval[1]).toFixed(3);
        return `${segment}: [${lower}, ${upper}]`;
    }).join(";  ");
}

function wrapCanvasText(value, maxWidth) {
    const words = value.split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && textWidth(candidate) > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }

    if (line) lines.push(line);
    return lines;
}

function drawBoxBoundaryDetails(step, B, x, y, maxWidth) {
    const details = [
        {
            label: "Left input (blue)",
            value: formatBoundaryIntervals(step.leftInput, Math.floor(B.jMin), "j"),
            color: [0, 85, 230]
        },
        {
            label: "Bottom input (blue)",
            value: formatBoundaryIntervals(step.bottomInput, Math.floor(B.iMin), "i"),
            color: [0, 85, 230]
        },
        {
            label: "Right output (red)",
            value: formatBoundaryIntervals(step.rightOutput, Math.floor(B.jMin), "j"),
            color: [220, 45, 45]
        },
        {
            label: "Top output (red)",
            value: formatBoundaryIntervals(step.topOutput, Math.floor(B.iMin), "i"),
            color: [220, 45, 45]
        }
    ];

    noStroke();
    fill(0);
    textSize(12);
    textAlign(LEFT, BASELINE);
    text("Selected box boundary intervals (local coordinates)", x, y);

    let cursorY = y + 18;

    for (const detail of details) {
        const lines = wrapCanvasText(
            `${detail.label}: ${detail.value}`,
            maxWidth
        );

        fill(...detail.color);
        for (const lineText of lines) {
            text(lineText, x, cursorY);
            cursorY += 14;
        }
    }

    return cursorY - y;
}

function drawDepthDiagram(cells) {
    if (!cells || cells.length === 0 || boxSteps.length === 0) {
        return;
    }

    const rows = cells.length;
    const cols = cells[0].length;

    // Use the same scale and horizontal alignment as the other diagrams.
    const cellSize = Math.min(
        CELL_SIZE,
        Math.max(35, (width - 480) / cols),
        Math.max(35, (height - 220) / rows)
    );

    const offsetX = Math.max(
        440,
        width - (cols * cellSize + 90)
    );

    const mainBottom = 250 + rows * cellSize;
    const miniSize = Math.min(
        30,
        260 / cols,
        160 / rows
    );

    // Place the third diagram underneath the second one.
    const x0 = offsetX;
    const detailClearance = Math.max(115, 132 + boxStepDetailsHeight);
    const secondDiagramBottom = mainBottom + 155 + rows * miniSize + 43;
    const y0 = secondDiagramBottom + detailClearance;

    // Current recursive call.
    const currentStep = boxSteps[currentBoxStep];

    if (!currentStep) return;

    const selectedDepth = currentStep.depth;

    // At a split step, show both child boxes together in the bottom diagram.
    // For a cell step, keep showing all recorded boxes at its depth.
    const isSplitStep =
        currentStep.children && currentStep.children.length === 2;
    const isFinalStep = currentStep.type === "complete";
    const boxesToDraw = isSplitStep
        ? currentStep.children.map((B, index) => ({
            B: B,
            index: index,
            child: true
        }))
        : isFinalStep
            ? [{
                ...currentStep,
                index: currentBoxStep,
                child: false
            }]
            : boxSteps
            .map((step, index) => ({
                ...step,
                index: index,
                child: false
            }))
            .filter(step => step.depth === selectedDepth);

    push();

    // TITLE
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(20);

    text(
        isSplitStep
            ? `Child boxes of the ${currentStep.type} split`
            : isFinalStep
                ? "Completed outputs for the whole box"
                : `All boxes at depth ${selectedDepth}`,
        x0,
        y0 - 35
    );

    textSize(13);

    text(
        `${boxesToDraw.length} boxes shown | ` +
        `Selected step: ${currentBoxStep + 1}/${boxSteps.length}`,
        x0,
        y0 - 12
    );

    // DRAW BACKGROUND GRID
    noFill();
    stroke(180);
    strokeWeight(1);

    rect(
        x0,
        y0,
        cols * miniSize,
        rows * miniSize
    );

    for (let i = 1; i < cols; i++) {
        const x = x0 + i * miniSize;

        line(
            x, y0,
            x, y0 + rows * miniSize
        );
    }

    for (let j = 1; j < rows; j++) {
        const y = y0 + j * miniSize;

        line(
            x0, y,
            x0 + cols * miniSize, y
        );
    }

    // DRAW EVERY BOX AT THIS DEPTH
    for (const item of boxesToDraw) {
        const B = item.B;
        const x = x0 + B.iMin * miniSize;
        const y = y0 + (rows - B.jMax) * miniSize;
        const w = (B.iMax - B.iMin) * miniSize;
        const h = (B.jMax - B.jMin) * miniSize;
        const isCurrent = !item.child && item.index === currentBoxStep;

        // The two children of a split use blue and orange.
        if (item.child) {
            if (item.index === 0) {
                fill(0, 155, 90, 45);
                stroke(0, 115, 65);
            } else {
                fill(240, 145, 0, 50);
                stroke(190, 105, 0);
            }
            strokeWeight(3);
        }

        // Current box gets purple.
        else if (isCurrent) {
            fill(180, 0, 220, 65);
            stroke(180, 0, 220);
            strokeWeight(4);
        }

        // Other boxes at the same depth get blue.
        else {
            fill(0, 120, 220, 30);
            stroke(0, 100, 200);
            strokeWeight(2);
        }

        rect(x, y, w, h);

        if (item.child) {
            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(12);
            text(
                item.index === 0 ? "B1" : "B2",
                x + w / 2,
                y + h / 2
            );
        }
    }

    // Keep the initial inputs visible, then reveal outputs only after their
    // recursive calls have completed. This reproduces Figure 3's progression.
    const rootStep = boxSteps[0];
    drawBoxInputIntervals(
        rootStep,
        rootStep.B,
        x0,
        y0,
        miniSize,
        rows
    );

    const completedSteps = boxSteps.filter(step =>
        step.type !== "complete" &&
        step.finishOrder !== undefined &&
        step.finishOrder < currentStep.startOrder
    );

    for (const completedStep of completedSteps) {
        drawBoxOutputIntervals(
            completedStep,
            completedStep.B,
            x0,
            y0,
            miniSize,
            rows
        );
    }

    // INFORMATION
    const B = currentStep.B;

    noStroke();
    fill(0);
    textSize(12);
    textAlign(LEFT);

    text(
        `Current box: [${B.iMin}, ${B.iMax}] x ` +
        `[${B.jMin}, ${B.jMax}]`,
        x0,
        y0 + rows * miniSize + 22
    );

    text(
        isSplitStep
            ? "Green = B1 | Orange = B2 | Blue = input | Red = computed output"
            : isFinalStep
                ? "Blue = initial inputs | Red = completed outputs"
                : "Blue = other boxes at this depth | Purple = selected | Red = completed outputs",
        x0,
        y0 + rows * miniSize + 43
    );

    pop();
    return y0 + rows * miniSize;
}


function drawBoxStepDiagram(cells) {
    if (!cells || cells.length === 0 || boxSteps.length === 0) {
        boxStepDetailsHeight = 0;
        return;
    }

    const rows = cells.length;
    const cols = cells[0].length;

    // Reproduce the positioning of the main diagram.
    const mainCellSize = Math.min(
        CELL_SIZE,
        Math.max(35, (width - 480) / cols),
        Math.max(35, (height - 220) / rows)
    );

    const offsetX = Math.max(
        440,
        width - (cols * mainCellSize + 90)
    );

    const mainBottom = 250 + rows * mainCellSize;

    // Position the second diagram below the first one.
    const miniSize = Math.min(
        30,
        260 / cols,
        160 / rows
    );

    const x0 = offsetX;
    const y0 = mainBottom + 155;
    const step = boxSteps[currentBoxStep];
    const B = step.B;
    const ruleIIRemoval = (step.ruleEvents || []).find(
        event => event.rule === "II"
    );

    push();

    // TITLE AND STEP INFORMATION
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(20);

    text("Divide-and-conquer exploration", x0, y0 - 35);

    textSize(13);

    text(
        `Step ${currentBoxStep + 1} / ${boxSteps.length}   |   ` +
        `Depth: ${step.depth}   |   ${step.type}`,
        x0,
        y0 - 12
    );

    // DRAW THE COMPLETE GRID
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = x0 + i * miniSize;
            const y = y0 + (rows - 1 - j) * miniSize;

            fill(245);
            stroke(150);
            strokeWeight(1);

            rect(x, y, miniSize, miniSize);
        }
    }

    // DRAW THE CURRENT BOX OR ITS TWO SPLIT CHILDREN
    const boxX = x0 + B.iMin * miniSize;
    const boxY = y0 + (rows - B.jMax) * miniSize;
    const boxWidth = (B.iMax - B.iMin) * miniSize;
    const boxHeight = (B.jMax - B.jMin) * miniSize;

    if (step.children && step.children.length === 2) {
        // Shade the parent, then draw both child boxes on top of it.
        noStroke();
        fill(180, 0, 220, 20);
        rect(boxX, boxY, boxWidth, boxHeight);

        const childStyles = [
            { fill: [0, 155, 90, 65], stroke: [0, 115, 65], label: "B1" },
            { fill: [240, 145, 0, 70], stroke: [190, 105, 0], label: "B2" }
        ];

        step.children.forEach((child, index) => {
            const childX = x0 + child.iMin * miniSize;
            const childY = y0 + (rows - child.jMax) * miniSize;
            const childWidth = (child.iMax - child.iMin) * miniSize;
            const childHeight = (child.jMax - child.jMin) * miniSize;
            const style = childStyles[index];

            fill(...style.fill);
            stroke(...style.stroke);
            strokeWeight(3);
            rect(childX, childY, childWidth, childHeight);

            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(12);
            text(
                style.label,
                childX + childWidth / 2,
                childY + childHeight / 2
            );
        });
    } else {
        // Translucent purple background and outline for a single box step.
        noStroke();
        fill(180, 0, 220, 45);
        rect(boxX, boxY, boxWidth, boxHeight);

        noFill();
        stroke(180, 0, 220);
        strokeWeight(3);
        rect(boxX, boxY, boxWidth, boxHeight);
    }

    if (ruleIIRemoval && ruleIIRemoval.removedBox) {
        const removed = ruleIIRemoval.removedBox;
        const removedX = x0 + removed.iMin * miniSize;
        const removedY = y0 + (rows - removed.jMax) * miniSize;
        const removedWidth = (removed.iMax - removed.iMin) * miniSize;
        const removedHeight = (removed.jMax - removed.jMin) * miniSize;

        fill(100, 100, 100, 165);
        stroke(75);
        strokeWeight(1);
        rect(removedX, removedY, removedWidth, removedHeight);
    }

    // The paper's box convention is: left/bottom are inputs and
    // right/top are outputs. Show the selected recursive call on its edges.
    drawBoxInputIntervals(step, B, x0, y0, miniSize, rows);
    drawBoxOutputIntervals(step, B, x0, y0, miniSize, rows);

    // BOX COORDINATES
    noStroke();
    fill(0);
    textSize(12);

    textAlign(LEFT);
    text(
        `B = [${B.iMin}, ${B.iMax}] x [${B.jMin}, ${B.jMax}]`,
        x0,
        y0 + rows * miniSize + 22
    );

    text(
        step.children && step.children.length === 2
            ? ruleIIRemoval
                ? "Gray = removed by II | Green = B1 | Orange = B2"
                : "Split: green = B1, orange = B2 | Use LEFT / RIGHT arrows"
            : "Use LEFT / RIGHT arrows to navigate | Blue = input | Red = output",
        x0,
        y0 + rows * miniSize + 43
    );

    boxStepDetailsHeight = drawBoxBoundaryDetails(
        step,
        B,
        x0,
        y0 + rows * miniSize + 68,
        Math.max(160, width - x0 - 30)
    );

    pop();
    return y0 + rows * miniSize + 68 + boxStepDetailsHeight;
}

function drawPruningDashedLine(x1, y1, x2, y2, color, weight = 3) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const dashLength = 7;
    const gapLength = 4;

    stroke(...color);
    strokeWeight(weight);

    for (let start = 0; start < length; start += dashLength + gapLength) {
        const end = Math.min(length, start + dashLength);
        const startRatio = length === 0 ? 0 : start / length;
        const endRatio = length === 0 ? 1 : end / length;
        line(
            x1 + dx * startRatio,
            y1 + dy * startRatio,
            x1 + dx * endRatio,
            y1 + dy * endRatio
        );
    }
}

function drawPruningOutline(B, x0, y0, cellSize, rows, color, weight = 3) {
    const left = x0 + B.iMin * cellSize;
    const right = x0 + B.iMax * cellSize;
    const top = y0 + (rows - B.jMax) * cellSize;
    const bottom = y0 + (rows - B.jMin) * cellSize;

    drawPruningDashedLine(left, top, right, top, color, weight);
    drawPruningDashedLine(right, top, right, bottom, color, weight);
    drawPruningDashedLine(right, bottom, left, bottom, color, weight);
    drawPruningDashedLine(left, bottom, left, top, color, weight);
}

function drawPruningBoundaryMark(event, x0, y0, cellSize, rows) {
    const B = event.box;
    if (!B) return;

    const boundaryY = y0 + (rows - B.jMax) * cellSize;
    const boundaryX = x0 + B.iMax * cellSize;
    const markColor = event.subrule === "a"
        ? [210, 70, 55]
        : event.subrule === "b"
            ? [30, 150, 80]
            : [0, 125, 220];

    if (event.rule === "IV") {
        if (event.boundary === "top") {
            drawPruningDashedLine(
                x0 + B.iMin * cellSize,
                boundaryY,
                boundaryX,
                boundaryY,
                [160, 50, 190],
                4
            );
        } else {
            drawPruningDashedLine(
                boundaryX,
                y0 + (rows - B.jMin) * cellSize,
                boundaryX,
                boundaryY,
                [160, 50, 190],
                4
            );
        }
        return;
    }

    if (event.rule !== "III") return;

    stroke(...markColor);
    strokeWeight(4);

    if (event.boundary === "top") {
        const y = boundaryY;

        if (event.subrule === "a") {
            drawPruningDashedLine(
                x0 + B.iMin * cellSize,
                y,
                x0 + B.iMax * cellSize,
                y,
                markColor,
                3
            );
        } else {
            (event.intervals || []).forEach((interval, index) => {
                if (interval == null) return;
                const cellX = x0 + (Math.floor(B.iMin) + index) * cellSize;
                line(
                    cellX + interval[0] * cellSize,
                    y,
                    cellX + interval[1] * cellSize,
                    y
                );
            });
        }

        if (event.via) {
            const x = x0 + event.via.x * cellSize;
            drawPruningDashedLine(
                x,
                y0 + (rows - event.via.yMin) * cellSize,
                x,
                y0 + (rows - event.via.yMax) * cellSize,
                markColor,
                3
            );
        }
    } else {
        if (event.subrule === "a") {
            drawPruningDashedLine(
                boundaryX,
                y0 + (rows - B.jMin) * cellSize,
                boundaryX,
                boundaryY,
                markColor,
                3
            );
        } else {
            (event.intervals || []).forEach((interval, index) => {
                if (interval == null) return;
                const cellY = y0 + (rows - (Math.floor(B.jMin) + index) - 1) * cellSize;
                line(
                    boundaryX,
                    cellY + (1 - interval[1]) * cellSize,
                    boundaryX,
                    cellY + (1 - interval[0]) * cellSize
                );
            });
        }

        if (event.via) {
            const y = y0 + (rows - event.via.y) * cellSize;
            drawPruningDashedLine(
                x0 + event.via.xMin * cellSize,
                y,
                x0 + event.via.xMax * cellSize,
                y,
                markColor,
                3
            );
        }
    }
}

function drawPruningInputs(step, x0, y0, cellSize, rows) {
    const B = step.effectiveB || step.B;
    const leftInput = step.effectiveLeftInput || step.leftInput || [];
    const bottomInput = step.effectiveBottomInput || step.bottomInput || [];

    stroke(0, 70, 240);
    strokeWeight(4);

    leftInput.forEach((interval, index) => {
        if (interval === null) return;
        const j = Math.floor(B.jMin) + index;
        const cellY = y0 + (rows - j - 1) * cellSize;
        const x = x0 + B.iMin * cellSize;
        line(
            x,
            cellY + (1 - interval[1]) * cellSize,
            x,
            cellY + (1 - interval[0]) * cellSize
        );
    });

    bottomInput.forEach((interval, index) => {
        if (interval === null) return;
        const i = Math.floor(B.iMin) + index;
        const cellX = x0 + i * cellSize;
        const y = y0 + (rows - B.jMin) * cellSize;
        line(
            cellX + interval[0] * cellSize,
            y,
            cellX + interval[1] * cellSize,
            y
        );
    });
}

function drawPruningDiagram(cells, previousDiagramBottom) {
    if (!cells || cells.length === 0 || boxSteps.length === 0) return;

    const rows = cells.length;
    const cols = cells[0].length;
    const mainCellSize = Math.min(
        CELL_SIZE,
        Math.max(35, (width - 480) / cols),
        Math.max(35, (height - 220) / rows)
    );
    const x0 = Math.max(
        440,
        width - (cols * mainCellSize + 90)
    );
    const titleY = previousDiagramBottom + 105;
    const xGrid = x0;
    const yGrid = titleY + 40;
    const cellSize = Math.min(24, 420 / cols, 220 / rows);
    const step = boxSteps[currentBoxStep];
    const originalB = step.originalB || step.B;
    const effectiveB = step.effectiveB || step.B;
    const events = step.ruleEvents || [];

    push();

    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(20);
    text("Pruning decisions for the selected box", x0, titleY);
    textSize(12);
    text(
        `Step ${currentBoxStep + 1}/${boxSteps.length} | ` +
        `Box [${originalB.iMin}, ${originalB.iMax}] x ` +
        `[${originalB.jMin}, ${originalB.jMax}]`,
        x0,
        titleY + 20
    );

    // Free-space grid for the pruning event currently selected by the stepper.
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            fill(250);
            stroke(185);
            strokeWeight(1);
            rect(
                xGrid + i * cellSize,
                yGrid + (rows - 1 - j) * cellSize,
                cellSize,
                cellSize
            );
        }
    }

    // Rule I resolves the whole box without descending into children.
    if (events.some(event => event.rule === "I")) {
        noStroke();
        fill(215, 55, 55, 45);
        rect(
            xGrid + originalB.iMin * cellSize,
            yGrid + (rows - originalB.jMax) * cellSize,
            (originalB.iMax - originalB.iMin) * cellSize,
            (originalB.jMax - originalB.jMin) * cellSize
        );
    }

    // Shade the portion discarded by Rule II, then outline the retained box.
    for (const event of events.filter(item => item.rule === "II")) {
        const removed = event.removedBox;
        if (!removed) continue;

        noStroke();
        fill(100, 100, 100, 155);
        rect(
            xGrid + removed.iMin * cellSize,
            yGrid + (rows - removed.jMax) * cellSize,
            (removed.iMax - removed.iMin) * cellSize,
            (removed.jMax - removed.jMin) * cellSize
        );
    }

    drawPruningOutline(
        originalB,
        xGrid,
        yGrid,
        cellSize,
        rows,
        [45, 45, 45],
        2
    );

    if (
        effectiveB.iMin !== originalB.iMin ||
        effectiveB.iMax !== originalB.iMax ||
        effectiveB.jMin !== originalB.jMin ||
        effectiveB.jMax !== originalB.jMax
    ) {
        drawPruningOutline(
            effectiveB,
            xGrid,
            yGrid,
            cellSize,
            rows,
            [45, 45, 45],
            4
        );
    }

    // Rule II moves one side of the box. Draw that new, empty input edge
    // explicitly, as in the paper's box-shrinking illustration.
    for (const event of events.filter(item => item.rule === "II")) {
        const after = event.after;
        if (!after) continue;

        stroke(210, 55, 55);
        strokeWeight(3);
        if (event.axis === "j") {
            const newBottomY = yGrid + (rows - after.jMin) * cellSize;
            line(
                xGrid + after.iMin * cellSize,
                newBottomY,
                xGrid + after.iMax * cellSize,
                newBottomY
            );
        } else if (event.axis === "i") {
            const newLeftX = xGrid + after.iMin * cellSize;
            line(
                newLeftX,
                yGrid + (rows - after.jMin) * cellSize,
                newLeftX,
                yGrid + (rows - after.jMax) * cellSize
            );
        }
    }

    drawPruningInputs(step, xGrid, yGrid, cellSize, rows);

    for (const event of events) {
        drawPruningBoundaryMark(event, xGrid, yGrid, cellSize, rows);
    }

    noStroke();
    fill(0);
    textSize(12);
    textAlign(LEFT);
    text(
        "Dark outline = original | Bold outline = after II | Gray = removed | " +
        "Red edge = new empty boundary | Rose fill = I",
        x0,
        yGrid + rows * cellSize + 22
    );
    text(
        "Dark blue edges = inputs | Red/green/blue = IIIa/b/c | " +
        "Dashed blue = IIIc witness | Purple dashes = IV",
        x0,
        yGrid + rows * cellSize + 37
    );

    let detailY = yGrid + rows * cellSize + 60;
    textSize(13);

    if (events.length === 0) {
        const message = step.type === "cell"
            ? "No pruning rule applied: this box was propagated as a single cell."
            : step.type === "complete"
                ? "This is the final summary step; it does not apply a pruning rule."
                : "No pruning rule applied to this box; the recursive call was split.";
        fill(0);
        text(message, x0, detailY);
        detailY += 18;
    } else {
        for (const event of events) {
            const label = event.rule === "III"
                ? `Rule III${event.subrule} on the ${event.boundary} boundary: ${event.reason}`
                : event.rule === "IV"
                    ? `Rule IV skips the ${event.boundary} output: ${event.reason}`
                    : `Rule ${event.rule}: ${event.reason}`;
            const wrapped = wrapCanvasText(
                label,
                Math.max(180, width - x0 - 30)
            );

            fill(0);
            for (const lineText of wrapped) {
                text(lineText, x0, detailY);
                detailY += 16;
            }
        }
    }

    pop();

    return detailY + 20;
}

function pointAlongFrechetPath(path, progress) {
    let length = 0;
    const steps = path.slice(1).map((point, index) => {
        const previous = path[index];
        const size = Math.hypot(point[0] - previous[0], point[1] - previous[1]);
        length += size;
        return size;
    });
    if (length === 0) return path[0];

    let distance = progress * length;
    for (let index = 0; index < steps.length; index++) {
        const size = steps[index];
        if (distance <= size || index === steps.length - 1) {
            const part = size === 0 ? 0 : distance / size;
            const a = path[index];
            const b = path[index + 1];
            return [a[0] + part * (b[0] - a[0]), a[1] + part * (b[1] - a[1])];
        }
        distance -= size;
    }
    return path[path.length - 1];
}

function drawWalkingLeashView(result, panelY) {
    const panelHeight = 350;
    const panelX = 24;
    const panelWidth = width - 48;
    const path = result && result.path;

    push();
    fill(255);
    stroke(205, 215, 228);
    strokeWeight(1);
    rect(panelX, panelY, panelWidth, panelHeight, 14);
    noStroke();
    fill(22, 34, 56);
    textAlign(CENTER, TOP);
    textSize(20);
    text("Walking leash from the D&C path", width / 2, panelY + 16);

    if (!path || path.length < 2) {
        if (pathPlaybackSlider) pathPlaybackSlider.elt.disabled = true;
        fill(102, 117, 139);
        textSize(14);
        text(
            result && result.endpointReachable
                ? "D&C found the endpoint, but could not reconstruct a path."
                : "No matching path exists for this δ.",
            width / 2,
            panelY + 110
        );
        pop();
        if (pathPlaybackSlider) pathPlaybackSlider.position(width / 2 - 180, panelY + 155);
        return panelY + panelHeight;
    }

    if (pathPlaybackSlider) pathPlaybackSlider.elt.disabled = false;
    const progress = pathPlaybackSlider ? Number(pathPlaybackSlider.value()) : 0;
    const [s, t] = pointAlongFrechetPath(path, progress);
    const walkerP = pointAtCurveParameter(P, s);
    const walkerQ = pointAtCurveParameter(Q, t);
    const points = P.concat(Q);
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const scale = Math.min((width - 140) / Math.max(1, maxX - minX), 210 / Math.max(1, maxY - minY));
    const drawnWidth = (maxX - minX) * scale;
    const drawnHeight = (maxY - minY) * scale;
    const left = (width - drawnWidth) / 2;
    const top = panelY + 55 + (220 - drawnHeight) / 2;
    const map = point => ({
        x: left + (point.x - minX) * scale,
        y: top + (point.y - minY) * scale
    });

    for (const [curve, color] of [[P, "#1976D2"], [Q, "#E67E22"]]) {
        stroke(color);
        strokeWeight(3);
        noFill();
        beginShape();
        for (const point of curve) {
            const screen = map(point);
            vertex(screen.x, screen.y);
        }
        endShape();
    }

    const screenP = map(walkerP);
    const screenQ = map(walkerQ);
    stroke(180, 0, 220);
    strokeWeight(3);
    line(screenP.x, screenP.y, screenQ.x, screenQ.y);
    noStroke();
    fill("#1976D2");
    ellipse(screenP.x, screenP.y, 16, 16);
    fill("#E67E22");
    ellipse(screenQ.x, screenQ.y, 16, 16);

    fill(22, 34, 56);
    textSize(12);
    text(
        `s = ${s.toFixed(2)}   |   t = ${t.toFixed(2)}   |   leash = ${Math.hypot(walkerP.x - walkerQ.x, walkerP.y - walkerQ.y).toFixed(1)}   |   δ = ${delta}`,
        width / 2,
        panelY + 294
    );
    pop();

    if (pathPlaybackSlider) pathPlaybackSlider.position(width / 2 - 180, panelY + 315);
    return panelY + panelHeight;
}

// SETUP
function setup() {
    createCanvas(windowWidth, visualizationCanvasHeight());
    deltaSlider = createSlider(0, 300, delta, 1);
    deltaSlider.position(200, 485);
    deltaSlider.style('width', '300px');
    deltaSlider.style('height', '20px');
    deltaSlider.input(updateDelta);

    pathPlaybackSlider = createSlider(0, 1, 0, 0.001);
    pathPlaybackSlider.style('width', '360px');
    pathPlaybackSlider.input(() => redraw());

    button = createButton("Clear");
    button.position(30, 485);
    button.mousePressed(resetpoints);
    button = createButton("Draw curve P");
    button.position(30, 515);
    button.mousePressed(setPToPoints);
    button = createButton("Draw curve Q");
    button.position(30, 545);
    button.mousePressed(setQToPoints);
    button = createButton("Draw Free diagram");
    button.position(30, 575);
    button.mousePressed(resetpoints);
    createPruningPanel();

  // 1. Build the cell grid.
  cells = buildFreeSpaceDiagram(P, Q);

  divideAndConquerResult = runAlgorithm(P, Q, cells);
  if (allExperimentSettingsEnabled()) {
      pruningBaselineSteps = boxSteps.length;
  }
  updatePruningExperimentSummary();

  console.log("Divide and conquer:", divideAndConquerResult.endpointReachable);

  noLoop();
}

function keyPressed() {
    if (keyCode === RIGHT_ARROW) {
        currentBoxStep = Math.min(
            currentBoxStep + 1,
            boxSteps.length - 1
        );
    } else if (keyCode === LEFT_ARROW) {
        currentBoxStep = Math.max(
            currentBoxStep - 1,
            0
        );
    }

    redraw();

    return false;
}

function mouseMoved() {
    if (
        isMouseInCurveView(mouseX, mouseY) ||
        isMouseInCurveView(pmouseX, pmouseY)
    ) {
        redraw();
    }
}

function mouseDragged() {
    mouseMoved();
}

// DRAW
function draw() {
  background(240);
  fill(0);
    noStroke();
    textSize(18);
    textAlign(LEFT);
    text("Delta: " + delta, 200, 475);
  if (delta !== deltaSlider.value()) {
    updateDelta();
    }

  drawCurve(P, "#1976D2", "P");
  drawCurve(Q, "#E67E22", "Q");
  drawDeltaRadius();

  drawFreeSpaceDiagram(cells, divideAndConquerResult);
  const boxStepBottom = drawBoxStepDiagram(cells);
  const root = boxSteps[0];
  const extraDiagramBottom = root && (!root.children || root.children.length !== 2)
      ? drawDepthDiagram(cells)
      : boxStepBottom;
  const pruningBottom = drawPruningDiagram(cells, extraDiagramBottom);
  drawWalkingLeashView(
      divideAndConquerResult,
      Number.isFinite(pruningBottom) ? pruningBottom + 48 : 1350
  );
  for (i in points) {
    ellipse(points[i].x, points[i].y, 4, 4);
  }
}

// DRAW POLYGONAL CURVES
function drawCurve(curve, curveColor, name) {
  push();

  stroke(curveColor);
  strokeWeight(3);
  noFill();

  beginShape();

  for (let i = 0; i < curve.length; i++) {
      vertex(curve[i].x, curve[i].y);
  }

  endShape();

  for (let i = 0; i < curve.length; i++) {
      const p = curve[i];

      noStroke();
      fill(curveColor);

      ellipse(p.x, p.y, 12, 12);

      fill(0);
      textSize(14);

      text(
          name + (i + 1),
          p.x + 10,
          p.y - 10
      );
  }

  pop();
}

function isMouseInCurveView(x, y) {
    const cols = Math.max(1, P.length - 1);
    const rows = Math.max(1, Q.length - 1);
    const diagramCellSize = Math.min(
        CELL_SIZE,
        Math.max(35, (width - 480) / cols),
        Math.max(35, (height - 220) / rows)
    );
    const freeSpaceDiagramLeft = Math.max(
        440,
        width - (cols * diagramCellSize + 90)
    );

    return x >= 0 && x < freeSpaceDiagramLeft && y >= 0 && y < 460;
}

function drawDeltaRadius() {
    if (!isMouseInCurveView(mouseX, mouseY)) return;

    push();
    noFill();
    stroke(53, 120, 229, 190);
    strokeWeight(2);
    ellipse(mouseX, mouseY, delta * 2, delta * 2);

    // Show one radius explicitly so the circle is tied to the current delta.
    line(mouseX, mouseY, mouseX + delta, mouseY);

    noStroke();
    fill(53, 120, 229);
    ellipse(mouseX, mouseY, 7, 7);
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text(`δ = ${delta}`, mouseX + delta / 2, mouseY - 5);
    pop();
}

// DRAW FREE-SPACE DIAGRAM
function drawFreeSpaceDiagram(cells, result) {
  if (!cells || cells.length === 0 || cells[0].length === 0 || !result) return;

  const rows = cells.length;
  const cols = cells[0].length;
  const cellSize = Math.min(
      CELL_SIZE,
      Math.max(35, (width - 480) / cols),
      Math.max(35, (height - 220) / rows)
  );

  const offsetX = Math.max(
      440,
      width - (cols * cellSize + 90)
  );

  const offsetY = 250;

  push();

  // Title
  noStroke();
  fill(0);
  textSize(20);

  text(
      "Free-space diagram",
      offsetX,
      offsetY - 35
  );

  // ----------------------------------------------
  // Draw free and non-free space
  // ----------------------------------------------
  if (!freeSpaceDiagramImage) {
      freeSpaceDiagramImage = createImage(
          cols * RESOLUTION,
          rows * RESOLUTION
      );
      freeSpaceDiagramImage.loadPixels();

      for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
              const cell = cells[j][i];

              for (let y = 0; y < RESOLUTION; y++) {
                  for (let x = 0; x < RESOLUTION; x++) {
                      const s = (x + 0.5) / RESOLUTION;
                      const t = 1 - (y + 0.5) / RESOLUTION;
                      const free = isFree(cell, s, t);
                      const pixel = 4 * (
                          ((rows - j - 1) * RESOLUTION + y) * freeSpaceDiagramImage.width +
                          i * RESOLUTION + x
                      );

                      freeSpaceDiagramImage.pixels[pixel] = free ? 0 : 200;
                      freeSpaceDiagramImage.pixels[pixel + 1] = free ? 180 : 50;
                      freeSpaceDiagramImage.pixels[pixel + 2] = free ? 0 : 50;
                      freeSpaceDiagramImage.pixels[pixel + 3] = 255;
                  }
              }
          }
      }

      freeSpaceDiagramImage.updatePixels();
  }

  image(
      freeSpaceDiagramImage,
      offsetX,
      offsetY,
      cols * cellSize,
      rows * cellSize
  );

  // ----------------------------------------------
  // Draw cell borders
  // ----------------------------------------------
  noFill();
  stroke(0);
  strokeWeight(1);

  rect(
      offsetX,
      offsetY,
      cols * cellSize,
      rows * cellSize
  );

  for (let i = 1; i < cols; i++) {
      const x = offsetX + i * cellSize;

      line(
          x,
          offsetY,
          x,
          offsetY + rows * cellSize
      );
  }

  for (let j = 1; j < rows; j++) {
      const y = offsetY + j * cellSize;

      line(
          offsetX,
          y,
          offsetX + cols * cellSize,
          y
      );
  }

  if (result.path && result.path.length > 1) {
      stroke(180, 0, 220);
      strokeWeight(4);
      noFill();
      beginShape();
      for (const [s, t] of result.path) {
          vertex(offsetX + s * cellSize, offsetY + (rows - t) * cellSize);
      }
      endShape();
  }

  //Axis
  noStroke();
  fill(0);
  textSize(13);
  textAlign(CENTER);

  for (let i = 0; i <= cols; i++) {
      text(
          i + 1,
          offsetX + i * cellSize,
          offsetY + rows * cellSize + 18
      );
  }

  textAlign(RIGHT);

  for (let j = 0; j <= rows; j++) {
      text(
          j + 1,
          offsetX - 10,
          offsetY + (rows - j) * cellSize + 5
      );
  }

  
  textAlign(CENTER);
  textSize(16);

  text(
      "P →",
      offsetX + cols * cellSize / 2,
      offsetY + rows * cellSize + 45
  );

  push();

  translate(
      offsetX - 45,
      offsetY + rows * cellSize / 2
  );

  rotate(-HALF_PI);

  text("Q →", 0, 0);

  pop();

 
  textAlign(LEFT);
  textSize(13);

  fill(0, 180, 0);
  rect(
      offsetX,
      offsetY + rows * cellSize + 65,
      13,
      13
  );

  fill(0);
  text(
      "Free space",
      offsetX + 20,
      offsetY + rows * cellSize + 77
  );

  fill(200, 50, 50);
  rect(
      offsetX + 110,
      offsetY + rows * cellSize + 65,
      13,
      13
  );

  fill(0);
  text(
      "Non-free space",
      offsetX + 130,
      offsetY + rows * cellSize + 77
  );

  stroke(180, 0, 220);
  strokeWeight(4);
  line(
      offsetX + 275,
      offsetY + rows * cellSize + 71,
      offsetX + 292,
      offsetY + rows * cellSize + 71
  );
  noStroke();
  fill(0);
  text("Final path", offsetX + 300, offsetY + rows * cellSize + 77);

  //résultat
  textSize(16);
  textAlign(LEFT);

  fill(result.endpointReachable ? "#087A32" : "#C62828");

  text(
      result.endpointReachable
          ? "D&C: endpoint is reachable" : "D&C: endpoint is not reachable",
      offsetX,
      offsetY - 10
  );

  pop();
}

// RESIZE CANVAS
function windowResized() {
  resizeCanvas(windowWidth, visualizationCanvasHeight());

  redraw();
}  
