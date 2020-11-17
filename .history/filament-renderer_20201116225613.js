class App {
    constructor() {
        this.canvas = document.getElementsByTagName('canvas')[0];
        const engine = this.engine = Filament.Engine.create(this.canvas);

        this.scene = engine.createScene();
        this.triangle = Filament.EntityManager.get().create();
        this.scene.addEntity(this.triangle);

        const TRIANGLE_POSITIONS = new Float32Array([
            1, 0,
            Math.cos(Math.PI * 2 / 3), Math.sin(Math.PI * 2 / 3),
            Math.cos(Math.PI * 4 / 3), Math.sin(Math.PI * 4 / 3),
        ]);
        
        const TRIANGLE_COLORS = new Uint32Array([0xffff0000, 0xff00ff00, 0xff0000ff]);

        const VertexAttribute = Filament.VertexAttribute;
        const AttributeType = Filament.VertexBuffer$AttributeType;
        this.vb = Filament.VertexBuffer.Builder()
            .vertexCount(3)
            .bufferCount(2)
            .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT2, 0, 8)
            .attribute(VertexAttribute.COLOR, 1, AttributeType.UBYTE4, 0, 4)
            .normalized(VertexAttribute.COLOR)
            .build(engine);

        this.vb.setBufferAt(engine, 0, TRIANGLE_POSITIONS);
        this.vb.setBufferAt(engine, 1, TRIANGLE_COLORS);

        this.ib = Filament.IndexBuffer.Builder()
            .indexCount(3)
            .bufferType(Filament.IndexBuffer$IndexType.USHORT)
            .build(engine);

        this.ib.setBuffer(engine, new Uint16Array([0, 1, 2]));

        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
        window.requestAnimationFrame(this.render);
    }
    render() {
        // TODO: render scene
        window.requestAnimationFrame(this.render);
    }
    resize() {
        // TODO: adjust viewport and canvas
    }
  }
  
  Filament.init(['triangle.filamat'], () => {  } );