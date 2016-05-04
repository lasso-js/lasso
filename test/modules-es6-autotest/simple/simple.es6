import foo from "./foo";

let a = 1;

if (true) {
  let a = 2;
} else {
  let a = 3;
}

class Foo {
  constructor(a) {
    this.a = a;
  }
}

export { Foo, a, foo, __filename as filename };