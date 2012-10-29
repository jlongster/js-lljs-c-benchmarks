(function (exports) {
  const $M = require('memory');
  $M.set_memcheck(false);
  const $malloc = $M.malloc, $I4 = $M.I4, $F4 = $M.F4, $U4 = $M.U4;
  var _;
  // let memcheck = require('memcheck');
  var requestAnimFrame = function () {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60 | 0);
      };
    }();
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
    const $F4 = $M.F4;
    $F4[(sprite) + 7] = $F4[(sprite) + 7] + $F4[(sprite) + 4] * dt;
  }
  function renderSprite(ctx, sprite, x, y) {
    const $I4 = $M.I4;
    renderSpriteClipped(ctx, sprite, x, y, $I4[(sprite) + 2], $I4[((sprite) + 2) + 1]);
  }
  function renderSpriteClipped(ctx, sprite, x, y, clipX, clipY) {
    const $I4 = $M.I4, $F4 = $M.F4;
    var offset = (sprite);
    var size = (sprite) + 2;
    var img = getResource($I4[(sprite) + 5]);
    // We manually reset _index so that it doesn't increase forever
    // and oveflow at some point
    if ($F4[(sprite) + 7] > $I4[(sprite) + 6]) {
      $F4[(sprite) + 7] = 0;
    }
    var frame = $F4[(sprite) + 7] | 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(getResource($I4[(sprite) + 5]), $I4[offset] + (frame * $I4[size] | 0) | 0, $I4[(offset) + 1], Math.min($I4[size], clipX), Math.min($I4[(size) + 1], clipY), 0, 0, Math.min($I4[size], clipX), Math.min($I4[(size) + 1], clipY));
    ctx.restore();
  }
  function renderEntity(entity) {
    const $U4 = $M.U4, $F4 = $M.F4;
    if ($U4[(entity) + 6]) {
      renderSprite(ctx, $U4[(entity) + 6], $F4[(entity) + 2] | 0, $F4[((entity) + 2) + 1] | 0);
    }
  }
  function updateEntity(entity, dt) {
    const $I4 = $M.I4, $F4 = $M.F4, $U4 = $M.U4;
    if ($I4[entity] == ENTITY_PLAYER) {
      if (isDown('up')) {
        $F4[((entity) + 2) + 1] = $F4[((entity) + 2) + 1] - 100 * dt;
      }
      if (isDown('down')) {
        $F4[((entity) + 2) + 1] = $F4[((entity) + 2) + 1] + 100 * dt;
      }
      if (isDown('left')) {
        $F4[(entity) + 2] = $F4[(entity) + 2] - 100 * dt;
      }
      if (isDown('right')) {
        $F4[(entity) + 2] = $F4[(entity) + 2] + 100 * dt;
      }
    }
    if ($U4[(entity) + 6]) {
      updateSprite($U4[(entity) + 6], dt);
    }
  }
  function makeEntity(type, sprite) {
    const $malloc = $M.malloc, $I4 = $M.I4, $F4 = $M.F4, $U4 = $M.U4;
    var entity = $malloc(28) >> 2;
    $I4[entity] = type;
    $F4[(entity) + 2] = Math.random() * canvas.width | 0;
    $F4[((entity) + 2) + 1] = Math.random() * canvas.height | 0;
    $I4[(entity) + 4] = $I4[(sprite) + 2];
    $I4[((entity) + 4) + 1] = $I4[((sprite) + 2) + 1];
    $U4[(entity) + 6] = sprite;
    return entity;
  }
  function makeCells(w, h, numX, numY) {
    const $malloc = $M.malloc, $I4 = $M.I4, $U4 = $M.U4;
    var cells = $malloc(24) >> 2;
    $I4[(cells)] = w;
    $I4[((cells)) + 1] = h;
    $I4[(cells) + 2] = numX;
    $I4[((cells) + 2) + 1] = numY;
    $I4[(cells) + 4] = numX * numY | 0;
    $U4[(cells) + 5] = 0;
    cellsClear(cells);
    return cells;
  }
  function cellsClear(cells) {
    const $free = $M.free, $malloc = $M.malloc, $U4 = $M.U4, $I4 = $M.I4;
    var _, _$1;
    if ($U4[(cells) + 5]) {
      for (var i = 0; i < $I4[(cells) + 4]; _ = i, i = i + 1 | 0, _) {
        var ptr = $U4[$U4[(cells) + 5] + i];
        while (ptr) {
          var old = ptr;
          ptr = $U4[(ptr) + 1];
          $free(old << 2);
        }
      }
      $free($U4[(cells) + 5] << 2);
    }
    $U4[(cells) + 5] = $malloc((4 * $I4[(cells) + 4] | 0) >>> 0) >> 2;
    for (var i$1 = 0; i$1 < $I4[(cells) + 4]; _$1 = i$1, i$1 = i$1 + 1 | 0, _$1) {
      $U4[$U4[(cells) + 5] + i$1] = 0;
    }
  }
  function cellsAdd(cells, entity) {
    const $malloc = $M.malloc, $F4 = $M.F4, $I4 = $M.I4, $U4 = $M.U4;
    var x = $F4[(entity) + 2];
    var y = $F4[((entity) + 2) + 1];
    var cellSizeX = $I4[(cells)] / $I4[(cells) + 2] | 0;
    var cellSizeY = $I4[((cells)) + 1] / $I4[((cells) + 2) + 1] | 0;
    if (x > 0 && y > 0 && x < $I4[(cells)] && y < $I4[((cells)) + 1]) {
      var idx = ($I4[(cells) + 2] * (y / cellSizeY | 0) | 0) + (x / cellSizeX | 0) | 0;
      var node = $malloc(8) >> 2;
      $U4[node] = entity;
      if ($U4[$U4[(cells) + 5] + idx]) {
        $U4[(node) + 1] = $U4[$U4[(cells) + 5] + idx];
      } else {
        $U4[(node) + 1] = 0;
      }
      $U4[$U4[(cells) + 5] + idx] = node;
    }
  }
  function cellsGet(cells, x, y) {
    const $I4 = $M.I4, $U4 = $M.U4;
    var cellSizeX = $I4[(cells)] / $I4[(cells) + 2] | 0;
    var cellSizeY = $I4[((cells)) + 1] / $I4[((cells) + 2) + 1] | 0;
    if (x > 0 && y > 0 && x < $I4[(cells)] && y < $I4[((cells)) + 1]) {
      var idx = ($I4[(cells) + 2] * (y / cellSizeY | 0) | 0) + (x / cellSizeX | 0) | 0;
      return $U4[$U4[(cells) + 5] + idx];
    }
    return 0;
  }
  // Game
  var ENTITY_PLAYER = 1;
  var ENTITY_ENEMY = 2;
  var IMG_BOSSES = 1;
  var numEntities = 3000;
  var objects = $malloc(4 * numEntities) >> 2;
  var cells = makeCells(canvas.width | 0, canvas.height | 0, 6, 6);
  var playerSprite = $malloc(32) >> 2;
  $I4[(playerSprite)] = 0;
  $I4[((playerSprite)) + 1] = 395;
  $I4[(playerSprite) + 2] = 80;
  $I4[((playerSprite) + 2) + 1] = 35;
  $F4[(playerSprite) + 4] = 5;
  $I4[(playerSprite) + 5] = IMG_BOSSES;
  $I4[(playerSprite) + 6] = 3;
  $F4[(playerSprite) + 7] = 0;
  var playerEntity = makeEntity(ENTITY_PLAYER, playerSprite);
  $U4[objects + 0] = playerEntity;
  for (var i = 1; i < numEntities; _ = i, i = i + 1 | 0, _) {
    var enemySprite = $malloc(32) >> 2;
    $I4[(enemySprite)] = 0;
    $I4[((enemySprite)) + 1] = 111;
    $I4[(enemySprite) + 2] = 240 / 6 | 0;
    $I4[((enemySprite) + 2) + 1] = 40;
    $F4[(enemySprite) + 4] = 5;
    $I4[(enemySprite) + 5] = IMG_BOSSES;
    $I4[(enemySprite) + 6] = 6;
    $F4[(enemySprite) + 7] = 0;
    $U4[objects + i] = makeEntity(ENTITY_ENEMY, enemySprite);
  }
  function removeObject(entity) {
    const $U4 = $M.U4;
    var _;
    for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
      if ($U4[objects + i] == entity) {
        $U4[objects + i] = 0;
      }
    }
  }
  function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 || b <= y2 || y > b2);
  }
  function _checkCollisions(entity, node) {
    const $F4 = $M.F4, $I4 = $M.I4, $U4 = $M.U4;
    var pos = (entity) + 2;
    var size = (entity) + 4;
    while (node) {
      if ($U4[node] != entity) {
        var pos2 = ($U4[node]) + 2;
        var size2 = ($U4[node]) + 4;
        if (collides($F4[pos], $F4[(pos) + 1], $F4[pos] + $I4[size], $F4[(pos) + 1] + $I4[(size) + 1], $F4[pos2], $F4[(pos2) + 1], $F4[pos2] + $I4[size2], $F4[(pos2) + 1] + $I4[(size2) + 1])) {
          if (entity == playerEntity) {
            removeObject($U4[node]);
          }
        }
      }
      node = $U4[(node) + 1];
    }
  }
  function checkCollisions() {
    const $U4 = $M.U4, $F4 = $M.F4, $I4 = $M.I4;
    var _;
    for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
      var ent = $U4[objects + i];
      if (ent) {
        _checkCollisions(ent, cellsGet(cells, $F4[(ent) + 2], $F4[((ent) + 2) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F4[(ent) + 2], $F4[((ent) + 2) + 1] + $I4[((ent) + 4) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F4[(ent) + 2] + $I4[(ent) + 4], $F4[((ent) + 2) + 1]));
        _checkCollisions(ent, cellsGet(cells, $F4[(ent) + 2] + $I4[(ent) + 4], $F4[((ent) + 2) + 1] + $I4[((ent) + 4) + 1]));
      }
    }
  }
  var last = Number(Date.now() / 1000);
  function heartbeat() {
    const $U4 = $M.U4;
    var _;
    stats.begin();
    var now = Number(Date.now() / 1000);
    checkCollisions();
    cellsClear(cells);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var x = 0; x < numEntities; _ = x, x = x + 1 | 0, _) {
      if ($U4[objects + x]) {
        updateEntity($U4[objects + x], now - last);
        renderEntity($U4[objects + x]);
        cellsAdd(cells, $U4[objects + x]);
      }
    }
    stats.end();
    last = now;
    requestAnimFrame(heartbeat);
  }
  function finish() {
    const $free = $M.free, $U4 = $M.U4;
    var _;
    for (var x = 0; x < numEntities; _ = x, x = x + 1 | 0, _) {
      $free($U4[($U4[objects + x]) + 6] << 2);
      $free($U4[objects + x] << 2);
    }
    $free(objects << 2);
    cellsClear(cells);
    $free($U4[(cells) + 5] << 2);
    $free(cells << 2);
  }
  loadResource(IMG_BOSSES, 'resources/bosses.png');
  window.addEventListener('load', function () {
    stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    onReady(heartbeat);
  });
}.call(this, typeof exports === 'undefined' ? main_ljs = {} : exports));
