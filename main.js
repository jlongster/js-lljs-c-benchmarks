(function (exports) {
  const $M = require('memory');
  $M.set_memcheck(false);
  const $malloc = $M.malloc, $U4 = $M.U4;
  var _;
  //let memcheck = require('memcheck');
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
  // Scene
  var IMG_BOSSES = 1;
  function makeEntity() {
    const $malloc = $M.malloc, $I4 = $M.I4, $F4 = $M.F4, $U4 = $M.U4;
    var _, _$1, _$2;
    const $SP = $U4[1] -= 8;
    var _;
    $I4[($SP)] = 0;
    $I4[(($SP)) + 1] = 395;
    var _$1;
    $I4[($SP) + 2] = 80;
    $I4[(($SP) + 2) + 1] = 35;
    var sprite = $malloc(28) >> 2;
    $I4[(sprite)] = 0;
    $I4[((sprite)) + 1] = 395;
    $I4[(sprite) + 2] = 80;
    $I4[((sprite) + 2) + 1] = 35;
    $F4[(sprite) + 4] = 5;
    $I4[(sprite) + 5] = IMG_BOSSES;
    var entity = $malloc(20) >> 2;
    $I4[(entity)] = Math.random() * 250 | 0;
    $I4[((entity)) + 1] = Math.random() * 250 | 0;
    $I4[(entity) + 2] = 50;
    $I4[((entity) + 2) + 1] = 20;
    $U4[(entity) + 4] = sprite;
    return _$2 = entity, $U4[1] += 8, _$2;
    $U4[1] += 8;
  }
  var numEntities = 75;
  var objects = $malloc(4 * numEntities) >> 2;
  for (var i = 0; i < numEntities; _ = i, i = i + 1 | 0, _) {
    var player = makeEntity();
    $U4[objects + i] = player;
  }
  function updateEntity(entity) {
    const $I4 = $M.I4;
    if (isDown('up')) {
      $I4[((entity)) + 1] = $I4[((entity)) + 1] - 1 | 0;
    }
    if (isDown('down')) {
      $I4[((entity)) + 1] = $I4[((entity)) + 1] + 1 | 0;
    }
    if (isDown('left')) {
      $I4[(entity)] = $I4[(entity)] - 1 | 0;
    }
    if (isDown('right')) {
      $I4[(entity)] = $I4[(entity)] + 1 | 0;
    }
  }
  function renderEntity(entity) {
    const $U4 = $M.U4, $I4 = $M.I4;
    if ($U4[(entity) + 4]) {
      renderSprite($I4[(entity)], $I4[((entity)) + 1], $U4[(entity) + 4]);
    }
  }
  function renderSprite(x, y, sprite) {
    const $I4 = $M.I4;
    var img = getResource($I4[(sprite) + 5]);
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(img, $I4[(sprite)], $I4[((sprite)) + 1], $I4[(sprite) + 2], $I4[((sprite) + 2) + 1], 0, 0, $I4[(sprite) + 2], $I4[((sprite) + 2) + 1]);
    ctx.restore();
  }
  function heartbeat() {
    const $U4 = $M.U4;
    var _;
    stats.begin();
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var x = 0; x < numEntities; _ = x, x = x + 1 | 0, _) {
      updateEntity($U4[objects + x]);
      renderEntity($U4[objects + x]);
    }
    stats.end();
    requestAnimFrame(heartbeat);
  }
  function finish() {
    const $free = $M.free, $U4 = $M.U4;
    var _;
    for (var x = 0; x < numEntities; _ = x, x = x + 1 | 0, _) {
      $free($U4[($U4[objects + x]) + 4] << 2);
      $free($U4[objects + x] << 2);
    }
    $free(objects << 2);
  }
  loadResource(IMG_BOSSES, 'resources/bosses.png');
  window.addEventListener('load', function () {
    stats = new Stats();
    //stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
    onReady(heartbeat);
  });
}.call(this, typeof exports === 'undefined' ? main_ljs = {} : exports));
