
// Config

var numEntities = 1000;
var maxEntitiesPerCell = 100;

// Util

var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var seed = 124;
Math.random = function () {
    seed = ((seed * 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x7FFFFFFF;
};

var stats;
var canvas = document.getElementById('canvas');
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

var ctx = canvas.getContext('2d');

// Sprites

var resourceCache = new Array(1000);
var readyCallbacks = [];

function loadResource(id, url) {
    if(resourceCache[id] === undefined) {
        var img = new Image();
        img.onload = function() {
            resourceCache[id] = img;

            if(isReady()) {
                readyCallbacks.forEach(function(func) {
                    func();
                });
                readyCallbacks = [];
            }
        };
        resourceCache[id] = false;
        img.src = url;
    }
}

function getResource(id) {
    return resourceCache[id];
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

function onReady(func) {
    if(isReady()) {
        func();
    }
    else {
        readyCallbacks.push(func);
    }
}

// Sprites

function Sprite() {}

function updateSprite(sprite, dt) {
    sprite._index += sprite.speed * dt;
}

function renderSprite(ctx, sprite, x, y) {
    renderSpriteClipped(ctx, sprite, x, y, sprite.size.x, sprite.size.y);
}

function renderSpriteClipped(ctx, sprite, x, y, clipX, clipY) {
    var offset = sprite.offset;
    var size = sprite.size;
    var img = getResource(sprite.img);

    // We manually reset _index so that it doesn't increase forever
    // and oveflow at some point
    if(sprite._index > sprite.numFrames) {
        sprite._index = 0;
    }

    var frame = Math.floor(sprite._index);

    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(getResource(sprite.img),
                  offset.x + frame * size.x, offset.y,
                  Math.min(size.x, clipX), Math.min(size.y, clipY),
                  0, 0,
                  Math.min(size.x, clipX), Math.min(size.y, clipY));
    ctx.restore();
}

// Entities

function Entity() {}

function renderEntity(entity) {
    if(entity.sprite) {
        renderSprite(ctx, entity.sprite, entity.pos.x, entity.pos.y);
    }
}

function updateEntity(entity, dt) {
    if(entity.type == ENTITY_PLAYER) {
        if(isDown('up')) {
            entity.pos.y = entity.pos.y - 100*dt;
        }

        if(isDown('down')) {
            entity.pos.y = entity.pos.y + 100*dt;
        }

        if(isDown('left')) {
            entity.pos.x = entity.pos.x - 100*dt;
        }

        if(isDown('right')) {
            entity.pos.x = entity.pos.x + 100*dt;
        }
    }

    if(entity.sprite) {
        updateSprite(entity.sprite, dt);
    }
}

function makeEntity(type, sprite) {
    var entity = new Entity();
    entity.type = type;
    entity.pos = { x: Math.random() * canvas.width,
                   y: Math.random() * canvas.height };
    entity.size = { x: sprite.size.x, y: sprite.size.y };
    entity.sprite = sprite;

    return entity;
}

// Cells

function CellList() {
    this._list = new Array(maxEntitiesPerCell);
    this.index = 0;
}

function Cells() {}

function makeCells(w, h, numX, numY) {
    var cells = new Cells();
    cells.size = { x: w, y: h };
    cells.count = { x: numX, y: numY };
    cells._length = numX*numY;

    cells.cache = new Array(cells._length);
    for(var i=0; i<cells._length; i++) {
        cells.cache[i] = new CellList();
    }

    cellsClear(cells);
    return cells;
}

function cellsClear(cells) {
    for(var i=0; i<cells._length; i++) {
        cells.cache[i].index = 0;
    }
}

function cellsAdd(cells, entity, x, y) {
    var cellSizeX = cells.size.x / cells.count.x;
    var cellSizeY = cells.size.y / cells.count.y;

    if(x > 0 && y > 0 && x < cells.size.x && y < cells.size.y) {
        var idx = (cells.count.x *
                   Math.floor(y / cellSizeY) +
                   Math.floor(x / cellSizeX));
        var list = cells.cache[idx];

        if(list.index < maxEntitiesPerCell) {
            list.index++;
            list._list[list.index - 1] = entity;
        }
    }
}

function cellsGet(cells, x, y) {
    var cellSizeX = cells.size.x / cells.count.x;
    var cellSizeY = cells.size.y / cells.count.y;

    if(x > 0 && y > 0 && x < cells.size.x && y < cells.size.y) {
        var idx = (cells.count.x *
                   Math.floor(y / cellSizeY) +
                   Math.floor(x / cellSizeX));
        return cells.cache[idx];
    }

    return null;
}

// Game

var ENTITY_PLAYER = 1;
var ENTITY_ENEMY = 2;

var IMG_BOSSES = 1;

var objects = new Array(numEntities);
var cells = makeCells(canvas.width, canvas.height, 6, 6);

var playerSprite = new Sprite();
playerSprite.offset = { x: 0, y: 395 };
playerSprite.size = { x: 80, y: 35 };
playerSprite.speed = 5.0;
playerSprite.img = IMG_BOSSES;
playerSprite.numFrames = 3;
playerSprite._index = 0;

var playerEntity = makeEntity(ENTITY_PLAYER, playerSprite);
objects[0] = playerEntity;

for(var i=1; i<numEntities; i++) {
    var enemySprite = new Sprite();
    enemySprite.offset = { x: 0, y: 111 };
    enemySprite.size = { x: 240/6, y: 40 };
    enemySprite.speed = 5.0;
    enemySprite.img = IMG_BOSSES;
    enemySprite.numFrames = 6;
    enemySprite._index = 0;

    objects[i] = makeEntity(ENTITY_ENEMY, enemySprite);
}

function removeObject(entity) {
    for(var i=0; i<numEntities; i++) {
        if(objects[i] == entity) {
            objects[i] = null;
        }
    }
}

function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function _checkCollisions(entity, list) {
    var pos = entity.pos;
    var size = entity.size;

    if(list) {
        for(var i=0; i<list.index; i++ ) {
            var entity2 = list._list[i];

            if(entity2 != entity) {
                var pos2 = entity2.pos;
                var size2 = entity2.size;

                if(collides(pos.x, pos.y,
                            pos.x + size.x, pos.y + size.y,
                            pos2.x, pos2.y,
                            pos2.x + size2.x, pos2.y + size2.y)) {
                    if(entity == playerEntity) {
                        removeObject(entity2);
                    }
                }
            }
        }
    }
}

function checkCollisions() {
    for(var i=0; i<numEntities; i++) {
        var ent = objects[i];

        if(ent) {
            _checkCollisions(ent, cellsGet(cells, ent.pos.x, ent.pos.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent.pos.x,
                                           ent.pos.y + ent.size.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent.pos.x + ent.size.x,
                                           ent.pos.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent.pos.x + ent.size.x,
                                           ent.pos.y + ent.size.y));
        }
    }
}

var last = Date.now() / 1000;
function heartbeat() {
    var now = Date.now() / 1000;

    stats.begin();
    checkCollisions();

    cellsClear(cells);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(var x=0; x<numEntities; x++) {
        var ent = objects[x];

        if(ent) {
            updateEntity(ent, now - last);
            renderEntity(ent);

            cellsAdd(cells, ent, ent.pos.x, ent.pos.y);
            cellsAdd(cells, ent, ent.pos.x + ent.size.x, ent.pos.y);
            cellsAdd(cells, ent, ent.pos.x, ent.pos.y + ent.size.y);
            cellsAdd(cells,
                     ent, 
                     ent.pos.x + ent.size.x,
                     ent.pos.y + ent.size.y);
        }
    }

    last = now;
    stats.end();
    requestAnimFrame(heartbeat);
}

loadResource(IMG_BOSSES, '../resources/bosses.png');

window.addEventListener('load', function() {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    document.getElementById('maxEntitiesPerCell').innerHTML = maxEntitiesPerCell;
    document.getElementById('numEntities').innerHTML = numEntities;

    onReady(heartbeat);
});

