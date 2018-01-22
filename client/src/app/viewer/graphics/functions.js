// renderer
const jtblRender = [];
export function renderAdd(type, rfnc) { jtblRender[type] = rfnc; }
export function renderNxt() { return jtblRender.length; }

/**
 * Renders graphics object on a given canvas 2d context
 */
export function render(ctx, obj) {
    ctx.save();
    let constructor = obj.constructor;
    while (constructor.rtype !== undefined) {
        jtblRender[constructor.rtype()](ctx, obj);
        constructor = Object.getPrototypeOf(constructor);
    }
    ctx.restore();
}

// collision detector
const jtblCollides = [];
export function collidesAdd(type, cfnc) { jtblCollides[type] = cfnc; }
export function collidesNxt() { return jtblCollides.length; }

/**
 * Checks if a position is colliding with a given graphics object
 */
export function collides(x, y, obj) {
    return jtblCollides[obj.constructor.ctype()](x, y, obj);
}
