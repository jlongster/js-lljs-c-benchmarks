In researching what platform I want to write a game engine for the web in, I did some reasearch to see what current high performance solutions actually performed like.

LLJS and emscripten are also interesting because you get the possibility of also compiling out native apps. LLJS doesn't have this yet but I don't see why I couldn't compile out C code from it.

More to come. Initial results are very promising, LLJS and emscripten giving around 1.7x performance boost.

js: http://jlongster.github.com/js-lljs-c-benchmarks/game-js/
lljs: http://jlongster.github.com/js-lljs-c-benchmarks/game-lljs/
emscripten: http://jlongster.github.com/js-lljs-c-benchmarks/game-emscripten/

*NOTE: My emscripten version currently runs slow on Chrome, this is fixable but I haven't fully looked into yet. It performs fine on Firefox.*