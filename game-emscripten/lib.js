
var canvas = document.getElementById('canvas');
canvas.width = document.body.clientWidth / 2;
canvas.height = document.body.clientHeight / 2;

var ctx = canvas.getContext('2d');

function _d(str) {
    str = Pointer_stringify(str);
    console.log(str);
}

function _getCurrentTime() {
    return Date.now();
}

var randomSeed = 124;
function _random() {
    randomSeed = ((randomSeed * 1103515245) + 12345) & 0x7fffffff;
    return randomSeed / 0x7FFFFFFF;
}

function _cvsFillStyle(x) {
    return ctx.fillStyle = Pointer_stringify(x);
}

function _cvsFillRect(x, y, w, h) {
    return ctx.fillRect(x, y, w, h);
}

function _cvsStrokeStyle(x) {
    return ctx.strokeStyle = x;
}

function _cvsStrokeRect(x, y, w, h) {
    return ctx.strokeRect(x, y, w, h);
}

function _cvsDrawImage(img, x, y) {
    img = Pointer_stringify(img);
    ctx.drawImage(resourceCache[img], x, y);
}

function _cvsDrawImage2(img, x, y, w, h) {
    img = Pointer_stringify(img);
    ctx.drawImage(resourceCache[img], x, y, w, h);
}

function _cvsDrawImage3(img, sx, sy, sw, sh, dx, dy, dw, dh) {
    img = Pointer_stringify(img);
    ctx.drawImage(resourceCache[img], sx, sy, sw, sh, dx, dy, dw, dh);
}

function _cvsSave() {
    ctx.save();
}

function _cvsRestore() {
    ctx.restore();
}

function _cvsTranslate(x, y) {
    ctx.translate(x, y);
}

function _getWidth() {
    return canvas.width;
}

function _getHeight() {
    return canvas.height;
}

// Sprites

var resourceCache = {};
var readyCallbacks = [];

function _getImage(url) {
    jsUrl = Pointer_stringify(url);
    if(resourceCache[jsUrl]) {
        return url;
    }
    return null;
}

function _loadResource(url) {
    url = Pointer_stringify(url);

    if(resourceCache[url] === undefined) {
        var img = new Image();
        img.onload = function() {
            resourceCache[url] = img;

            if(isReady()) {
                readyCallbacks.forEach(function(funcName) {
                    (Module[funcName] || window[funcName])();
                });
                readyCallbacks = [];
            }
        };
        resourceCache[url] = false;
        img.src = url;
    }
}

function isReady() {
    var ready = true;
    for(var k in resourceCache) {
        if(!resourceCache[k]) {
            ready = false;
        }
    }
    return ready;
}

function _onReady(funcName) {
    funcName = '_' + Pointer_stringify(funcName);

    if(isReady()) {
        (Module[funcName] || window[funcName])();
    }
    else {
        readyCallbacks.push(funcName);
    }
}

// Input

var pressedKeys = {};
var specialKeys = {
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN'
};

document.addEventListener('keydown', function(e) {
    setKey(e, true);
});

document.addEventListener('keyup', function(e) {
    setKey(e, false);
});

function setKey(event, status) {
    var code = event.keyCode;

    if(code in specialKeys) {
        pressedKeys[specialKeys[code]] = status;
    }
    else {
        pressedKeys[String.fromCharCode(code)] = status;
    }
}

function _isDown(key) {
    key = Pointer_stringify(key);
    return pressedKeys[key.toUpperCase()];
}

var stats;

function _startTimer() {
    stats && stats.begin();
}

function _endTimer() {
    stats && stats.end();
}

window.addEventListener('load', function() {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // document.getElementById('maxEntitiesPerCell').innerHTML = maxEntitiesPerCell;
    // numEntitiesSpan.innerHTML = numEntities;
});
