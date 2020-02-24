class Block extends Vector {
  constructor(x, y, type, key) {
    super(x, y);
    this.f = Infinity;
    this.g = Infinity;
    this.h = Infinity;
    this.type = type;
    this.repr = key;
  }
}
