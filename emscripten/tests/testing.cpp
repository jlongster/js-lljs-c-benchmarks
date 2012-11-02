#include <stdio.h>

int count = 0;

struct Thing2 {
    int baz;
};

struct Thing {
    int foo;
    Thing2 bar;
};

int getCounter() {
    count++;
    return count;
}

int addIt(int y) {
    return count + y;
}

int main() {
    Thing foo;
    foo.foo = 5;
    foo.bar.baz = 6;

    printf("%d", foo.bar.baz);

    getCounter();
    getCounter();
    getCounter();
    printf("%d", getCounter());
    printf("%d", addIt(5));
}
