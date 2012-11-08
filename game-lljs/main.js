(function (exports) {
  const $M = require('memory');
  $M.set_memcheck(false);
  const $malloc = $M.malloc, $I4 = $M.I4, $F8 = $M.F8, $U4 = $M.U4;
  var _;
  // Config
  var numEntities = 30000;
  var maxEntitiesPerCell = 100;
  // Util
  var memcheck = require('memcheck');
  var requestAnimFrame = function () {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60 | 0);
      };
    }();
  var seed = 124;
  function random() {
    seed = seed * 1103515245 + 12345 & 2147483647;
    return seed / 2147483647;
  }
  ;
  var stats;
  var canvas = document.getElementById('canvas');
  canvas.width = document.body.clientWidth / 2;
  canvas.height = document.body.clientHeight / 2;
  var ctx = canvas.getContext('2d');
  // Sprites
  var resourceCache = new Array(1000);
  var readyCallbacks = [];
  function loadResource(id, url) {
    if (resourceCache[id] === undefined) {
      var img = new Image();
      img.onload = function () {
        resourceCache[id] = img;
        if (isReady()) {
          readyCallbacks.forEach(function (func) {
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
    for (var k in resourceCache) {
      if (!resourceCache[k]) {
        ready = false;
      }
    }
    return ready;
  }
  function onReady(func) {
    if (isReady()) {
      func();
    } else {
      readyCallbacks.push(func);
    }
  }
  function updateSprite(sprite, dt) {
    const $F8 = $M.F8;
    $F8[(sprite) + 4] = $F8[(sprite) + 4] + $F8[(sprite) + 2] * dt;
  }
  function renderSprite(ctx, sprite, x, y) {
    const $I4 = $M.I4;
    renderSpriteClipped(ctx, sprite, x, y, $I4[((sprite) << 1) + 2], $I4[(((sprite) << 1) + 2) + 1]);
  }
  function dbg() {
  }
  var c = 0;
  var d = Date.now();
  function renderSpriteClipped(ctx, sprite, x, y, clipX, clipY) {
    const $I4 = $M.I4, $F8 = $M.F8;
    var offset = (sprite) << 1;
    var size = ((sprite) << 1) + 2;
    var img = getResource($I4[((sprite) << 1) + 6]);
    // We manually reset _index so that it doesn't increase forever
    // and oveflow at some point
    if ($F8[(sprite) + 4] > $I4[((sprite) << 1) + 7]) {
      $F8[(sprite) + 4] = 0;
    }
    var frame = $F8[(sprite) + 4] | 0;
    ctx.save();
    ctx.translate(x, y);
    c++;
    var s = 50;
    ctx.drawImage(img, 0, 0, s, s, 0, 0, s, s);
    // dbg(img,
    //     offset->x + frame * size->x, offset->y,
    //     Math.min(size->x, clipX), Math.min(size->y, clipY),
    //     0, 0,
    //     Math.min(size->x, clipX), Math.min(size->y, clipY));
    ctx.restore();
    if (Date.now() - d > 1000) {
      console.log(c);
      c = 0;
      d = Date.now();
    }
  }
  function renderEntity(entity) {
    const $U4 = $M.U4, $F8 = $M.F8;
    if ($U4[((entity) << 1) + 10]) {
      renderSprite(ctx, $U4[((entity) << 1) + 10], $F8[(entity) + 2] | 0, $F8[((entity) + 2) + 1] | 0);
    }
  }
  function updateEntity(entity, dt) {
    const $I4 = $M.I4, $F8 = $M.F8, $U4 = $M.U4;
    if ($I4[(entity) << 1] == ENTITY_PLAYER) {
      if (isDown('up')) {
        $F8[((entity) + 2) + 1] = $F8[((entity) + 2) + 1] - 100 * dt;
      }
      if (isDown('down')) {
        $F8[((entity) + 2) + 1] = $F8[((entity) + 2) + 1] + 100 * dt;
      }
      if (isDown('left')) {
        $F8[(entity) + 2] = $F8[(entity) + 2] - 100 * dt;
      }
      if (isDown('right')) {
        $F8[(entity) + 2] = $F8[(entity) + 2] + 100 * dt;
      }
    } else {
      $F8[(entity) + 2] = $F8[(entity) + 2] + Number(random() - 0.5);
      $F8[((entity) + 2) + 1] = $F8[((entity) + 2) + 1] + Number(random() - 0.5);
    }
    if ($U4[((entity) << 1) + 10]) {
      updateSprite($U4[((entity) << 1) + 10], dt);
    }
  }
  function makeEntity(type, sprite) {
    const $malloc = $M.malloc, $I4 = $M.I4, $F8 = $M.F8, $U4 = $M.U4;
    var entity = $malloc(48) >> 3;
    $I4[(entity) << 1] = type;
    $F8[(entity) + 2] = random() * canvas.width | 0;
    $F8[((entity) + 2) + 1] = random() * canvas.height | 0;
    $I4[((entity) << 1) + 8] = $I4[((sprite) << 1) + 2];
    $I4[(((entity) << 1) + 8) + 1] = $I4[(((sprite) << 1) + 2) + 1];
    $U4[((entity) << 1) + 10] = sprite;
    return entity;
  }
  function makeCells(w, h, numX, numY) {
    const $malloc = $M.malloc, $I4 = $M.I4, $U4 = $M.U4;
    var _;
    var cells = $malloc(24) >> 2;
    $I4[(cells)] = w;
    $I4[((cells)) + 1] = h;
    $I4[(cells) + 2] = numX;
    $I4[((cells) + 2) + 1] = numY;
    $I4[(cells) + 4] = numX * numY | 0;
    $U4[(cells) + 5] = $malloc((4 * $I4[(cells) + 4] | 0) >>> 0) >> 2;
    for (var i = 0; i < $I4[(cells) + 4]; _ = i, i = i + 1 | 0, _) {
      var list = $malloc(12) >> 2;
      $U4[list] = $malloc((4 * maxEntitiesPerCell | 0) >>> 0) >> 2;
      $I4[(list) + 1] = 0;
      $I4[(list) + 2] = false | 0;
      $U4[$U4[(cells) + 5] + i] = list;
    }
    cellsClear(cells);
    return cells;
  }
  function cellsClear(cells) {
    const $I4 = $M.I4, $U4 = $M.U4;
    var _;
    for (var i = 0; i < $I4[(cells) + 4]; _ = i, i = i + 1 | 0, _) {
      $I4[($U4[$U4[(cells) + 5] + i]) + 1] = 0;
      $I4[($U4[$U4[(cells) + 5] + i]) + 2] = false | 0;
    }
  }
  function cellsRelease(cells) {
    const $free = $M.free, $I4 = $M.I4, $U4 = $M.U4;
    var _;
    for (var i = 0; i < $I4[(cells) + 4]; _ = i, i = i + 1 | 0, _) {
      $free($U4[$U4[$U4[(cells) + 5] + i]] << 2);
      $free($U4[$U4[(cells) + 5] + i] << 2);
    }
    $free($U4[(cells) + 5] << 2);
  }
  function cellsAdd(cells, entity, x, y) {
    const $I4 = $M.I4, $U4 = $M.U4;
    var cellSizeX = $I4[(cells)] / $I4[(cells) + 2];
    var cellSizeY = $I4[((cells)) + 1] / $I4[((cells) + 2) + 1];
    if (x > 0 && y > 0 && x < $I4[(cells)] && y < $I4[((cells)) + 1]) {
      var idx = ($I4[(cells) + 2] * (y / cellSizeY | 0) | 0) + (x / cellSizeX | 0) | 0;
      var list = $U4[$U4[(cells) + 5] + idx];
      if ($I4[(list) + 1] < maxEntitiesPerCell) {
        $I4[(list) + 1] = $I4[(list) + 1] + 1 | 0;
        $U4[$U4[list] + ($I4[(list) + 1] - 1 | 0)] = entity;
      } else {
        $I4[(list) + 2] = true | 0;
      }
    }
  }
  function cellsGet(cells, x, y) {
    const $I4 = $M.I4, $U4 = $M.U4;
    var cellSizeX = $I4[(cells)] / $I4[(cells) + 2];
    var cellSizeY = $I4[((cells)) + 1] / $I4[((cells) + 2) + 1];
    if (x > 0 && y > 0 && x < $I4[(cells)] && y < $I4[((cells)) + 1]) {
      var idx = ($I4[(cells) + 2] * (y / cellSizeY | 0) | 0) + (x / cellSizeX | 0) | 0;
      return $U4[$U4[(cells) + 5] + idx];
    }
    return 0;
  }
  // function renderDebug() {
  //     let int cellSizeX = cells->size.x / cells->count.x;
  //     let int cellSizeY = cells->size.y / cells->count.y;
  //     for(let int i=0; i<cells->_length; i++) {
  //         let int x = i % cells->count.x;
  //         let int y = i / cells->count.x;
  //         let CellList *list = cells->cache[i];
  //         if(list->missed) {
  //             ctx.fillStyle = 'rgba(0, 255, 0, .2)';
  //         }
  //         else if(list->index > 0) {
  //             ctx.fillStyle = 'rgba(255, 0, 0, .2)';
  //         }
  //         if(list->missed || list->index > 0) {
  //             ctx.fillRect(x * cellSizeX,
  //                          y * cellSizeY,
  //                          cellSizeX,
  //                          cellSizeY);
  //         }
  //         for(let int j=0; j<list->index; j++) {
  //             if(list->_list[j] == playerEntity) {
  //                 ctx.fillRect(x * cellSizeX,
  //                              y * cellSizeY,
  //                              cellSizeX,
  //                              cellSizeY);
  //             }
  //         }
  //     }
  //     for(let int i=0; i<numEntities; i++) {
  //         let Entity *ent = objects[i];
  //         ctx.strokeRect(ent->pos.x, ent->pos.y,
  //                        ent->size.x, ent->size.y);
  //     }
  // }
  // Game
  var ENTITY_PLAYER = 1;
  var ENTITY_ENEMY = 2;
  var IMG_BOSSES = 1;
  var objects = $malloc((4 * numEntities | 0) >>> 0) >> 2;
  var cells = makeCells(canvas.width | 0, canvas.height | 0, 6, 6);
  var playerSprite = $malloc(40) >> 3;
  $I4[(playerSprite) << 1] = 0;
  $I4[((playerSprite) << 1) + 1] = 395;
  $I4[((playerSprite) << 1) + 2] = 80;
  $I4[(((playerSprite) << 1) + 2) + 1] = 35;
  $F8[(playerSprite) + 2] = 5;
  $I4[((playerSprite) << 1) + 6] = IMG_BOSSES;
  $I4[((playerSprite) << 1) + 7] = 3;
  $F8[(playerSprite) + 4] = 0;
  var playerEntity = makeEntity(ENTITY_PLAYER, playerSprite);
  $U4[objects + 0] = playerEntity;
  function makeEnemySprite() {
    const $malloc = $M.malloc, $I4 = $M.I4, $F8 = $M.F8;
    var enemySprite = $malloc(40) >> 3;
    $I4[(enemySprite) << 1] = 0;
    $I4[((enemySprite) << 1) + 1] = 111;
    $I4[((enemySprite) << 1) + 2] = 240 / 6 | 0;
    $I4[(((enemySprite) << 1) + 2) + 1] = 40;
    $F8[(enemySprite) + 2] = 5;
    $I4[((enemySprite) << 1) + 6] = IMG_BOSSES;
    $I4[((enemySprite) << 1) + 7] = 6;
    $F8[(enemySprite) + 4] = 0;
    return enemySprite;
  }
  for (var i = 1; i < numEntities; _ = i, i = i + 1 | 0, _) {
    $U4[objects + i] = makeEntity(ENTITY_ENEMY, makeEnemySprite());
  }
  function removeObject(entity) {
    const $U4 = $M.U4;
    var _;
    for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
      if ($U4[objects + i] == entity) {
        //for(let int j=0; j<1000; j++) {
        $U4[objects + i] = makeEntity(ENTITY_ENEMY, makeEnemySprite());
      }
    }
  }
  function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 || b <= y2 || y > b2);
  }
  function _checkCollisions(entity, list) {
    const $F8 = $M.F8, $I4 = $M.I4, $U4 = $M.U4;
    var _;
    if (list) {
      var posX = $F8[(entity) + 2];
      var posY = $F8[((entity) + 2) + 1];
      var sizeX = $I4[((entity) << 1) + 8];
      var sizeY = $I4[(((entity) << 1) + 8) + 1];
      var ents = $U4[list];
      for (var i = 0; i < $I4[(list) + 1]; _ = i, i = i + 1 | 0, _) {
        var entity2 = $U4[ents + i];
        if (entity2 != entity) {
          var pos2 = ($U4[ents + i]) + 2;
          var size2 = (($U4[ents + i]) << 1) + 8;
          if (collides(posX | 0, posY | 0, posX + sizeX | 0, posY + sizeY | 0, $F8[pos2] | 0, $F8[(pos2) + 1] | 0, $F8[pos2] + $I4[size2] | 0, $F8[(pos2) + 1] + $I4[(size2) + 1] | 0)) {
            if (entity == playerEntity) {
              removeObject(entity2);
            }
          }
        }
      }
    }
  }
  function checkCollisions() {
    const $U4 = $M.U4, $F8 = $M.F8, $I4 = $M.I4;
    var _;
    for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
      var ent = $U4[objects + i];
      if (ent) {
        _checkCollisions(ent, cellsGet(cells, $F8[(ent) + 2], $F8[((ent) + 2) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F8[(ent) + 2], $F8[((ent) + 2) + 1] + $I4[(((ent) << 1) + 8) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F8[(ent) + 2] + $I4[((ent) << 1) + 8], $F8[((ent) + 2) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F8[(ent) + 2] + $I4[((ent) << 1) + 8], $F8[((ent) + 2) + 1] + $I4[(((ent) << 1) + 8) + 1]));
      }
    }
  }
  var last = Number(Date.now() / 1000);
  var count = 0;
  function heartbeat() {
    const $U4 = $M.U4;
    var _;
    var now = Number(Date.now() / 1000);
    count = 0;
    stats.begin();
    checkCollisions();
    cellsClear(cells);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
      var ent = $U4[objects + i];
      if (ent) {
        //updateEntity(ent, now - last);
        renderEntity(ent);
      }
    }
    //renderDebug();
    last = now;
    stats.end();
    numEntitiesSpan.innerHTML = count;
    requestAnimFrame(heartbeat);
  }
  function finish() {
    const $free = $M.free, $U4 = $M.U4;
    var _;
    for (var x = 0; x < numEntities; _ = x, x = x + 1 | 0, _) {
      $free($U4[(($U4[objects + x]) << 1) + 10] << 3);
      $free($U4[objects + x] << 3);
    }
    $free(objects << 2);
    cellsRelease(cells);
    $free(cells << 2);
    console.log(memcheck.report());
  }
  loadResource(IMG_BOSSES, '../resources/bosses.png');
  var numEntitiesSpan = document.getElementById('numEntities');
  window.addEventListener('load', function () {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    document.getElementById('maxEntitiesPerCell').innerHTML = maxEntitiesPerCell;
    numEntitiesSpan.innerHTML = numEntities;
    onReady(heartbeat);
  });
}.call(this, typeof exports === 'undefined' ? game_lljs_main_ljs = {} : exports));
