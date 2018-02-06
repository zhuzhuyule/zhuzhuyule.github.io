/*
 * Shape Shifter
 * http://www.kennethcachia.com/shape-shifter
 * A canvas experiment
 */

'use strict';

var canvas;
var ctx;
var pixelRadius;
var pixelContiner;
var fontSize = 500,
    fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';

var shapeShift = {
    init: function() {
        var action = window.location.href,
            i = action.indexOf('?a=');

        shapeShift.Drawing.init('.canvas');
        shapeShift.ShapeBuilder.init();
        shapeShift.UI.init();


        if (i !== -1) {
            shapeShift.UI.simulate(decodeURI(action).substring(i + 3));
        } else {
            shapeShift.UI.simulate('#rectangle 5x5|#circle 25|Shape|Shifter|Type|to start|#icon thumbs-up|#countdown 3||');
        }

        shapeShift.Drawing.loop(function() {
            shapeShift.Shape.render();
        });
    }
};

window.addEventListener('load', function() {
    canvas = document.createElement('canvas');
    canvas.id = 'mainCanvas';
    canvas.className = 'canvas';
    canvas.height = 600;
    canvas.width = 600;
    ctx = canvas.getContext('2d');

    pixelRadius = 3;
    pixelContiner = pixelRadius * 2 + 1;
    document.body.insertBefore(canvas, document.body.firstChild);


    document.body.classList.add('body--ready');

    shapeShift.init();
});

shapeShift.Drawing = (function() {
    var renderFn,
        requestFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };

    return {
        init: function(el) {

            this.adjustCanvas();

            window.addEventListener('resize', function() {
                shapeShift.Drawing.adjustCanvas();
            });
        },

        loop: function(fn) {
            renderFn = !renderFn ? fn : renderFn;
            this.clearFrame();
            renderFn();
            requestFrame.call(window, this.loop.bind(this));
        },

        adjustCanvas: function() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        },

        clearFrame: function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        getArea: function() {
            return { w: canvas.width, h: canvas.height };
        },

        drawCircle: function(p, c) {
            ctx.fillStyle = c.render();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI, true);
            ctx.closePath();
            ctx.fill();
        }
    };
}());


shapeShift.Point = function(args) {
    this.x = args.x;
    this.y = args.y;
    this.r = args.r;
    this.a = args.a;
    this.h = args.h;
};


shapeShift.Color = function(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};

shapeShift.Color.prototype = {
    render: function() {
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
    }
};


shapeShift.UI = (function() {
    var input = document.querySelector('.ui-input'),
        ui = document.querySelector('.ui'),
        help = document.querySelector('.help'),
        commands = document.querySelector('.commands'),
        overlay = document.querySelector('.overlay'),
        interval,
        isTouch = false, //('ontouchstart' in window || navigator.msMaxTouchPoints),
        currentAction,
        resizeTimer,
        time,
        maxShapeSize = 30,
        firstAction = true,
        sequence = [],
        cmd = '#';

    function formatTime(date) {
        var h = date.getHours(),
            m = date.getMinutes();

        m = m < 10 ? '0' + m : m;
        return h + ':' + m;
    }

    function getValue(value) {
        return value && value.split(' ')[1];
    }

    function getAction(value) {
        value = value && value.split(' ')[0];
        return value && value[0] === cmd && value.substring(1);
    }

    function timedAction(fn, delay, max, reverse) {
        clearInterval(interval);
        currentAction = reverse ? max : 1;
        fn(currentAction);

        if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
            interval = setInterval(function() {
                currentAction = reverse ? currentAction - 1 : currentAction + 1;
                fn(currentAction);

                if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
                    clearInterval(interval);
                }
            }, delay);
        }
    }

    function reset(destroy) {
        clearInterval(interval);
        sequence = [];
        time = null;

        if (destroy) {
            shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(''));
        }
    }

    function performAction(value) {
        var action,
            current;

        overlay.classList.remove('overlay--visible');
        sequence = typeof(value) === 'object' ? value : sequence.concat(value.split('|'));
        input.value = '';
        checkInputWidth();

        timedAction(function() {
            current = sequence.shift();
            action = getAction(current);
            value = getValue(current);

            switch (action) {
                case 'countdown':
                    value = parseInt(value, 10) || 10;
                    value = value > 0 ? value : 10;

                    timedAction(function(index) {
                        if (index === 0) {
                            if (sequence.length === 0) {
                                shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(''));
                            } else {
                                performAction(sequence);
                            }
                        } else {
                            shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(index), true);
                        }
                    }, 1000, value, true);
                    break;

                case 'rectangle':
                    value = value && value.split('x');
                    value = (value && value.length === 2) ? value : [maxShapeSize, maxShapeSize / 2];

                    shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.rectangle(Math.min(maxShapeSize, parseInt(value[0], 10)), Math.min(maxShapeSize, parseInt(value[1], 10))));
                    break;

                case 'circle':
                    value = parseInt(value, 10) || maxShapeSize;
                    value = Math.min(value, maxShapeSize);
                    shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.circle(value));
                    break;

                case 'time':
                    var t = formatTime(new Date());

                    if (sequence.length > 0) {
                        shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(t));
                    } else {
                        timedAction(function() {
                            t = formatTime(new Date());
                            if (t !== time) {
                                time = t;
                                shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(time));
                            }
                        }, 1000);
                    }
                    break;

                case 'icon':
                    shapeShift.ShapeBuilder.imageFile('font-awesome/' + value + '.png', function(obj) {
                        shapeShift.Shape.switchShape(obj);
                    });
                    break;

                default:
                    shapeShift.Shape.switchShape(shapeShift.ShapeBuilder.letter(current[0] === cmd ? 'What?' : current));
            }
        }, 2000, sequence.length);
    }

    function checkInputWidth() {
        if (input.value.length > 18) {
            ui.classList.add('ui--wide');
        } else {
            ui.classList.remove('ui--wide');
        }

        if (firstAction && input.value.length > 0) {
            ui.classList.add('ui--enter');
        } else {
            ui.classList.remove('ui--enter');
        }
    }

    function bindEvents() {
        document.body.addEventListener('keydown', function(e) {
            input.focus();

            if (e.keyCode === 13) {
                firstAction = false;
                reset();
                performAction(input.value);
            }
        });

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                shapeShift.Shape.shuffleIdle();
                reset(true);
            }, 500);
        });

        input.addEventListener('input', checkInputWidth);
        input.addEventListener('change', checkInputWidth);
        input.addEventListener('focus', checkInputWidth);

        help.addEventListener('click', function() {
            overlay.classList.toggle('overlay--visible');

            if (overlay.classList.contains('overlay--visible')) {
                reset(true);
            }
        });

        commands.addEventListener('click', function(e) {
            var el,
                info,
                demo,
                url;

            if (e.target.classList.contains('commands-item')) {
                el = e.target;
            } else {
                el = e.target.parentNode.classList.contains('commands-item') ? e.target.parentNode : e.target.parentNode.parentNode;
            }

            info = el && el.querySelector('.commands-item-info');
            demo = el && info.getAttribute('data-demo');
            url = el && info.getAttribute('data-url');

            if (info) {
                overlay.classList.remove('overlay--visible');

                if (demo) {
                    input.value = demo;

                    if (isTouch) {
                        reset();
                        performAction(input.value);
                    } else {
                        input.focus();
                    }
                } else if (url) {
                    window.location = url;
                }
            }
        });

        canvas.addEventListener('click', function() {
            overlay.classList.remove('overlay--visible');
        });
    }

    return {
        init: function() {
            bindEvents();
            input.focus();

            if (isTouch) {
                document.body.classList.add('touch');
            }

            shapeShift.UI.Tabs.init();
        },

        simulate: function(action) {
            performAction(action);
        }
    };
}());


shapeShift.UI.Tabs = (function() {
    var labels = document.querySelector('.tabs-labels'),
        triggers = document.querySelectorAll('.tabs-label'),
        panels = document.querySelectorAll('.tabs-panel');

    function activate(i) {
        triggers[i].classList.add('tabs-label--active');
        panels[i].classList.add('tabs-panel--active');
    }

    function bindEvents() {
        labels.addEventListener('click', function(e) {
            var el = e.target,
                index;

            if (el.classList.contains('tabs-label')) {
                for (var t = 0; t < triggers.length; t++) {
                    triggers[t].classList.remove('tabs-label--active');
                    panels[t].classList.remove('tabs-panel--active');

                    if (el === triggers[t]) {
                        index = t;
                    }
                }

                activate(index);
            }
        });
    }

    return {
        init: function() {
            activate(0);
            bindEvents();
        }
    };
}());


shapeShift.Dot = function(x, y) {
    this.p = new shapeShift.Point({
        x: x,
        y: y,
        r: pixelRadius,
        a: 1,
        h: 0
    });

    this.e = 0.07;
    this.s = true;

    this.c = new shapeShift.Color(255, 255, 255, this.p.a);

    this.t = this.clone();
    this.q = [];
};

shapeShift.Dot.prototype = {
    clone: function() {
        return new shapeShift.Point({
            x: this.x,
            y: this.y,
            r: this.r,
            a: this.a,
            h: this.h
        });
    },

    _draw: function() {
        this.c.a = this.p.a;
        shapeShift.Drawing.drawCircle(this.p, this.c);
    },

    _moveTowards: function(n) {
        var details = this.distanceTo(n, true),
            dx = details[0],
            dy = details[1],
            d = details[2],
            e = this.e * d;

        if (this.p.h === -1) {
            this.p.x = n.x;
            this.p.y = n.y;
            return true;
        }

        if (d > 1) {
            this.p.x -= ((dx / d) * e);
            this.p.y -= ((dy / d) * e);
        } else {
            if (this.p.h > 0) {
                this.p.h--;
            } else {
                return true;
            }
        }

        return false;
    },

    _update: function() {
        var p,
            d;

        if (this._moveTowards(this.t)) {
            p = this.q.shift();

            if (p) {
                this.t.x = p.x || this.p.x;
                this.t.y = p.y || this.p.y;
                this.t.r = p.r || this.p.r;
                this.t.a = p.a || this.p.a;
                this.p.h = p.h || 0;
            } else {
                if (this.s) {
                    this.p.x -= Math.sin(Math.random() * 3.142);
                    this.p.y -= Math.sin(Math.random() * 3.142);
                } else {
                    this.move(new shapeShift.Point({
                        x: this.p.x + (Math.random() * 50) - 25,
                        y: this.p.y + (Math.random() * 50) - 25,
                    }));
                }
            }
        }

        d = this.p.a - this.t.a;
        this.p.a = Math.max(0.1, this.p.a - (d * 0.05));
        d = this.p.r - this.t.r;
        this.p.r = Math.max(1, this.p.r - (d * 0.05));
    },

    distanceTo: function(n, details) {
        var dx = this.p.x - n.x,
            dy = this.p.y - n.y,
            d = Math.sqrt(dx * dx + dy * dy);

        return details ? [dx, dy, d] : d;
    },

    move: function(p, avoidStatic) {
        if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
            this.q.push(p);
        }
    },

    render: function() {
        this._update();
        this._draw();
    }
};


shapeShift.ShapeBuilder = (function() {
    function fit() {
        canvas.width = Math.floor(window.innerWidth / pixelContiner) * pixelContiner;
        canvas.height = Math.floor(window.innerHeight / pixelContiner) * pixelContiner;
        ctx.fillStyle = 'red';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
    }

    function processCanvas() {
        var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
            dots = [],
            x = 0,
            y = 0,
            fx = canvas.width,
            fy = canvas.height,
            w = 0,
            h = 0;

        for (var p = 0; p < pixels.length; p += (4 * pixelContiner)) {
            if (pixels[p + 3] > 0) {
                dots.push(new shapeShift.Point({
                    x: x,
                    y: y
                }));

                w = x > w ? x : w;
                h = y > h ? y : h;
                fx = x < fx ? x : fx;
                fy = y < fy ? y : fy;
            }

            x += pixelContiner;

            if (x >= canvas.width) {
                x = 0;
                y += pixelContiner;
                p += pixelContiner * 4 * canvas.width;
            }
        }

        return { dots: dots, w: w + fx, h: h + fy };
    }

    function setFontSize(s) {
        ctx.font = 'bold ' + s + 'px ' + fontFamily;
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    return {
        init: function() {
            fit();
            window.addEventListener('resize', fit);
        },

        imageFile: function(url, callback) {
            var image = new Image(),
                area = shapeShift.Drawing.getArea();

            image.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(this, 0, 0, area.h * 0.6, area.h * 0.6);
                callback(processCanvas());
            };

            image.onerror = function() {
                callback(shapeShift.ShapeBuilder.letter('What?'));
            };

            image.src = url;
        },

        circle: function(d) {
            var r = Math.max(0, d) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.arc(r * pixelContiner, r * pixelContiner, r * pixelContiner, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            return processCanvas();
        },

        letter: function(text) {
            var s = 0;

            setFontSize(fontSize);
            s = Math.min(fontSize,
                (canvas.width / ctx.measureText(text).width) * 0.8 * fontSize,
                (canvas.height / fontSize) * (isNumber(text) ? 1 : 0.45) * fontSize);
            setFontSize(s);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            return processCanvas();
        },

        rectangle: function(countW, countH) {
            var dots = [],
                width = pixelContiner * countW,
                height = pixelContiner * countH;

            for (var y = 0; y < height; y += pixelContiner) {
                for (var x = 0; x < width; x += pixelContiner) {
                    dots.push(new shapeShift.Point({
                        x: x,
                        y: y,
                    }));
                }
            }

            return { dots: dots, w: width, h: height };
        }
    };
}());


shapeShift.Shape = (function() {
    var dots = [],
        width = 0,
        height = 0,
        cx = 0,
        cy = 0;

    function compensate() {
        var a = shapeShift.Drawing.getArea();

        cx = a.w / 2 - width / 2;
        cy = a.h / 2 - height / 2;
    }

    return {
        shuffleIdle: function() {
            var a = shapeShift.Drawing.getArea();

            for (var d = 0; d < dots.length; d++) {
                if (!dots[d].s) {
                    dots[d].move({
                        x: Math.random() * a.w,
                        y: Math.random() * a.h
                    });
                }
            }
        },

        switchShape: function(n, fast) {
            var size,
                a = shapeShift.Drawing.getArea(),
                d = 0,
                i = 0;

            width = n.w;
            height = n.h;

            compensate();

            if (n.dots.length > dots.length) {
                size = n.dots.length - dots.length;
                for (d = 1; d <= size; d++) {
                    dots.push(new shapeShift.Dot(a.w / 2, a.h / 2));
                }
            }

            d = 0;

            while (n.dots.length > 0) {
                i = Math.floor(Math.random() * n.dots.length);
                dots[d].e = fast ? 0.25 : (dots[d].s ? 0.14 : 0.11);

                if (dots[d].s) {
                    dots[d].move(new shapeShift.Point({
                        r: Math.random() * 20 + 10,
                        a: Math.random(),
                        h: 18
                    }));
                } else {
                    dots[d].move(new shapeShift.Point({
                        r: Math.random() * pixelRadius + pixelRadius,
                        h: fast ? 18 : 30
                    }));
                }

                dots[d].s = true;
                dots[d].move(new shapeShift.Point({
                    x: n.dots[i].x + cx,
                    y: n.dots[i].y + cy,
                    a: 1,
                    r: pixelRadius,
                    h: 0
                }));

                n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
                d++;
            }

            for (i = d; i < dots.length; i++) {
                if (dots[i].s) {
                    dots[i].move(new shapeShift.Point({
                        r: Math.random() * 20 + 10,
                        a: Math.random(),
                        h: 20
                    }));

                    dots[i].s = false;
                    dots[i].e = 0.04;
                    dots[i].move(new shapeShift.Point({
                        x: Math.random() * a.w,
                        y: Math.random() * a.h,
                        a: 0.3, //.4
                        r: Math.random() * 4,
                        h: 0
                    }));
                }
            }
        },

        render: function() {
            for (var d = 0; d < dots.length; d++) {
                dots[d].render();
            }
        }
    };
}());