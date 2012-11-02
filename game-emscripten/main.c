
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "emscripten.h"

typedef char* Img;

void d(char *msg);
int getWidth();
int getHeight();
int getCurrentTime();
void startTimer();
void endTimer();
float random();

void cvsFillRect(int x, int y, int w, int h);
void cvsFillStyle(char *style);
void cvsStrokeRect(int x, int y, int w, int h);
void cvsStrokeStyle(char *style);

void cvsDrawImage(char *img, int x, int y);
void cvsDrawImage2(char *img, int x, int y, int w, int h);
void cvsDrawImage3(char *img,
                   int sx, int sy, int sw, int sh,
                   int dx, int dy, int dw, int dh);
void cvsSave();
void cvsRestore();
void cvsTranslate(float x, float y);

char* getImage(char *src);
void loadResource(char *src);
void onReady(char *);

int isDown(char *key);

typedef struct Vec2d {
    float x, y;
} Vec2d;

typedef struct Vec2di {
    int x, y;
} Vec2di;

// Config

int numEntities = 1000;
int maxEntitiesPerCell = 100;

// Sprites

typedef struct Sprite {
    Vec2di offset, size;
    float speed;
    char *img;
    int numFrames;
    float _index;
} Sprite;

void updateSprite(Sprite *sprite, float dt) {
    sprite->_index += sprite->speed * dt;
}

void renderSpriteClipped(Sprite *sprite, int x, int y, int clipX, int clipY) {
    Vec2di *offset = &sprite->offset;
    Vec2di *size = &sprite->size;
    Img img = getImage(sprite->img);

    // We manually reset _index so that it doesn't increase forever
    // and oveflow at some point
    if(sprite->_index > sprite->numFrames) {
        sprite->_index = 0;
    }

    int frame = sprite->_index;

    cvsSave();
    cvsTranslate(x, y);
    cvsDrawImage3(img,
                  offset->x + frame * size->x, offset->y,
                  fminf(size->x, clipX), fminf(size->y, clipY),
                  0, 0,
                  fminf(size->x, clipX), fminf(size->y, clipY));
    cvsRestore();
}

void renderSprite(Sprite *sprite, int x, int y) {
    renderSpriteClipped(sprite, x, y, sprite->size.x, sprite->size.y);
}

// Entities

int ENTITY_PLAYER = 1;
int ENTITY_ENEMY = 2;

typedef struct Entity {
    int type;
    Vec2d pos;
    Vec2di size;
    Sprite *sprite;
} Entity;
typedef Entity* EntityPtr;

void renderEntity(Entity *entity) {
    if(entity->sprite) {
        renderSprite(entity->sprite, entity->pos.x, entity->pos.y);
    }
}

void updateEntity(Entity *entity, float dt) {
    if(entity->type == ENTITY_PLAYER) {
        if(isDown("up")) {
            entity->pos.y = entity->pos.y - 200*dt;
        }

        if(isDown("down")) {
            entity->pos.y = entity->pos.y + 200*dt;
        }

        if(isDown("left")) {
            entity->pos.x = entity->pos.x - 200*dt;
        }

        if(isDown("right")) {
            entity->pos.x = entity->pos.x + 200*dt;
        }
    }

    if(entity->sprite) {
        updateSprite(entity->sprite, dt);
    }
}

Entity* makeEntity(int type, Sprite *sprite) {
    Entity *entity = malloc(sizeof(Entity));
    entity->type = type;
    entity->pos.x = random() * getWidth();
    entity->pos.y = random() * getHeight();
    entity->size.x = sprite->size.x;
    entity->size.y = sprite->size.y;
    entity->sprite = sprite;
    return entity;
}

// Cells

typedef struct CellList {
    EntityPtr *_list;
    int index;
    int missed;
} CellList;
typedef CellList* CellListPtr;

typedef struct Cells {
    Vec2di size, count;
    int _length;
    CellListPtr *cache;
} Cells;

void cellsClear(Cells *cells);

Cells* makeCells(int w, int h, int numX, int numY) {
    Cells *cells = malloc(sizeof(Cells));
    cells->size.x = w;
    cells->size.y = h;
    cells->count.x = numX;
    cells->count.y = numY;
    cells->_length = numX*numY;
    cells->cache = malloc(sizeof(CellListPtr)*cells->_length);

    for(int i=0; i<cells->_length; i++) {
        CellList *list = malloc(sizeof(CellList));
        list->_list = malloc(sizeof(EntityPtr) * maxEntitiesPerCell);
        list->index = 0;
        list->missed = 0;
        cells->cache[i] = list;
    }

    cellsClear(cells);
    return cells;
}

void cellsClear(Cells *cells) {
    for(int i=0; i<cells->_length; i++) {
        cells->cache[i]->index = 0;
        cells->cache[i]->missed = 0;
    }
}

void cellsRelease(Cells *cells) {
    for(int i=0; i<cells->_length; i++) {
        free(cells->cache[i]->_list);
        free(cells->cache[i]);
    }

    free(cells->cache);
}

void cellsAdd(Cells *cells, Entity *entity, float x, float y) {
    float cellSizeX = cells->size.x / (float)(cells->count.x);
    float cellSizeY = cells->size.y / (float)(cells->count.y);

    if(x > 0 && y > 0 && x < cells->size.x && y < cells->size.y) {
        int idx = (cells->count.x *
                   (int)(y / cellSizeY) +
                   (int)(x / cellSizeX));

        CellList *list = cells->cache[idx];
        if(list->index < maxEntitiesPerCell) {
            list->index = list->index + 1;
            list->_list[list->index - 1] = entity;
        }
        else {
            list->missed = 1;
        }
    }
}

CellList* cellsGet(Cells *cells, float x, float y) {
    float cellSizeX = cells->size.x / (float)(cells->count.x);
    float cellSizeY = cells->size.y / (float)(cells->count.y);

    if(x > 0 && y > 0 && x < cells->size.x && y < cells->size.y) {
        int idx = (cells->count.x *
                   (int)(y / cellSizeY) +
                   (int)(x / cellSizeX));
        return cells->cache[idx];
    }

    return NULL;
}

// Game

EntityPtr *objects;
Sprite *playerSprite;
Entity *playerEntity;
Cells *cells;
char* IMG_BOSSES = "../resources/bosses.png";

Sprite* makeEnemySprite() {
    Sprite *enemySprite = malloc(sizeof(Sprite));
    enemySprite->offset.x = 0;
    enemySprite->offset.y = 111;
    enemySprite->size.x = 240/6;
    enemySprite->size.y = 40;
    enemySprite->speed = 5.0;
    enemySprite->img = IMG_BOSSES;
    enemySprite->numFrames = 6;
    enemySprite->_index = 0;
    return enemySprite;
}

int collides(int x, int y, int r, int b, int x2, int y2, int r2, int b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

void removeObject(Entity *entity) {
    for(int i=0; i<numEntities; i++) {
        if(objects[i] == entity) {
            //objects[i] = makeEntity(ENTITY_ENEMY,
            //makeEnemySprite());
            objects[i] = NULL;
        }
    }
}

void _checkCollisions(Entity *entity, CellList* list) {
    if(list) {
        float posX = entity->pos.x;
        float posY = entity->pos.y;
        int sizeX = entity->size.x;
        int sizeY = entity->size.y;

        EntityPtr *ents = list->_list;

        for(int i=0; i<list->index; i++) {
            if(ents[i] != entity) {
                Vec2d *pos2 = &ents[i]->pos;
                Vec2di *size2 = &ents[i]->size;

                if(collides(posX, posY,
                            posX + sizeX, posY + sizeY,
                            pos2->x, pos2->y,
                            pos2->x + size2->x, pos2->y + size2->y)) {
                    if(entity == playerEntity) {
                        removeObject(ents[i]);
                    }
                }
            }
        }
    }
}

void checkCollisions() {
    for(int i=0; i<numEntities; i++) {
        Entity *ent = objects[i];

        if(ent) {
            _checkCollisions(ent, cellsGet(cells, ent->pos.x, ent->pos.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent->pos.x,
                                           ent->pos.y + ent->size.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent->pos.x + ent->size.x,
                                           ent->pos.y));
            _checkCollisions(ent, cellsGet(cells,
                                           ent->pos.x + ent->size.x,
                                           ent->pos.y + ent->size.y));
        }
    }
}

void renderDebug() {
    int cellSizeX = cells->size.x / cells->count.x;
    int cellSizeY = cells->size.y / cells->count.y;

    for(int i=0; i<cells->_length; i++) {
        int x = i % cells->count.x;
        int y = i / cells->count.x;
        CellList *list = cells->cache[i];

        if(list->missed) {
            cvsFillStyle("rgba(0, 255, 0, .2)");
        }
        else if(list->index > 0) {
            cvsFillStyle("rgba(255, 0, 0, .2)");
        }

        if(list->missed || list->index > 0) {
            cvsFillRect(x * cellSizeX,
                        y * cellSizeY,
                        cellSizeX,
                        cellSizeY);
        }

        for(int j=0; j<list->index; j++) {
            if(list->_list[j] == playerEntity) {
                cvsFillRect(x * cellSizeX,
                            y * cellSizeY,
                            cellSizeX,
                            cellSizeY);
            }
        }
    }

    for(int i=0; i<numEntities; i++) {
        Entity *ent = objects[i];
        cvsStrokeRect(ent->pos.x, ent->pos.y,
                      ent->size.x, ent->size.y);
    }
}

float last = 0;
void heartbeat() {
    float now = getCurrentTime() / (float)1000.0;

    startTimer();
    checkCollisions();
    cellsClear(cells);

    cvsFillStyle("black");
    cvsFillRect(0, 0, getWidth(), getHeight());

    for(int i=0; i<numEntities; i++) {
        Entity *ent = objects[i];

        if(ent) {
            updateEntity(ent, now - last);
            renderEntity(ent);

            cellsAdd(cells, ent, ent->pos.x, ent->pos.y);
            cellsAdd(cells, ent, ent->pos.x + ent->size.x, ent->pos.y);
            cellsAdd(cells, ent, ent->pos.x, ent->pos.y + ent->size.y);
            cellsAdd(cells, ent,
                     ent->pos.x + ent->size.x,
                     ent->pos.y + ent->size.y);

        }
    }

    //renderDebug();

    endTimer();
    last = now;
}

__attribute__((used)) void gameRun() {
   objects = malloc(sizeof(Entity*) * numEntities);

   playerSprite = malloc(sizeof(Sprite));
   playerSprite->offset.x = 0;
   playerSprite->offset.y = 395;
   playerSprite->size.x = 80;
   playerSprite->size.y = 35;
   playerSprite->speed = 5.0;
   playerSprite->img = IMG_BOSSES;
   playerSprite->numFrames = 3;
   playerSprite->_index = 0;

   playerEntity = makeEntity(ENTITY_PLAYER, playerSprite);
   objects[numEntities - 1] = playerEntity;

   for(int i=0; i<numEntities-1; i++) {
       objects[i] = makeEntity(ENTITY_ENEMY, makeEnemySprite());
   }

   cells = makeCells(getWidth(), getHeight(), 6, 6);

   last = getCurrentTime() / (float)1000.0;
   emscripten_set_main_loop(heartbeat, 0, 0);
}

int main() {
    loadResource(IMG_BOSSES);
    onReady("gameRun");
}
