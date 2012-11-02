
all: game-lljs/main.js game-emscripten/main.js

game-lljs/main.js: game-lljs/main.ljs
	./LLJS/bin/ljc -o game-lljs/main.js game-lljs/main.ljs

game-emscripten/main.js: game-emscripten/main.c
	./emscripten/emcc -s EXPORTED_FUNCTIONS="['_heartbeat', '_main', '_gameRun']" -O2 game-emscripten/main.c
	mv a.out.js game-emscripten/main.js

clean:
	rm game-lljs/main.js game-emscripten/main.js
