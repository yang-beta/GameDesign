class Rectangle {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  body: unknown = null;

  constructor(...args: unknown[]) {
    this.width = Number(args[2] ?? 0);
    this.height = Number(args[3] ?? 0);
  }

  setDepth(): this {
    return this;
  }

  setVisible(): this {
    return this;
  }

  setPosition(): this {
    return this;
  }

  setSize(): this {
    return this;
  }

  setFillStyle(): this {
    return this;
  }
}

const Phaser = {
  GameObjects: { Rectangle },
};

export default Phaser;
