export function frameTimes(elapsed){const physics=Number.isFinite(elapsed)?Math.min(.25,Math.max(0,elapsed)):0;return{physics,visual:Math.min(.05,physics)};}
