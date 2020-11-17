class App {
    constructor() {
        this.canvas = document.getElementsByTagName('canvas')[0];
        const engine = this.engine = Filament.Engine.create(this.canvas);

        this.scene = engine.createScene();
        this.triangle = Filament.EntityManager.get().create();
        this.scene.addEntity(this.triangle);

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
  
  Filament.init(['triangle.filamat'], () => { window.app = new App() } );